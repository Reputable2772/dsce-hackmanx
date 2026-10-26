"""Headless Runner and Integration API for PRECURSOR.

This module provides the primary interface consumed by the Streamlit dashboard
and headless evaluation pipelines.
"""

import sys
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import numpy as np
from pydantic import BaseModel, Field

from precursor.telemetry.schema import TelemetryPoint, MetricBatch, MetricQuality
from precursor.telemetry.buffer import TelemetryBuffer
from precursor.telemetry.synthetic import (
    SyntheticTelemetryGenerator,
    SyntheticScenarioConfig,
    ScenarioType,
)
from precursor.detectors.registry import DetectorRegistry
from precursor.detectors.base import DetectorResult
from precursor.gate.reliability_gate import ReliabilityGate
from precursor.gate.states import GateDecision, GateState
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
        interface_id: str = "eth0",
    ):
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

    def reset_scenario(self, scenario_type: ScenarioType, seed: int = 42):
        """Switch to a new synthetic scenario and reset the internal buffer."""
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
        t_now = self.buffer.get_latest_timestamp() or self.config.start_timestamp
        return self._evaluate_pipeline(t_now)

    def step_simulation(self) -> SystemSnapshot:
        """Advance the synthetic generator by one 5-second step and compute the pipeline."""
        batch = self.generator.step()
        self.buffer.add_batch(batch.points)
        return self._evaluate_pipeline(batch.timestamp)

    def fast_forward(self, seconds: float = 600.0) -> SystemSnapshot:
        """Fast-forward simulation by the given duration in seconds."""
        steps = int(seconds / self.config.step_seconds)
        for _ in range(steps):
            batch = self.generator.step()
            self.buffer.add_batch(batch.points)
        t_now = self.buffer.get_latest_timestamp()
        return self._evaluate_pipeline(t_now)

    def _evaluate_pipeline(self, current_time: float) -> SystemSnapshot:
        """Execute full pipeline for current timestamp."""
        # 1. Multi-horizon detection
        results_by_h = self.registry.evaluate_horizons(self.buffer, current_time, horizons=[5, 15, 30])

        # 2. Reliability Gate
        gate_decision = self.gate.evaluate(self.buffer, current_time)

        # 3. Incident Grouping
        incidents = self.grouper.group(results_by_h, gate_decision, current_time, interface_id=self.interface_id)

        # 4. Telemetry Snapshot
        latest_telem: Dict[str, Optional[float]] = {}
        for m in ["latency_ms", "jitter_ms", "packet_loss_pct", "throughput_mbps", "link_state", "drops_in"]:
            _, vals, _ = self.buffer.get_series(m, current_time - 15.0, current_time)
            if len(vals) > 0 and not np.isnan(vals[-1]):
                latest_telem[m] = round(float(vals[-1]), 2)
            else:
                latest_telem[m] = None

        quality_stats = self.buffer.quality_stats(window_seconds=300.0, current_time=current_time)

        # 5. Copilot guidance for the highest severity active incident
        copilot_response = None
        if incidents:
            top_incident = sorted(incidents, key=lambda i: (i.severity == "CRITICAL", not i.is_active_fault), reverse=True)[0]
            matches = self.matcher.match(top_incident, top_k=2)
            copilot_response = self.copilot.explain_and_recommend(top_incident, latest_telem, matches)

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
    print(f"============================================================")
    print(f"  PRECURSOR — Reliability-Gated Network Copilot (Headless)")
    print(f"  Scenario: {sc_type.value} | Seed: {args.seed} | Steps: {args.steps}")
    print(f"============================================================\n")

    engine = PrecursorEngine(scenario_type=sc_type, seed=args.seed)

    print(f"Advancing simulation by {args.steps * 5} seconds...")
    snapshot = engine.fast_forward(args.steps * 5.0)

    print(f"\n--- [1] Telemetry Snapshot (t={snapshot.timestamp}) ---")
    for k, v in snapshot.latest_telemetry.items():
        print(f"  {k:20s}: {v}")

    print(f"\n--- [2] Reliability Gate Status ---")
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

    print(f"\n============================================================")
    print(f"  Running Paired Evaluation (GATE ON vs GATE OFF)...")
    comp = engine.run_paired_evaluation(sc_type, seed=args.seed)
    for h in [5, 15]:
        on = comp.gate_on[h]
        off = comp.gate_off[h]
        print(f"  Horizon {h}m:")
        print(f"    GATE ON  -> Recall: {on.event_recall}, FA/hr: {on.false_alarms_per_hour}, Lead Time: {on.average_lead_time_minutes}m, Abstain: {on.abstention_rate}")
        print(f"    GATE OFF -> Recall: {off.event_recall}, FA/hr: {off.false_alarms_per_hour}, Lead Time: {off.average_lead_time_minutes}m, Abstain: {off.abstention_rate}")
    print(f"============================================================\n")


if __name__ == "__main__":
    main()
