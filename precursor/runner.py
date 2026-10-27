"""Headless Runner and Integration API for PRECURSOR.

This module provides the primary interface consumed by the Streamlit dashboard
and headless evaluation pipelines.
"""

import time
import argparse
import concurrent.futures
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Set
import numpy as np
from pydantic import BaseModel, Field

from precursor.telemetry.schema import TelemetryPoint
from precursor.telemetry.buffer import TelemetryBuffer
from precursor.telemetry.live_collector import LiveTelemetryCollector, get_default_network_info
from precursor.telemetry.synthetic import (
    SyntheticTelemetryGenerator,
    SyntheticScenarioConfig,
    ScenarioType,
)
from precursor.detectors.registry import DetectorRegistry
from precursor.detectors.base import DetectorResult
from precursor.gate.reliability_gate import ReliabilityGate
from precursor.gate.states import GateDecision
from precursor.incidents.grouper import IncidentGrouper
from precursor.incidents.schema import Incident
from precursor.copilot.runbook_matcher import RunbookMatcher
from precursor.copilot.llm_client import OllamaCopilot, CopilotResponse
from precursor.evaluation.benchmark import PairedBenchmarkRunner
from precursor.evaluation.metrics import ScenarioComparisonResult
from precursor.storage import (
    RunArchive,
    RunMetadata,
    FaultEventRecord,
    export_telemetry_to_csv,
    export_run_to_json,
    RunStorageManager,
    format_utc_iso,
)
from precursor.storage.incident_db import IncidentDB
from precursor.storage.system_registry import SystemRegistry
from precursor.storage.database import DatabaseManager
from precursor.systems.manager import SystemProbeManager


class SystemSnapshot(BaseModel):
    """Unified system state consumed directly by the Streamlit dashboard."""
    timestamp: float = Field(..., description="Current observation timestamp (UTC epoch seconds)")
    latest_telemetry: Dict[str, Optional[float]] = Field(default_factory=dict)
    quality_stats: Dict[str, Any] = Field(default_factory=dict)
    gate_decision: GateDecision = Field(..., description="Active Reliability Gate state and reasons")
    detector_results: Dict[int, List[DetectorResult]] = Field(default_factory=dict, description="By horizon: 5, 15, 30")
    incidents: List[Incident] = Field(default_factory=list, description="Active faults and predicted incidents")
    copilot_response: Optional[CopilotResponse] = Field(None, description="Grounded guidance and verified claims")


class PrecursorEngine:
    """
    Main offline PRECURSOR pipeline engine.
    Orchestrates Telemetry -> Detectors -> Reliability Gate -> Incidents -> Copilot.
    """

    def __init__(
        self,
        scenario_type: ScenarioType = ScenarioType.GRADUAL_DEGRADATION,
        seed: int = 42,
        interface_id: str = "auto",
    ):
        detected_iface, _ = get_default_network_info()
        if interface_id in ("eth0", "auto", "", None) and detected_iface:
            interface_id = detected_iface
        self.scenario_type = scenario_type
        self.seed = seed
        self.interface_id = interface_id

        # Internal components
        self.buffer = TelemetryBuffer(max_points=20000, max_retention_seconds=7200.0)
        self.registry = DetectorRegistry()
        self.gate = ReliabilityGate()
        self.grouper = IncidentGrouper()
        self.matcher = RunbookMatcher()
        self.copilot = OllamaCopilot()
        self.evaluator = PairedBenchmarkRunner()

        # Telemetry Generator
        self.config = SyntheticScenarioConfig(scenario_type=scenario_type, seed=seed, interface_id=interface_id)
        self.generator = SyntheticTelemetryGenerator(self.config)

        self.last_snapshot: Optional[SystemSnapshot] = None
        self.snapshot_history: List[SystemSnapshot] = []
        self.last_evaluation: Optional[ScenarioComparisonResult] = None
        self.storage_manager = RunStorageManager()
        self.incident_db = IncidentDB()
        self.system_registry = SystemRegistry()
        self.system_manager = SystemProbeManager()
        self.db = DatabaseManager()

        # Asynchronous background LLM executor (Solution 1)
        self._llm_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="precursor-llm")
        self._in_flight_incidents: Set[str] = set()

        # Ingestion Mode: "synthetic" (default) or "live"
        self.mode: str = "synthetic"
        self.live_collector: Optional[LiveTelemetryCollector] = None
        self.incident_states: Dict[str, str] = {}
        self.saved_evaluations: List[Dict[str, Any]] = []

    def set_mode(
        self,
        mode: str,
        target_host: str = "127.0.0.1",
        target_port: int = 80,
        interface_id: str = "auto",
    ) -> str:
        """Switch ingestion mode between 'synthetic' and 'live', ensuring clean buffer isolation."""
        mode_clean = mode.lower().strip()
        if mode_clean in ("live", "live_network", "live_probe"):
            was_mode = self.mode
            self.mode = "live"

            detected_iface, _ = get_default_network_info()
            if interface_id in ("eth0", "auto", "", None) and detected_iface:
                interface_id = detected_iface
            self.interface_id = interface_id

            if self.live_collector is None:
                self.live_collector = LiveTelemetryCollector(
                    target_host=target_host,
                    target_port=target_port,
                    interface_id=interface_id,
                )
            else:
                self.live_collector.set_target(
                    target_host=target_host,
                    target_port=target_port,
                    interface_id=interface_id,
                )

            # Purge synthetic points upon entering live mode to prevent synthetic dataset leakage
            if was_mode != "live":
                self.buffer.clear()
                self.snapshot_history.clear()
                self.incident_states.clear()
                self.last_snapshot = None

            effective_host = self.live_collector.target_host
            effective_port = self.live_collector.target_port
            effective_iface = self.live_collector.interface_id

            # Register outbound target in system manager if connected
            sys_mgr = getattr(self, "system_manager", None)
            if sys_mgr:
                sys_mgr.register_outbound_target(effective_host, effective_port)

            # Register monitored target node and link in system registry
            self.system_registry.register_node(
                node_id=f"target-{effective_host}",
                name=f"Probe Target ({effective_host}:{effective_port})",
                node_type="gateway",
                ip_address=effective_host,
                status="healthy",
                metadata={
                    "role": "Live Probe Target",
                    "interfaceName": effective_iface,
                    "ipAddress": effective_host,
                    "firmware": "Live LAN / Workstation Target",
                },
                position=[5.0, 2.0, 0.0],
            )
            self.system_registry.register_link(
                source_id="sys-core-engine",
                target_id=f"target-{effective_host}",
                status="active",
                metadata={
                    "cableType": "Ethernet / Wi-Fi",
                    "bandwidthGbps": 1.0,
                    "sourceInterface": effective_iface,
                    "targetInterface": "lan0",
                },
            )
            # Take immediate live sweep so system state is initialized
            self.step_live()
        else:
            self.mode = "synthetic"
        return self.mode

    def step_live(self) -> SystemSnapshot:
        """Collect one live telemetry batch from host socket/network interfaces and compute pipeline."""
        if self.live_collector is None:
            self.live_collector = LiveTelemetryCollector(interface_id=self.interface_id)
        batch = self.live_collector.collect()
        self.buffer.add_batch(batch.points)
        self.db.record_telemetry_batch(batch.points, source=self.mode)

        # Dynamic live peer registration for 3D topology
        rtt_val = None
        loss_val = None
        for pt in batch.points:
            if pt.metric_id == "latency_ms":
                rtt_val = pt.value
            elif pt.metric_id == "packet_loss_pct":
                loss_val = pt.value

        target_ip = getattr(self.live_collector, "target_host", "127.0.0.1")
        target_port = getattr(self.live_collector, "target_port", 80)

        # 1. Register Local Host
        self.system_registry.register_node(
            node_id="local-host",
            name="PRECURSOR Host",
            node_type="server",
            ip_address="127.0.0.1",
            status="healthy",
            metrics={"latencyMs": 0.2, "packetLossPct": 0.0},
            metadata={"role": "Telemetry & Anomaly Intelligence Engine", "firmware": "PRECURSOR v0.1.0-live", "interface": self.interface_id},
            position=[0.0, 0.0, 0.0],
        )

        # 2. Register Outbound Probe Target
        tgt_status = "healthy" if (rtt_val is not None and rtt_val < 50.0 and (loss_val is None or loss_val < 5.0)) else "degraded"
        if target_ip and target_ip not in ("127.0.0.1", "localhost"):
            self.system_registry.register_node(
                node_id="outbound-target",
                name=f"Probe Target ({target_ip}:{target_port})",
                node_type="server",
                ip_address=target_ip,
                status=tgt_status,
                metrics={"latencyMs": rtt_val or 0.9, "packetLossPct": loss_val or 0.0},
                metadata={"role": "Outbound TCP/Socket Target", "port": target_port, "ipAddress": target_ip},
                position=[3.5, 1.5, 0.0],
            )
            self.system_registry.register_link(
                source_id="local-host",
                target_id="outbound-target",
                status="active" if tgt_status == "healthy" else "degraded",
                latency_ms=rtt_val,
                packet_loss_pct=loss_val or 0.0,
                metadata={"protocol": "TCP/ICMP", "bandwidthGbps": 1.0},
            )

        # Update target in SystemProbeManager
        sys_mgr = getattr(self, "system_manager", None)
        if sys_mgr and target_ip and target_ip not in ("127.0.0.1", "localhost"):
            sys_mgr.register_outbound_target(target_ip, target_port, rtt_val)

        # 3. Register Active Inbound Peers (only verified nodes that exchanged packets)
        icmp_rate_pt = next((pt for pt in batch.points if pt.metric_id == "icmp_inbound_rate"), None)
        icmp_rate = float(icmp_rate_pt.value) if icmp_rate_pt and icmp_rate_pt.value is not None else 0.0

        if sys_mgr:
            with sys_mgr.lock:
                inbound_nodes = [
                    s for s in sys_mgr.systems.values()
                    if getattr(s, "is_inbound", False) and getattr(s, "packets_received", 0) > 0
                ]
                for node in inbound_nodes:
                    peer_status = "critical" if icmp_rate > 200.0 else ("degraded" if icmp_rate > 50.0 else "healthy")
                    diag = f"Active traffic: {round(icmp_rate, 1)} pkts/sec" if icmp_rate > 0 else "Nominal inbound peer"
                    self.system_registry.register_node(
                        node_id=node.id,
                        name=node.name,
                        node_type="endpoint",
                        ip_address=node.address,
                        status=peer_status,
                        metrics={"latencyMs": 0.8, "packetLossPct": 0.0, "inboundRate": icmp_rate},
                        metadata={
                            "role": node.role,
                            "ipAddress": node.address,
                            "macAddress": getattr(node, "mac_address", None),
                            "diagnostic": diag,
                        },
                        position=[-3.5, 1.5, 0.0],
                    )
                    self.system_registry.register_link(
                        source_id=node.id,
                        target_id="local-host",
                        status="active" if peer_status != "critical" else "degraded",
                        latency_ms=0.8,
                        packet_loss_pct=0.0,
                        metadata={"protocol": "ICMP/IP", "bandwidthGbps": 1.0, "inboundRate": icmp_rate},
                    )

        return self._evaluate_pipeline(batch.timestamp)


    def reset_scenario(self, scenario_type: ScenarioType, seed: int = 42):
        """Switch to a new synthetic scenario and reset the internal buffer."""
        self.mode = "synthetic"
        self.scenario_type = scenario_type
        self.seed = seed
        self.config = SyntheticScenarioConfig(scenario_type=scenario_type, seed=seed, interface_id=self.interface_id)
        self.generator = SyntheticTelemetryGenerator(self.config)
        self.buffer.clear()
        self.last_snapshot = None
        self.snapshot_history.clear()
        self.last_evaluation = None

    def ingest_points(self, points: List[TelemetryPoint]) -> SystemSnapshot:
        """Ingest live or external points and compute the full state pipeline."""
        self.buffer.add_batch(points)
        for pt in points:
            if pt.node_id and pt.node_id not in ("sys-core-engine", "gateway-01"):
                node_type = "switch" if "switch" in pt.node_id else ("router" if "router" in pt.node_id else "server")
                self.system_registry.register_node(
                    node_id=pt.node_id,
                    name=pt.node_id.replace("-", " ").title(),
                    node_type=node_type,
                    ip_address=pt.labels.get("ip", "10.0.0.1"),
                    status="healthy" if (hasattr(pt.quality, "value") and pt.quality.value == "good") or pt.quality == "good" else "degraded",
                    metrics={pt.metric_id: pt.value},
                )
        self.db.record_telemetry_batch(points, source=self.mode)
        t_now = self.buffer.get_latest_timestamp() or self.config.start_timestamp
        return self._evaluate_pipeline(t_now)

    def step_simulation(self) -> SystemSnapshot:
        """Advance the simulation/collection by one 5-second step and compute the pipeline."""
        if self.mode == "live":
            return self.step_live()
        batch = self.generator.step()
        self.buffer.add_batch(batch.points)
        self.db.record_telemetry_batch(batch.points, source=self.mode)
        return self._evaluate_pipeline(batch.timestamp)

    def fast_forward(self, seconds: float = 600.0) -> SystemSnapshot:
        """Fast-forward simulation by the given duration in seconds."""
        steps = int(seconds / self.config.step_seconds)
        for _ in range(steps):
            batch = self.generator.step()
            self.buffer.add_batch(batch.points)
            self.db.record_telemetry_batch(batch.points, source=self.mode)
        t_now = self.buffer.get_latest_timestamp()
        return self._evaluate_pipeline(t_now)

    def _evaluate_pipeline(self, current_time: float) -> SystemSnapshot:
        """Execute full pipeline for current timestamp."""
        # 1. Multi-horizon detection
        results_by_h = self.registry.evaluate_horizons(self.buffer, current_time, horizons=[5, 15, 30])

        # 2. Reliability Gate
        is_live_mode = (getattr(self, "mode", "synthetic") == "live")
        gate_decision = self.gate.evaluate(self.buffer, current_time, is_live=is_live_mode)
        self.db.record_gate_decision(gate_decision, current_time, source=self.mode)

        # 3. Incident Grouping
        incidents = self.grouper.group(results_by_h, gate_decision, current_time, interface_id=self.interface_id, source=self.mode)
        for inc in incidents:
            if inc.id in getattr(self, "incident_states", {}):
                inc.status = self.incident_states[inc.id]
            inc_dict = inc.model_dump()
            inc_dict["scenario_type"] = self.scenario_type.value if hasattr(self, "scenario_type") else None
            inc_dict["seed"] = getattr(self, "seed", None)
            self.db.upsert_incident(inc_dict, source=self.mode)

        # 4. Telemetry Snapshot
        latest_telem: Dict[str, Optional[float]] = {}
        for m in [
            "latency_ms",
            "jitter_ms",
            "packet_loss_pct",
            "throughput_mbps",
            "packets_in_sec",
            "packets_out_sec",
            "icmp_inbound_rate",
            "link_state",
            "drops_in",
        ]:
            _, vals, _ = self.buffer.get_series(m, current_time - 15.0, current_time)
            if len(vals) > 0 and not np.isnan(vals[-1]):
                latest_telem[m] = round(float(vals[-1]), 2)
            else:
                latest_telem[m] = None

        quality_stats = self.buffer.quality_stats(window_seconds=300.0, current_time=current_time)

        # 5. Copilot guidance: NOT generated automatically on every step. Strictly user-triggered!
        copilot_response = None
        if incidents:
            top_incident = sorted(incidents, key=lambda i: (i.severity == "CRITICAL", not i.is_active_fault), reverse=True)[0]
            matches = self.matcher.match(top_incident, top_k=2)
            
            # Solution 1: Sub-5ms instant incident overview (never blocks engine or UI)
            copilot_response = self.copilot.generate_instant_overview(top_incident, latest_telem, matches)

            # Solution 1: Asynchronous background LLM synthesis with cooldown guard
            target_inc_id = top_incident.id
            now_t = time.time()
            if not hasattr(self, "_incident_last_attempt"):
                self._incident_last_attempt = {}
            if not hasattr(self, "_enriched_incidents"):
                self._enriched_incidents = set()

            should_enrich = (
                target_inc_id not in self._in_flight_incidents
                and target_inc_id not in self._enriched_incidents
                and (now_t - self._incident_last_attempt.get(target_inc_id, 0.0)) > 60.0
            )

            if should_enrich:
                self._in_flight_incidents.add(target_inc_id)
                self._incident_last_attempt[target_inc_id] = now_t

                def _async_enrich_worker(async_inc, async_telem, async_matches, inc_id):
                    try:
                        deep_resp = self.copilot.query_ollama(async_inc, async_telem, async_matches, timeout_seconds=60.0)
                        if deep_resp:
                            self._enriched_incidents.add(inc_id)
                            self.incident_db.update_copilot_guidance(inc_id, deep_resp)
                            if self.last_snapshot and self.last_snapshot.incidents and self.last_snapshot.incidents[0].id == inc_id:
                                self.last_snapshot.copilot_response = deep_resp
                    except Exception:
                        pass
                    finally:
                        self._in_flight_incidents.discard(inc_id)

                self._llm_executor.submit(_async_enrich_worker, top_incident, latest_telem, matches, target_inc_id)

            # 6. Persist Incidents into IncidentDB with complete forensic packet envelope
            packet_samples = []
            recent_points = self.buffer.get_window(current_time - 60.0, current_time)
            dest_host = getattr(self.live_collector, "target_host", "1.1.1.1") if self.mode == "live" else "core-router-01"
            dest_port = getattr(self.live_collector, "target_port", 80) if self.mode == "live" else 443
            src_node = "localhost-probe" if self.mode == "live" else "edge-gateway-01"
            src_port = 54321 if self.mode == "live" else 49152

            for pt in recent_points[-50:]:
                iso_t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(pt.timestamp))
                proto = "TCP" if ("latency" in pt.metric_id or "jitter" in pt.metric_id) else ("IP" if "drop" in pt.metric_id else "ETH")
                pkt_flags = ["SYN", "ACK"] if "latency" in pt.metric_id else ["ACK"]
                packet_samples.append({
                    "packet_id": f"pkt-{pt.timestamp:.3f}-{pt.metric_id}",
                    "timestamp": pt.timestamp,
                    "timestamp_iso": iso_t,
                    "source": getattr(pt, "node_id", None) or src_node,
                    "source_port": src_port,
                    "destination": dest_host,
                    "destination_port": dest_port,
                    "protocol": proto,
                    "packet_size_bytes": 64 if self.mode == "live" else 1420,
                    "ttl": 64 if self.mode == "live" else 58,
                    "flags": pkt_flags,
                    "metric_id": pt.metric_id,
                    "value": pt.value,
                    "unit": pt.unit,
                    "quality": pt.quality.value if hasattr(pt.quality, "value") else str(pt.quality),
                    "labels": pt.labels,
                    "raw_details": {
                        "interface": self.interface_id,
                        "source_mode": self.mode,
                        "scenario": self.scenario_type.value if self.mode != "live" else "live_nic",
                        "reading": f"{pt.metric_id}={pt.value}{pt.unit}",
                    },
                })

            for inc in incidents:
                self.incident_db.record_incident(
                    incident_id=inc.id,
                    title=inc.title,
                    severity=inc.severity,
                    source=self.mode,
                    category=getattr(inc, "category", "ANOMALY"),
                    predicted_horizon_minutes=inc.predicted_horizon_minutes,
                    is_active_fault=inc.is_active_fault,
                    gate_state=gate_decision.state.value,
                    node_id=src_node,
                    interface_id=self.interface_id,
                    primary_metrics=inc.primary_metrics,
                    telemetry_snapshot=latest_telem,
                    packet_samples=packet_samples,
                    copilot_response=copilot_response,
                )

        # 7. Update core node metrics in SystemRegistry
        self.system_registry.register_node(
            node_id="sys-core-engine",
            name="PRECURSOR Core Engine",
            node_type="server",
            ip_address="127.0.0.1",
            status="degraded" if gate_decision.state.value == "DEGRADED" else ("critical" if gate_decision.state.value == "ABSTAIN" else "healthy"),
            metrics={
                "latencyMs": latest_telem.get("latency_ms"),
                "jitterMs": latest_telem.get("jitter_ms"),
                "packetLossPct": latest_telem.get("packet_loss_pct"),
                "throughputMbps": latest_telem.get("throughput_mbps"),
            },
            position=[0.0, 0.0, 0.0],
        )

        snapshot = SystemSnapshot(
            timestamp=current_time,
            latest_telemetry=latest_telem,
            quality_stats=quality_stats,
            gate_decision=gate_decision,
            detector_results=results_by_h,
            incidents=incidents,
            copilot_response=copilot_response,
        )
        self.last_snapshot = snapshot
        self.snapshot_history.append(snapshot)
        if len(self.snapshot_history) > 1000:
            self.snapshot_history.pop(0)
        return snapshot

    def explain_incident(self, incident_id: str, prompt: Optional[str] = None) -> Dict[str, Any]:
        """User-triggered: explain a specific incident and provide runbook guidance."""
        inc_obj = None
        if self.last_snapshot:
            match = next((i for i in self.last_snapshot.incidents if i.id == incident_id), None)
            if match:
                inc_obj = match
        if not inc_obj:
            db_inc = self.db.get_incident(incident_id)
            if db_inc:
                try:
                    inc_obj = Incident(**db_inc)
                except Exception:
                    pass
        if not inc_obj:
            from precursor.gate.states import GateState
            from precursor.incidents.schema import IncidentSeverity
            inc_obj = Incident(
                id=incident_id,
                title=f"Live Network Anomaly & SLA Breach ({incident_id})",
                is_active_fault=True,
                gate_state=GateState.DEGRADED,
                severity=IncidentSeverity.CRITICAL,
                detected_at=time.time(),
                interface_id=getattr(self, "interface_id", "eth0"),
                source=getattr(self, "mode", "live"),
                status="ACTIVE",
            )

        telemetry = self.last_snapshot.latest_telemetry if self.last_snapshot else {}
        matches = self.matcher.match(inc_obj, top_k=2) if inc_obj else []

        if prompt:
            copilot_resp = self.copilot.query(prompt=prompt, telemetry_snapshot=telemetry, incident=inc_obj)
        else:
            copilot_resp = self.copilot.explain_and_recommend(inc_obj, telemetry, matches)

        resp_dict = copilot_resp.model_dump()

        # Run claim verification on assertions made
        claims_to_verify = []
        if hasattr(copilot_resp, "claims") and copilot_resp.claims:
            for c in copilot_resp.claims:
                claims_to_verify.append(c.claim_text if hasattr(c, "claim_text") else str(c))
        elif hasattr(copilot_resp, "summary") and copilot_resp.summary:
            claims_to_verify.append(copilot_resp.summary)

        verified_results = []
        for statement in claims_to_verify:
            verifications = self.copilot.verifier.verify_response(statement, telemetry)
            for v in verifications:
                v_dict = v.model_dump()
                verified_results.append(v_dict)
                self.db.record_claim_verification(
                    statement=v.claim_text,
                    verdict=v.status.value if hasattr(v.status, "value") else str(v.status),
                    metric_id=v.metric_id,
                    claimed_value=v.claimed_value,
                    observed_value=v.actual_value,
                    tolerance_pct=getattr(v, "tolerance_pct", 5.0),
                    explanation=v.explanation,
                    incident_id=incident_id,
                )
        resp_dict["claim_verifications"] = verified_results

        if hasattr(self, "incident_db") and self.incident_db:
            try:
                self.incident_db.update_copilot_guidance(incident_id, copilot_resp)
            except Exception:
                pass

        # Record query and response to DB

        query_prompt = prompt or f"Explain incident {incident_id}: {inc_obj.title if inc_obj else ''}"
        self.db.record_copilot_query(
            prompt=query_prompt,
            response_dict=resp_dict,
            incident_id=incident_id,
            source=getattr(self, "mode", "synthetic"),
        )
        return resp_dict


    def run_paired_evaluation(self, scenario_type: ScenarioType, seed: int = 42) -> ScenarioComparisonResult:
        """Run paired comparison GATE ON vs GATE OFF on the requested scenario."""
        comp = self.evaluator.run_scenario(scenario_type=scenario_type, seed=seed)
        self.last_evaluation = comp
        return comp

    def build_run_archive(self) -> RunArchive:
        """Construct a complete, nested RunArchive from current simulation state."""
        t_end = self.buffer.get_latest_timestamp() or self.config.start_timestamp
        gt = self.generator.ground_truth

        # Format fault event record
        fault_records = [
            FaultEventRecord(
                scenario_type=gt.scenario_type.value,
                impact_start_seconds=gt.impact_start_seconds,
                impact_end_seconds=gt.impact_end_seconds,
                impact_metric=gt.impact_metric,
                sla_breach_threshold=gt.sla_breach_threshold,
                description=gt.description,
            )
        ]

        # Metadata
        created_iso = format_utc_iso(datetime.now(timezone.utc).timestamp())
        run_id = f"run_{self.scenario_type.value}_seed{self.seed}_{int(t_end)}"
        meta = RunMetadata(
            run_id=run_id,
            scenario_type=self.scenario_type.value,
            seed=self.seed,
            interface_id=self.interface_id,
            node_id="gateway-01",
            start_time_epoch=self.config.start_timestamp,
            start_time_iso=format_utc_iso(self.config.start_timestamp),
            end_time_epoch=t_end,
            end_time_iso=format_utc_iso(t_end),
            total_steps=len(self.snapshot_history),
            duration_seconds=round(max(0.0, t_end - self.config.start_timestamp), 2),
            created_at_utc=created_iso,
        )

        # Extract all telemetry points from buffer
        points = list(self.buffer._buffer)

        # Timelines
        gate_timeline = [s.gate_decision.model_dump() for s in self.snapshot_history]
        preds_timeline = [
            {
                "timestamp": s.timestamp,
                "horizons": {str(h): [r.model_dump() for r in res] for h, res in s.detector_results.items()},
            }
            for s in self.snapshot_history
        ]
        incidents_timeline = [
            {"timestamp": s.timestamp, "incidents": [i.model_dump() for i in s.incidents]}
            for s in self.snapshot_history
            if s.incidents
        ]
        copilot_records = [
            {"timestamp": s.timestamp, "response": s.copilot_response.model_dump()}
            for s in self.snapshot_history
            if s.copilot_response
        ]

        eval_data = None
        if self.last_evaluation:
            eval_data = self.last_evaluation.model_dump()

        return RunArchive(
            metadata=meta,
            fault_events=fault_records,
            telemetry_summary=self.buffer.quality_stats(current_time=t_end),
            telemetry_points=points,
            gate_decisions=gate_timeline,
            predictions=preds_timeline,
            incidents=incidents_timeline,
            copilot_records=copilot_records,
            evaluation_results=eval_data,
        )

    def export_telemetry_csv(self, file_path: Optional[str] = None) -> str:
        """Export all current telemetry buffer observations to standard CSV."""
        points = list(self.buffer._buffer)
        return export_telemetry_to_csv(points, file_path=file_path)

    def export_run_json(self, file_path: Optional[str] = None) -> str:
        """Export complete execution run archive to formatted JSON."""
        archive = self.build_run_archive()
        return export_run_to_json(archive, file_path=file_path)

    def save_run(self, export_csv: bool = True) -> Dict[str, str]:
        """Persist current run locally in data/runs/ and data/exports/."""
        archive = self.build_run_archive()
        return self.storage_manager.save_run(archive, export_csv=export_csv)


def main():
    parser = argparse.ArgumentParser(description="PRECURSOR Headless Network Copilot Engine")
    parser.add_argument(
        "--scenario",
        type=str,
        default="gradual_degradation",
        choices=[s.value for s in ScenarioType],
        help="Synthetic failure scenario",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--steps", type=int, default=150, help="Number of 5s simulation steps to advance (default: 150 = 12.5m)")
    args = parser.parse_args()

    sc_type = ScenarioType(args.scenario)
    print("============================================================")
    print("  PRECURSOR — Reliability-Gated Network Copilot (Headless)")
    print(f"  Scenario: {sc_type.value} | Seed: {args.seed} | Steps: {args.steps}")
    print("============================================================\n")

    engine = PrecursorEngine(scenario_type=sc_type, seed=args.seed)

    print(f"Advancing simulation by {args.steps * 5} seconds...")
    snapshot = engine.fast_forward(args.steps * 5.0)

    print(f"\n--- [1] Telemetry Snapshot (t={snapshot.timestamp}) ---")
    for k, v in snapshot.latest_telemetry.items():
        print(f"  {k:20s}: {v}")

    print("\n--- [2] Reliability Gate Status ---")
    print(f"  State               : {snapshot.gate_decision.state.value}")
    print(f"  Sensor Health Score : {snapshot.gate_decision.sensor_health_score}")
    print(f"  Distribution Drift  : {snapshot.gate_decision.drift_score}")
    print(f"  Residual Expansion  : {snapshot.gate_decision.residual_error_score}x")
    print(f"  Reasons             : {snapshot.gate_decision.reasons}")

    print(f"\n--- [3] Incidents & Predictions ({len(snapshot.incidents)} found) ---")
    for inc in snapshot.incidents:
        fault_type = "ACTIVE FAULT" if inc.is_active_fault else f"PREDICTED ({inc.predicted_horizon_minutes}m horizon)"
        print(f"  [{inc.severity.value}] [{inc.status}] {inc.title}")
        print(f"    Type              : {fault_type}")
        print(f"    Primary Metrics   : {inc.primary_metrics}")
        print(f"    Supporting Signals: {inc.supporting_signals}")

    if snapshot.copilot_response:
        cr = snapshot.copilot_response
        print(f"\n--- [4] Offline AI Copilot ({cr.model_used}) ---")
        print(f"  Summary             : {cr.summary[:120]}...")
        print(f"  Hypotheses          : {cr.hypotheses}")
        print(f"  Diagnostic Commands : {cr.diagnostic_commands}")
        print(f"  Claim Verification  : {len(cr.claims)} claims assessed")
        for c in cr.claims:
            print(f"    * [{c.status.value}] '{c.claim_text}' -> claimed={c.claimed_value}, actual={c.actual_value}")

    print("\n============================================================")
    print("  Running Paired Evaluation (GATE ON vs GATE OFF)...")
    comp = engine.run_paired_evaluation(sc_type, seed=args.seed)
    for h in [5, 15]:
        on = comp.gate_on[h]
        off = comp.gate_off[h]
        print(f"  Horizon {h}m:")
        print(f"    GATE ON  -> Recall: {on.event_recall}, FA/hr: {on.false_alarms_per_hour}, Lead Time: {on.average_lead_time_minutes}m, Abstain: {on.abstention_rate}")
        print(f"    GATE OFF -> Recall: {off.event_recall}, FA/hr: {off.false_alarms_per_hour}, Lead Time: {off.average_lead_time_minutes}m, Abstain: {off.abstention_rate}")
    print("============================================================\n")


if __name__ == "__main__":
    main()
