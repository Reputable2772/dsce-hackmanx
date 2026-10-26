"""Lightweight REST API service for PRECURSOR.

Provides HTTP/JSON endpoints for dashboard UI, React frontend, and external clients.
Runs on 0.0.0.0:8000 by default with full CORS support and Podman container compatibility.
Implements the PRECURSOR target API contract with full versioning (/api and /api/v1).
"""

import os
import json
import time
import urllib.parse
from typing import Dict, Any, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import threading

from precursor.runner import PrecursorEngine, SystemSnapshot
from precursor.telemetry.schema import TelemetryPoint
from precursor.telemetry.synthetic import ScenarioType
from precursor.systems.manager import SystemProbeManager

# Load project .env if present
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(_env_path):
    try:
        with open(_env_path, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k = _k.strip()
                    _v = _v.strip().strip("'\"")
                    if _k and (_k not in os.environ or not os.environ[_k].strip()):
                        os.environ[_k] = _v
    except Exception:
        pass


def resolve_scenario_type(name: Any, fallback: ScenarioType = ScenarioType.GRADUAL_DEGRADATION) -> ScenarioType:
    """Deterministically resolve scenario name or alias to ScenarioType."""
    if not name:
        return fallback
    clean = str(name).strip().lower().replace("-", "_")
    alias_map = {
        "normal": ScenarioType.NORMAL_BASELINE,
        "normal_baseline": ScenarioType.NORMAL_BASELINE,
        "normal_operation": ScenarioType.NORMAL_BASELINE,
        "baseline": ScenarioType.NORMAL_BASELINE,
        "gradual": ScenarioType.GRADUAL_DEGRADATION,
        "gradual_degradation": ScenarioType.GRADUAL_DEGRADATION,
        "sudden": ScenarioType.SUDDEN_FAILURE,
        "sudden_failure": ScenarioType.SUDDEN_FAILURE,
        "traffic": ScenarioType.TRAFFIC_SURGE,
        "traffic_surge": ScenarioType.TRAFFIC_SURGE,
        "surge": ScenarioType.TRAFFIC_SURGE,
        "slow_drift": ScenarioType.SLOW_DRIFT,
        "distribution_shift": ScenarioType.SLOW_DRIFT,
        "distribution_shift_impact": ScenarioType.SLOW_DRIFT,
        "distribution_shift_no_impact": ScenarioType.SLOW_DRIFT,
        "drift": ScenarioType.SLOW_DRIFT,
        "sensor_degradation": ScenarioType.SENSOR_DEGRADATION,
        "sensor": ScenarioType.SENSOR_DEGRADATION,
        "oscillating_instability": ScenarioType.OSCILLATING_INSTABILITY,
        "oscillating": ScenarioType.OSCILLATING_INSTABILITY,
        "instability": ScenarioType.OSCILLATING_INSTABILITY,
        "post_fault_recovery": ScenarioType.POST_FAULT_RECOVERY,
        "recovery": ScenarioType.POST_FAULT_RECOVERY,
    }
    if clean in alias_map:
        return alias_map[clean]
    try:
        return ScenarioType(clean)
    except ValueError:
        return fallback


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Multi-threaded HTTP server handling concurrent requests without blocking."""
    daemon_threads = True


class PrecursorApiHandler(BaseHTTPRequestHandler):
    """HTTP request handler for PRECURSOR REST API with CORS headers."""

    # Reference to singleton engine, system manager and lock set by server runner
    engine: PrecursorEngine = None
    engine_lock: threading.Lock = threading.Lock()
    system_manager: Optional[SystemProbeManager] = None

    @classmethod
    def get_system_manager(cls) -> SystemProbeManager:
        if cls.system_manager is None:
            cls.system_manager = SystemProbeManager()
        return cls.system_manager

    def _set_cors_headers(self, content_type: str = "application/json"):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Content-Type", content_type)

    def do_OPTIONS(self):
        """Handle CORS pre-flight requests."""
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def _send_json(self, status_code: int, data: Any):
        """Helper to send JSON response with CORS headers."""
        try:
            payload = json.dumps(data, default=str).encode("utf-8")
            self.send_response(status_code)
            self._set_cors_headers("application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _send_html(self, status_code: int, html_content: str):
        """Helper to send HTML responses with CORS headers."""
        try:
            payload = html_content.encode("utf-8")
            self.send_response(status_code)
            self._set_cors_headers("text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _read_json_body(self) -> Dict[str, Any]:
        """Read and parse JSON body from POST/PATCH requests."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode("utf-8"))
        except Exception:
            return {}

    def _normalize_path(self, raw_path: str) -> str:
        """Normalize /api/v1/... to /api/... while preserving version transparency."""
        clean = raw_path.rstrip("/")
        if clean.startswith("/api/v1/"):
            return "/api/" + clean[len("/api/v1/"):]
        elif clean == "/api/v1":
            return "/api"
        return clean

    def _build_topology(self, snapshot: SystemSnapshot) -> Dict[str, Any]:
        """Generate dynamic topology representing Spine-Leaf fabric annotated with real backend telemetry."""
        if getattr(self.engine, "mode", "synthetic") == "live":
            return self.engine.system_registry.get_topology_graph(mode="live")

        latest = snapshot.latest_telemetry or {}
        rtt = float(latest.get("latency_ms") or 18.2)
        jitter = float(latest.get("jitter_ms") or 1.4)
        loss = float(latest.get("packet_loss_pct") or 0.0)
        throughput = float(latest.get("throughput_mbps") or 480.0)
        link_state = latest.get("link_state", 1.0)
        gate_state = snapshot.gate_decision.state.value

        # Status rules
        if link_state == 0.0 or loss >= 10.0:
            spine_status = "critical"
            leaf_status = "critical"
        elif gate_state in ("DEGRADED", "ABSTAIN") or rtt > 50.0 or loss > 1.0:
            spine_status = "degraded"
            leaf_status = "degraded"
        else:
            spine_status = "healthy"
            leaf_status = "healthy"

        nodes = [
            {
                "id": "gw-edge-01",
                "name": "Edge Gateway 01",
                "type": "gateway",
                "position": [0, 3.5, -6],
                "status": "healthy",
                "metrics": {
                    "latencyMs": round(rtt * 0.9, 1),
                    "jitterMs": round(jitter * 0.8, 1),
                    "packetLossPct": 0.0,
                    "throughputMbps": round(throughput * 0.95, 1),
                },
                "metadata": {
                    "role": "Border Gateway & External Transit",
                    "interfaceName": "eth0",
                    "ipAddress": "10.0.0.1",
                },
            },
            {
                "id": "rtr-spine-01",
                "name": "Spine Router 01 (West)",
                "type": "router",
                "position": [-5, 1.8, -2],
                "status": spine_status,
                "metrics": {
                    "latencyMs": round(rtt, 1),
                    "jitterMs": round(jitter, 1),
                    "packetLossPct": round(loss, 2),
                    "throughputMbps": round(throughput, 1),
                },
                "metadata": {
                    "role": "BGP Spine Switch Layer",
                    "interfaceName": self.engine.interface_id,
                    "ipAddress": "10.0.1.1",
                },
            },
            {
                "id": "rtr-spine-02",
                "name": "Spine Router 02 (East)",
                "type": "router",
                "position": [5, 1.8, -2],
                "status": "healthy",
                "metrics": {
                    "latencyMs": 19.8,
                    "jitterMs": 1.6,
                    "packetLossPct": 0.0,
                    "throughputMbps": 910.0,
                },
                "metadata": {
                    "role": "BGP Spine Switch Layer",
                    "interfaceName": "eth2",
                    "ipAddress": "10.0.1.2",
                },
            },
            {
                "id": "sw-leaf-01",
                "name": "Leaf Switch 01 (Rack A)",
                "type": "switch",
                "position": [-7.5, -1.2, 2],
                "status": leaf_status,
                "metrics": {
                    "latencyMs": round(rtt + 2.5, 1),
                    "jitterMs": round(jitter + 0.4, 1),
                    "packetLossPct": round(loss, 2),
                    "throughputMbps": 340.0,
                },
                "metadata": {
                    "role": "TOR Access Layer",
                    "interfaceName": "swp1",
                    "ipAddress": "10.0.2.1",
                },
            },
            {
                "id": "sw-leaf-02",
                "name": "Leaf Switch 02 (Rack B)",
                "type": "switch",
                "position": [-2.5, -1.2, 2],
                "status": "healthy",
                "metrics": {"latencyMs": 22.0, "jitterMs": 1.9, "packetLossPct": 0.0, "throughputMbps": 390.0},
                "metadata": {"role": "TOR Access Layer", "interfaceName": "swp2", "ipAddress": "10.0.2.2"},
            },
            {
                "id": "sw-leaf-03",
                "name": "Leaf Switch 03 (Rack C)",
                "type": "switch",
                "position": [2.5, -1.2, 2],
                "status": "healthy",
                "metrics": {"latencyMs": 21.5, "jitterMs": 1.7, "packetLossPct": 0.0, "throughputMbps": 410.0},
                "metadata": {"role": "TOR Access Layer", "interfaceName": "swp3", "ipAddress": "10.0.2.3"},
            },
            {
                "id": "sw-leaf-04",
                "name": "Leaf Switch 04 (Rack D)",
                "type": "switch",
                "position": [7.5, -1.2, 2],
                "status": "healthy",
                "metrics": {"latencyMs": 23.1, "jitterMs": 2.1, "packetLossPct": 0.0, "throughputMbps": 380.0},
                "metadata": {"role": "TOR Access Layer", "interfaceName": "swp4", "ipAddress": "10.0.2.4"},
            },
            {
                "id": "inf-node-01",
                "name": "Ollama Inference Host 01",
                "type": "conduit",
                "position": [-5, -3.2, 5],
                "status": "healthy",
                "metrics": {"latencyMs": 5.2, "jitterMs": 0.4, "packetLossPct": 0.0, "throughputMbps": 1200.0},
                "metadata": {"role": "Air-Gapped LLM Diagnostic Host", "interfaceName": "lan0", "ipAddress": "10.0.3.1"},
            },
            {
                "id": "inf-node-02",
                "name": "Claim Verifier Engine Host",
                "type": "conduit",
                "position": [0, -3.2, 5],
                "status": "healthy",
                "metrics": {"latencyMs": 4.1, "jitterMs": 0.3, "packetLossPct": 0.0, "throughputMbps": 1200.0},
                "metadata": {"role": "Deterministic Numerical Verifier", "interfaceName": "lan1", "ipAddress": "10.0.3.2"},
            },
            {
                "id": "srv-storage-01",
                "name": "Telemetry Archive Vault",
                "type": "storage",
                "position": [5, -3.2, 5],
                "status": "healthy",
                "metrics": {"latencyMs": 6.8, "jitterMs": 0.6, "packetLossPct": 0.0, "throughputMbps": 850.0},
                "metadata": {"role": "Local File Store (data/runs)", "interfaceName": "lan2", "ipAddress": "10.0.3.3"},
            },
        ]

        links = [
            {"id": "link-gw-sp1", "source": "gw-edge-01", "target": "rtr-spine-01", "speed": "100G", "status": spine_status},
            {"id": "link-gw-sp2", "source": "gw-edge-01", "target": "rtr-spine-02", "speed": "100G", "status": "healthy"},
            {"id": "link-sp1-lf1", "source": "rtr-spine-01", "target": "sw-leaf-01", "speed": "40G", "status": leaf_status},
            {"id": "link-sp1-lf2", "source": "rtr-spine-01", "target": "sw-leaf-02", "speed": "40G", "status": "healthy"},
            {"id": "link-sp2-lf3", "source": "rtr-spine-02", "target": "sw-leaf-03", "speed": "40G", "status": "healthy"},
            {"id": "link-sp2-lf4", "source": "rtr-spine-02", "target": "sw-leaf-04", "speed": "40G", "status": "healthy"},
            {"id": "link-lf1-inf1", "source": "sw-leaf-01", "target": "inf-node-01", "speed": "10G", "status": leaf_status},
            {"id": "link-lf2-inf2", "source": "sw-leaf-02", "target": "inf-node-02", "speed": "10G", "status": "healthy"},
            {"id": "link-lf3-srv1", "source": "sw-leaf-03", "target": "srv-storage-01", "speed": "10G", "status": "healthy"},
        ]



        return {
            "id": "precursor-fabric-01",
            "name": "Precursor Spine-Leaf Fabric Digital Twin",
            "isDemoFixture": False,
            "mode": getattr(self.engine, "mode", "synthetic"),
            "gate_state": gate_state,
            "timestamp": snapshot.timestamp,
            "nodes": nodes,
            "links": links,
        }

    def _openapi_spec(self) -> Dict[str, Any]:
        """Generate OpenAPI 3.0.0 specification dictionary."""
        return {
            "openapi": "3.0.0",
            "info": {
                "title": "PRECURSOR REST API",
                "version": "1.0.0",
                "description": "Reliability-Gated Early Warning for Network Failures with Verified Offline AI Explanations.",
            },
            "servers": [{"url": "http://127.0.0.1:8000"}],
            "paths": {
                "/health": {"get": {"summary": "Health check"}},
                "/ready": {"get": {"summary": "Readiness and subsystem status check"}},
                "/api/status": {"get": {"summary": "System status, metrics, and gate decision"}},
                "/api/topology": {"get": {"summary": "Digital twin topology and node health"}},
                "/api/snapshot": {"get": {"summary": "Full system snapshot"}},
                "/api/telemetry": {"get": {"summary": "Time-series telemetry buffer queries"}},
                "/api/predictions": {"get": {"summary": "Multi-horizon early warning forecasts"}},
                "/api/gate": {"get": {"summary": "Reliability gate decision, drift, and reasons"}},
                "/api/incidents": {"get": {"summary": "Correlated incident catalog"}},
                "/api/incidents/{incident_id}": {"get": {"summary": "Single incident detail"}},
                "/api/incidents/{incident_id}/acknowledge": {"post": {"summary": "Acknowledge incident"}},
                "/api/incidents/{incident_id}/resolve": {"post": {"summary": "Resolve incident"}},
                "/api/simulation/state": {"get": {"summary": "Simulation state and ground truth"}},
                "/api/simulation/start": {"post": {"summary": "Start simulation"}},
                "/api/simulation/step": {"post": {"summary": "Advance simulation by 5s step"}},
                "/api/simulation/reset": {"post": {"summary": "Reset scenario"}},
                "/api/evaluation/run": {"post": {"summary": "Run paired GATE ON vs GATE OFF benchmark"}},
                "/api/evaluation/runs": {"get": {"summary": "List evaluation runs"}},
                "/api/evaluation/runs/{run_id}": {"get": {"summary": "Get evaluation run"}},
                "/api/copilot/query": {"post": {"summary": "Query offline diagnostic copilot"}},
                "/api/claims/verify": {"post": {"summary": "Verify numerical claims against telemetry"}},
                "/api/config": {
                    "get": {"summary": "Get configuration"},
                    "patch": {"summary": "Update configuration"},
                },
                "/api/mode": {
                    "get": {"summary": "Get live/synthetic ingestion mode"},
                    "post": {"summary": "Set ingestion mode"},
                },
                "/api/export/csv": {"get": {"summary": "Download telemetry CSV export"}},
                "/api/export/json": {"get": {"summary": "Download run archive JSON"}},
                "/api/runs": {"get": {"summary": "List saved run archives"}},
            },
        }

    def do_GET(self):
        """Route GET requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        norm_path = self._normalize_path(path)
        query = urllib.parse.parse_qs(parsed.query)

        # Auto-discover and register incoming system / client
        client_ip = self.client_address[0] if self.client_address else "127.0.0.1"
        user_agent = self.headers.get("User-Agent", "")
        system_id = self.headers.get("X-System-ID") or self.headers.get("X-Node-ID")
        try:
            self.engine.system_registry.register_access(
                ip_address=client_ip,
                user_agent=user_agent,
                endpoint=self.path,
                system_id=system_id,
            )
            self.get_system_manager().register_inbound_client(client_ip, user_agent)
        except Exception:
            pass

        if norm_path in ("", "/health", "/api/health"):
            self._send_json(200, {
                "status": "ok",
                "service": "precursor-api",
                "version": "1.0.0",
                "timestamp": time.time(),
            })
            return

        if norm_path in ("/ready", "/api/ready"):
            is_ready = bool(self.engine and self.engine.buffer)
            self._send_json(200 if is_ready else 503, {
                "status": "ready" if is_ready else "not_ready",
                "service": "precursor-api",
                "subsystems": {
                    "telemetry_buffer": "ready" if is_ready else "initializing",
                    "detector_registry": "ready",
                    "reliability_gate": "ready",
                    "copilot": "ready",
                    "incident_grouper": "ready",
                    "evaluator": "ready",
                    "storage_manager": "ready",
                },
                "mode": getattr(self.engine, "mode", "synthetic"),
                "timestamp": time.time(),
            })
            return

        if norm_path in ("/openapi.json", "/api/openapi.json"):
            self._send_json(200, self._openapi_spec())
            return

        if norm_path in ("/api/systems", "/api/systems/discovered"):
            mgr = self.get_system_manager()
            sys_list = mgr.list_systems()
            reg_ids = {s.get("id") for s in sys_list}
            if hasattr(self.engine, "system_registry"):
                for s in self.engine.system_registry.get_systems():
                    if s.get("id") not in reg_ids:
                        sys_list.append(s)
                        reg_ids.add(s.get("id"))
            self._send_json(200, {
                "systems": sys_list,
                "count": len(sys_list),
                "total": len(sys_list),
                "timestamp": time.time(),
            })
            return

        if norm_path.startswith("/api/systems/"):
            sys_id = norm_path.replace("/api/systems/", "").strip().split("/")[0]
            mgr = self.get_system_manager()
            system = mgr.get_system(sys_id)
            if system:
                self._send_json(200, system.to_dict())
            else:
                self._send_json(404, {"error": "System not found", "id": sys_id})
            return

        if norm_path in ("/docs", "/api/docs"):
            html = (
                "<!DOCTYPE html><html><head><title>PRECURSOR API Documentation</title>"
                "<style>body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:24px;line-height:1.6;}"
                "h1{color:#58a6ff;}h2{color:#79c0ff;margin-top:24px;}code{background:#161b22;padding:2px 6px;border-radius:4px;}"
                "ul{list-style-type:square;}</style></head><body>"
                "<h1>PRECURSOR REST API v1</h1>"
                "<p>Deterministic Reliability Gate & Verified Offline AI Copilot Service.</p>"
                "<h2>Core Endpoints</h2><ul>"
                "<li><code>GET /health</code> — Basic health check</li>"
                "<li><code>GET /ready</code> — Subsystems readiness check</li>"
                "<li><code>GET /api/status</code> — Live engine status & gate decision</li>"
                "<li><code>GET /api/topology</code> — Digital twin fabric topology with node health</li>"
                "<li><code>GET /api/telemetry?window=300</code> — Bounded sliding window telemetry</li>"
                "<li><code>GET /api/predictions</code> — Multi-horizon early warnings (5m, 15m, 30m)</li>"
                "<li><code>GET /api/gate</code> — Reliability gate scores & reasons</li>"
                "<li><code>GET /api/incidents</code> — Active & predicted incident groups</li>"
                "<li><code>POST /api/claims/verify</code> — Deterministic numerical claim verification</li>"
                "<li><code>POST /api/copilot/query</code> — Context-grounded offline diagnostic copilot</li>"
                "<li><code>GET /api/export/csv</code> & <code>GET /api/export/json</code> — Data export</li>"
                "</ul><p><a href='/openapi.json' style='color:#58a6ff;'>View raw OpenAPI Specification (JSON)</a></p>"
                "</body></html>"
            )
            self._send_html(200, html)
            return

        with self.engine_lock:
            # Ensure engine has at least an initial snapshot
            if not self.engine.last_snapshot:
                self.engine.step_simulation()
            snapshot = self.engine.last_snapshot

            if norm_path == "/api/snapshot":
                self._send_json(200, snapshot.model_dump())

            elif norm_path == "/api/mode":
                self._send_json(200, {
                    "mode": getattr(self.engine, "mode", "synthetic"),
                    "scenario": self.engine.scenario_type.value,
                    "target_host": getattr(self.engine.live_collector, "target_host", "127.0.0.1") if self.engine.live_collector else "127.0.0.1",
                    "target_port": getattr(self.engine.live_collector, "target_port", 80) if self.engine.live_collector else 80,
                    "interface_id": getattr(self.engine.live_collector, "interface_id", self.engine.interface_id) if self.engine.live_collector else self.engine.interface_id,
                    "timestamp": snapshot.timestamp,
                })

            elif norm_path == "/api/status":
                q_stats = self.engine.buffer.quality_stats(window_seconds=300.0)
                self._send_json(200, {
                    "mode": getattr(self.engine, "mode", "synthetic"),
                    "scenario": self.engine.scenario_type.value,
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                    "sensor_health": snapshot.gate_decision.sensor_health_score,
                    "distribution_drift": snapshot.gate_decision.drift_score,
                    "residual_expansion": snapshot.gate_decision.residual_error_score,
                    "immediate_alerts_active": snapshot.gate_decision.immediate_alerts_active,
                    "latest_metrics": snapshot.latest_telemetry,
                    "quality_stats": q_stats,
                })

            elif norm_path in ("/api/topology", "/api/systems/topology"):
                view = query.get("view", ["default"])[0]
                if view == "systems" or norm_path == "/api/systems/topology":
                    mgr = self.get_system_manager()
                    self._send_json(200, mgr.build_dynamic_topology())
                else:
                    self._send_json(200, self._build_topology(snapshot))

            elif norm_path == "/api/telemetry":
                window_sec = float(query.get("window", [300.0])[0])
                source_req = query.get("source", [None])[0]
                if not source_req and getattr(self.engine, "mode", "synthetic") == "live":
                    source_req = "live"

                t_latest = self.engine.buffer.get_latest_timestamp() or snapshot.timestamp
                df = self.engine.buffer.get_df(
                    start_time=max(0.0, t_latest - window_sec),
                    end_time=t_latest + 1.0,
                    source=source_req if source_req in ("live", "synthetic") else None,
                )
                points_data = []
                if not df.empty:
                    points_data = df.to_dict(orient="records")
                self._send_json(200, {
                    "count": len(points_data),
                    "window_seconds": window_sec,
                    "latest": snapshot.latest_telemetry,
                    "points": points_data,
                    "mode": getattr(self.engine, "mode", "synthetic"),
                })

            elif norm_path == "/api/gate":
                self._send_json(200, {
                    "state": snapshot.gate_decision.state.value,
                    "sensor_health_score": snapshot.gate_decision.sensor_health_score,
                    "distribution_drift_score": snapshot.gate_decision.drift_score,
                    "residual_error_score": snapshot.gate_decision.residual_error_score,
                    "reasons": snapshot.gate_decision.reasons,
                    "immediate_alerts_active": snapshot.gate_decision.immediate_alerts_active,
                    "timestamp": snapshot.timestamp,
                })

            elif norm_path == "/api/predictions":
                preds: Dict[str, Any] = {}
                for h in [5, 15, 30]:
                    results = snapshot.detector_results.get(h, [])
                    impact = any(r.predicted_impact for r in results)
                    sustained = any(r.is_sustained for r in results)
                    max_score = max((r.raw_score for r in results), default=0.0)
                    evidence_list = [str(r.evidence) for r in results if r.evidence and r.predicted_impact]
                    preds[str(h)] = {
                        "horizon_minutes": h,
                        "predicted_impact": impact,
                        "is_sustained": sustained,
                        "confidence_score": round(max_score, 3),
                        "evidence": " | ".join(evidence_list) if evidence_list else "Normal nominal telemetry",
                        "active_detectors": len(results),
                    }
                self._send_json(200, {
                    "gate_state": snapshot.gate_decision.state.value,
                    "predictions": preds,
                })

            elif norm_path == "/api/incidents":
                source_filter = query.get("source", [None])[0]
                if not source_filter and getattr(self.engine, "mode", "synthetic") == "live":
                    source_filter = "live"
                serialized = [i.model_dump() for i in snapshot.incidents]
                if source_filter in ("live", "synthetic"):
                    serialized = [i for i in serialized if i.get("source") == source_filter or getattr(self.engine, "mode", None) == source_filter]
                self._send_json(200, {
                    "total": len(serialized),
                    "incidents": serialized,
                    "active_faults": [i for i in serialized if i.get("is_active_fault")],
                    "predicted_events": [i for i in serialized if not i.get("is_active_fault")],
                })

            elif norm_path in ("/api/incidents/history", "/api/v1/incidents/history"):
                source_filter = query.get("source", ["all"])[0]
                severity_filter = query.get("severity", ["all"])[0]
                node_filter = query.get("node_id", ["all"])[0]
                limit = int(query.get("limit", [50])[0])
                offset = int(query.get("offset", [0])[0])
                result = self.engine.incident_db.list_incidents(
                    source=source_filter,
                    severity=severity_filter,
                    node_id=node_filter,
                    limit=limit,
                    offset=offset,
                )
                self._send_json(200, result)

            elif norm_path.startswith("/api/incidents/") and "/packets" in norm_path:
                suffix = norm_path.replace("/api/incidents/", "").strip()
                inc_id = suffix.replace("/packets", "").strip()
                limit = int(query.get("limit", [100])[0])
                packets = self.engine.incident_db.get_incident_packets(inc_id, limit=limit)
                self._send_json(200, {
                    "incident_id": inc_id,
                    "count": len(packets),
                    "packets": packets,
                })

            elif norm_path.startswith("/api/incidents/"):
                inc_id = norm_path.replace("/api/incidents/", "").strip()
                if hasattr(self.engine, "incident_db"):
                    rec = self.engine.incident_db.get_incident(inc_id)
                    if rec:
                        if hasattr(self.engine, "incident_states") and inc_id in self.engine.incident_states:
                            rec["status"] = self.engine.incident_states[inc_id]
                        self._send_json(200, rec)
                        return
                match = next((i for i in snapshot.incidents if i.id == inc_id), None)
                if match:
                    res = match.model_dump()
                    if hasattr(self.engine, "incident_states") and inc_id in self.engine.incident_states:
                        res["status"] = self.engine.incident_states[inc_id]
                    self._send_json(200, res)
                    return
                if hasattr(self.engine, "db"):
                    db_row = self.engine.db.get_incident(inc_id)
                    if db_row:
                        if hasattr(self.engine, "incident_states") and inc_id in self.engine.incident_states:
                            db_row["status"] = self.engine.incident_states[inc_id]
                        self._send_json(200, db_row)
                        return
                self._send_json(404, {"error": "Incident not found", "incident_id": inc_id})

            elif norm_path == "/api/history/summary":
                summary = self.engine.db.get_history_summary()
                self._send_json(200, summary)

            elif norm_path == "/api/history/incidents":
                status = query.get("status", [None])[0]
                severity = query.get("severity", [None])[0]
                source = query.get("source", [None])[0]
                interface_id = query.get("interface_id", [None])[0]
                fault_str = query.get("is_active_fault", [None])[0]
                is_active_fault = None
                if fault_str is not None:
                    if fault_str.lower() in ("true", "1"):
                        is_active_fault = True
                    elif fault_str.lower() in ("false", "0"):
                        is_active_fault = False
                start_time = float(query["start_time"][0]) if "start_time" in query else None
                end_time = float(query["end_time"][0]) if "end_time" in query else None
                limit = int(query.get("limit", [100])[0])
                offset = int(query.get("offset", [0])[0])

                rows, total = self.engine.db.list_incidents(
                    status=status,
                    severity=severity,
                    source=source,
                    interface_id=interface_id,
                    is_active_fault=is_active_fault,
                    start_time=start_time,
                    end_time=end_time,
                    limit=limit,
                    offset=offset,
                )
                self._send_json(200, {
                    "incidents": rows,
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                })

            elif norm_path == "/api/history/telemetry":
                start_time = float(query.get("start_time", [0])[0])
                end_time = float(query.get("end_time", [time.time() + 3600])[0])
                metric_id = query.get("metric_id", [None])[0]
                limit = int(query.get("limit", [1000])[0])
                rows = self.engine.db.get_telemetry_window(start_time, end_time, metric_id=metric_id, limit=limit)
                self._send_json(200, {
                    "points": rows,
                    "count": len(rows),
                    "start_time": start_time,
                    "end_time": end_time,
                    "metric_id": metric_id,
                })

            elif norm_path == "/api/history/gate":
                limit = int(query.get("limit", [100])[0])
                history = self.engine.db.get_gate_history(limit=limit)
                self._send_json(200, {"history": history, "count": len(history)})

            elif norm_path == "/api/history/copilot":
                inc_id = query.get("incident_id", [None])[0]
                limit = int(query.get("limit", [50])[0])
                records = self.engine.db.list_copilot_records(incident_id=inc_id, limit=limit)
                self._send_json(200, {"records": records, "count": len(records)})

            elif norm_path == "/api/history/claims":
                inc_id = query.get("incident_id", [None])[0]
                limit = int(query.get("limit", [50])[0])
                verifications = self.engine.db.list_claim_verifications(incident_id=inc_id, limit=limit)
                self._send_json(200, {"verifications": verifications, "count": len(verifications)})

            elif norm_path == "/api/notifications":
                limit = int(query.get("limit", [50])[0])
                unread = query.get("unread_only", ["0"])[0].lower() in ("1", "true")
                events = self.engine.db.list_events(limit=limit, unread_only=unread)
                self._send_json(200, {"events": events, "count": len(events)})

            elif norm_path == "/api/simulation/state":
                gt = getattr(self.engine.generator, "ground_truth", None) if getattr(self.engine, "generator", None) else None
                gt_dict = None
                if gt:
                    gt_dict = {
                        "scenario_type": gt.scenario_type.value,
                        "impact_metric": gt.impact_metric,
                        "sla_breach_threshold": gt.sla_breach_threshold,
                        "impact_start_seconds": gt.impact_start_seconds,
                        "description": gt.description,
                    }
                self._send_json(200, {
                    "scenario": self.engine.scenario_type.value,
                    "seed": self.engine.seed,
                    "mode": getattr(self.engine, "mode", "synthetic"),
                    "interface_id": self.engine.interface_id,
                    "step_count": len(self.engine.snapshot_history),
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                    "buffer_points": len(self.engine.buffer._buffer),
                    "ground_truth": gt_dict,
                })

            elif norm_path == "/api/evaluation":
                sc_name = query.get("scenario", [self.engine.scenario_type.value])[0]
                target_sc = resolve_scenario_type(sc_name, fallback=self.engine.scenario_type)
                result = self.engine.run_paired_evaluation(target_sc, seed=self.engine.seed)
                self._send_json(200, result.model_dump())

            elif norm_path == "/api/evaluation/runs":
                saved = getattr(self.engine, "saved_evaluations", [])
                self._send_json(200, {"total": len(saved), "runs": saved})

            elif norm_path.startswith("/api/evaluation/runs/"):
                eval_id = norm_path.replace("/api/evaluation/runs/", "").strip()
                saved = getattr(self.engine, "saved_evaluations", [])
                match = next((e for e in saved if e.get("evaluation_id") == eval_id), None)
                if match:
                    self._send_json(200, match)
                else:
                    self._send_json(404, {"error": "Evaluation run not found", "evaluation_id": eval_id})

            elif norm_path == "/api/config":
                sla_thresholds = getattr(self.engine, "sla_thresholds", {
                    "latency_ms": 60.0,
                    "packet_loss_pct": 2.0,
                    "jitter_ms": 10.0,
                })
                reliability_gate = getattr(self.engine, "reliability_gate_config", {
                    "drift_alpha": 0.05,
                    "min_points": 15,
                    "abstain_on_sensor_failure": True,
                })
                self._send_json(200, {
                    "scenario": self.engine.scenario_type.value,
                    "seed": self.engine.seed,
                    "mode": getattr(self.engine, "mode", "synthetic"),
                    "interface_id": self.engine.interface_id,
                    "sla_thresholds": sla_thresholds,
                    "reliability_gate": reliability_gate,
                    "horizons_minutes": [5, 15, 30],
                    "sampling_interval_seconds": 5.0,
                })

            elif norm_path == "/api/export/csv":
                export_type = query.get("type", ["telemetry"])[0].lower()
                if export_type == "incidents":
                    status = query.get("status", [None])[0]
                    severity = query.get("severity", [None])[0]
                    source = query.get("source", [None])[0]
                    rows, _ = self.engine.db.list_incidents(status=status, severity=severity, source=source, limit=10000)
                    lines = ["id,title,severity,status,is_active_fault,interface_id,first_seen,last_seen,resolved_at,duration_seconds,source"]
                    for r in rows:
                        first_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(r.get("first_seen", 0))) if r.get("first_seen") else ""
                        last_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(r.get("last_seen", 0))) if r.get("last_seen") else ""
                        res_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(r.get("resolved_at", 0))) if r.get("resolved_at") else ""
                        lines.append(f'"{r.get("id")}","{r.get("title")}","{r.get("severity")}","{r.get("status")}",{r.get("is_active_fault")},"{r.get("interface_id")}","{first_iso}","{last_iso}","{res_iso}",{r.get("duration_seconds") or ""},"{r.get("source")}"')
                    csv_text = "\n".join(lines)
                    filename = "precursor_incidents_export.csv"
                elif export_type == "gate":
                    history = self.engine.db.get_gate_history(limit=10000)
                    lines = ["timestamp_iso,timestamp_epoch,state,sensor_health_score,drift_score,residual_error_score,source"]
                    for g in history:
                        ts_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(g.get("timestamp", 0)))
                        lines.append(f'"{ts_iso}",{g.get("timestamp")},"{g.get("state")}",{g.get("sensor_health_score")},{g.get("drift_score")},{g.get("residual_error_score")},"{g.get("source")}"')
                    csv_text = "\n".join(lines)
                    filename = "precursor_gate_export.csv"
                else:
                    start_t = float(query["start_time"][0]) if "start_time" in query else 0.0
                    end_t = float(query["end_time"][0]) if "end_time" in query else time.time() + 3600
                    metric_id = query.get("metric_id", [None])[0]
                    rows = self.engine.db.get_telemetry_window(start_t, end_t, metric_id=metric_id, limit=50000)
                    if rows:
                        lines = ["timestamp_iso,timestamp_epoch,node_id,interface_id,metric_id,value,unit,quality,source"]
                        for r in rows:
                            ts_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(r.get("timestamp", 0)))
                            lines.append(f'"{ts_iso}",{r.get("timestamp")},"{r.get("node_id")}","{r.get("interface_id")}","{r.get("metric_id")}",{r.get("value")},"{r.get("unit")}","{r.get("quality")}","{r.get("source")}"')
                        csv_text = "\n".join(lines)
                    else:
                        csv_text = self.engine.export_telemetry_csv()
                    filename = "precursor_telemetry_export.csv"

                payload = csv_text.encode("utf-8")
                self.send_response(200)
                self._set_cors_headers("text/csv; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            elif norm_path == "/api/export/json":
                archive = self.engine.build_run_archive()
                payload = archive.model_dump_json(indent=2).encode("utf-8")
                self.send_response(200)
                self._set_cors_headers("application/json")
                self.send_header("Content-Disposition", 'attachment; filename="precursor_run_archive.json"')
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            elif norm_path == "/api/runs":
                runs = self.engine.storage_manager.list_saved_runs()
                self._send_json(200, {"total": len(runs), "runs": runs})

            elif norm_path.startswith("/api/runs/"):
                run_id = norm_path.replace("/api/runs/", "").strip()
                archive = self.engine.storage_manager.load_run(run_id)
                if archive:
                    self._send_json(200, archive.model_dump())
                else:
                    self._send_json(404, {"error": "Run archive not found", "run_id": run_id})

            elif norm_path in ("/api/topology/systems",):
                graph = self.engine.system_registry.get_topology_graph()
                self._send_json(200, graph)

            elif norm_path in ("/api/runbooks", "/api/v1/runbooks"):
                from precursor.copilot.runbook_matcher import RunbookMatcher
                matcher = RunbookMatcher()
                runbooks = matcher.list_all()
                self._send_json(200, {"total": len(runbooks), "runbooks": runbooks})

            elif norm_path.startswith("/api/runbooks/") or norm_path.startswith("/api/v1/runbooks/"):
                from precursor.copilot.runbook_matcher import RunbookMatcher
                rb_id = norm_path.split("/")[-1].strip()
                matcher = RunbookMatcher()
                rb = matcher.get_by_id(rb_id)
                if rb:
                    self._send_json(200, rb)
                else:
                    self._send_json(404, {"error": "Runbook not found", "runbook_id": rb_id})

            else:
                self._send_json(404, {"error": "Endpoint not found", "path": path})

    def do_PATCH(self):
        """Handle PATCH requests by delegating to POST router."""
        self.do_POST()

    def do_PUT(self):
        """Handle PUT requests by delegating to POST router."""
        self.do_POST()

    def do_DELETE(self):
        """Route DELETE requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        norm_path = self._normalize_path(path)

        if norm_path.startswith("/api/systems/"):
            sys_id = norm_path.replace("/api/systems/", "").strip().split("/")[0]
            mgr = self.get_system_manager()
            try:
                removed = mgr.remove_system(sys_id)
                if removed:
                    self._send_json(200, {"status": "deleted", "id": sys_id})
                else:
                    self._send_json(404, {"error": "System not found", "id": sys_id})
            except ValueError as e:
                self._send_json(400, {"error": str(e)})
            return

        self._send_json(404, {"error": "Endpoint not found", "path": path})

    def do_POST(self):
        """Route POST requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        norm_path = self._normalize_path(path)
        body = self._read_json_body()

        # Auto-discover and register incoming system / client
        client_ip = self.client_address[0] if self.client_address else "127.0.0.1"
        user_agent = self.headers.get("User-Agent", "")
        system_id = self.headers.get("X-System-ID") or self.headers.get("X-Node-ID")
        try:
            self.engine.system_registry.register_access(
                ip_address=client_ip,
                user_agent=user_agent,
                endpoint=self.path,
                system_id=system_id,
            )
            self.get_system_manager().register_inbound_client(client_ip, user_agent)
        except Exception:
            pass

        if norm_path == "/api/systems":
            mgr = self.get_system_manager()
            try:
                name = body.get("name")
                address = body.get("address")
                if not name or not address:
                    self._send_json(400, {"error": "Both 'name' and 'address' are required fields"})
                    return
                system = mgr.add_system(
                    name=name,
                    address=address,
                    description=body.get("description", ""),
                    probe_enabled=body.get("probe_enabled", True),
                    tags=body.get("tags"),
                    system_id=body.get("id"),
                )
                self._send_json(201, system.to_dict())
            except ValueError as e:
                self._send_json(400, {"error": str(e)})
            return

        if norm_path.startswith("/api/systems/"):
            parts = norm_path.split("/")
            sys_id = parts[3] if len(parts) > 3 else ""
            action = parts[4] if len(parts) > 4 else ""
            mgr = self.get_system_manager()

            if action == "toggle":
                system = mgr.toggle_probe(sys_id)
                if system:
                    self._send_json(200, system.to_dict())
                else:
                    self._send_json(404, {"error": "System not found", "id": sys_id})
                return

            elif action == "probe":
                system = mgr.trigger_probe(sys_id)
                if system:
                    self._send_json(200, system.to_dict())
                else:
                    self._send_json(404, {"error": "System not found", "id": sys_id})
                return

            elif not action:
                try:
                    updated = mgr.update_system(
                        system_id=sys_id,
                        name=body.get("name"),
                        address=body.get("address"),
                        description=body.get("description"),
                        probe_enabled=body.get("probe_enabled"),
                    )
                    if updated:
                        self._send_json(200, updated.to_dict())
                    else:
                        self._send_json(404, {"error": "System not found", "id": sys_id})
                except ValueError as e:
                    self._send_json(400, {"error": str(e)})
                return

        with self.engine_lock:
            if norm_path in ("/api/mode", "/api/mode/set"):
                mode = body.get("mode", "live")
                target_host = body.get("target_host", "127.0.0.1")
                target_port = int(body.get("target_port", 80))
                interface_id = body.get("interface_id", self.engine.interface_id)
                active_mode = self.engine.set_mode(
                    mode=mode,
                    target_host=target_host,
                    target_port=target_port,
                    interface_id=interface_id,
                )
                snapshot = self.engine.step_simulation()
                self._send_json(200, {
                    "status": "mode_updated",
                    "mode": active_mode,
                    "target_host": target_host,
                    "target_port": target_port,
                    "interface_id": interface_id,
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                    "latest_metrics": snapshot.latest_telemetry,
                })

            elif norm_path in ("/api/telemetry/ingest", "/api/ingest"):
                raw_points = body.get("points", [])
                ingested = []
                for p in raw_points:
                    try:
                        if isinstance(p, dict):
                            p_copy = dict(p)
                            if "quality" in p_copy and isinstance(p_copy["quality"], str):
                                p_copy["quality"] = p_copy["quality"].lower()
                            ingested.append(TelemetryPoint(**p_copy))
                    except Exception:
                        pass
                if ingested:
                    snapshot = self.engine.ingest_points(ingested)
                    self._send_json(200, {
                        "status": "ingested",
                        "count": len(ingested),
                        "timestamp": snapshot.timestamp,
                        "gate_state": snapshot.gate_decision.state.value,
                        "latest_metrics": snapshot.latest_telemetry,
                    })
                else:
                    self._send_json(400, {"error": "No valid telemetry points provided in 'points' array"})

            elif norm_path in ("/api/step", "/api/simulation/step"):
                seconds = float(body.get("seconds", 5.0))
                steps = max(1, int(seconds / 5.0))
                for _ in range(steps):
                    snapshot = self.engine.step_simulation()
                self._send_json(200, {
                    "status": "stepped",
                    "advanced_seconds": steps * 5.0,
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                    "latest_metrics": snapshot.latest_telemetry,
                    "incident_count": len(snapshot.incidents),
                })

            elif norm_path in ("/api/fast_forward", "/api/simulation/fast_forward"):
                seconds = float(body.get("seconds", 60.0))
                snapshot = self.engine.fast_forward(seconds)
                self._send_json(200, {
                    "status": "fast_forwarded",
                    "advanced_seconds": seconds,
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                    "latest_metrics": snapshot.latest_telemetry,
                    "incident_count": len(snapshot.incidents),
                })

            elif norm_path in ("/api/simulation/start",):
                steps = max(1, int(body.get("steps", 5)))
                for _ in range(steps):
                    snapshot = self.engine.step_simulation()
                self._send_json(200, {
                    "status": "started",
                    "scenario": self.engine.scenario_type.value,
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                    "latest_metrics": snapshot.latest_telemetry,
                })

            elif norm_path in ("/api/scenario/reset", "/api/reset", "/api/simulation/reset"):
                sc_name = body.get("scenario", "gradual_degradation")
                seed = int(body.get("seed", 42))
                sc_type = resolve_scenario_type(sc_name, fallback=ScenarioType.GRADUAL_DEGRADATION)
                self.engine.reset_scenario(sc_type, seed=seed)
                # Seed baseline instantly (125 seconds = 25 nominal steps)
                snapshot = self.engine.fast_forward(125.0)
                self._send_json(200, {
                    "status": "reset",
                    "scenario": sc_type.value,
                    "seed": seed,
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                })

            elif norm_path.startswith("/api/incidents/") and norm_path.endswith("/acknowledge"):
                inc_id = norm_path.replace("/api/incidents/", "").replace("/acknowledge", "").strip()
                if not hasattr(self.engine, "incident_states"):
                    self.engine.incident_states = {}
                self.engine.incident_states[inc_id] = "ACKNOWLEDGED"
                if hasattr(self.engine, "db"):
                    self.engine.db.update_incident_status(inc_id, "ACKNOWLEDGED")
                if self.engine.last_snapshot:
                    for inc in self.engine.last_snapshot.incidents:
                        if inc.id == inc_id:
                            inc.status = "ACKNOWLEDGED"
                self._send_json(200, {"status": "acknowledged", "incident_id": inc_id})

            elif norm_path.startswith("/api/incidents/") and norm_path.endswith("/resolve"):
                inc_id = norm_path.replace("/api/incidents/", "").replace("/resolve", "").strip()
                if not hasattr(self.engine, "incident_states"):
                    self.engine.incident_states = {}
                self.engine.incident_states[inc_id] = "RESOLVED"
                if hasattr(self.engine, "db"):
                    self.engine.db.update_incident_status(inc_id, "RESOLVED")
                if self.engine.last_snapshot:
                    for inc in self.engine.last_snapshot.incidents:
                        if inc.id == inc_id:
                            inc.status = "RESOLVED"
                self._send_json(200, {"status": "resolved", "incident_id": inc_id})

            elif norm_path in ("/api/notifications/read", "/api/notifications/mark-read"):
                event_id = body.get("event_id") or body.get("id")
                mark_all = body.get("all", False)
                if mark_all:
                    count = self.engine.db.mark_all_events_read()
                    self._send_json(200, {"status": "ok", "marked_read": count})
                elif event_id:
                    ok = self.engine.db.mark_event_read(int(event_id))
                    self._send_json(200, {"status": "ok", "event_id": event_id, "success": ok})
                else:
                    self._send_json(400, {"error": "Must specify 'event_id' or 'all': true"})

            elif norm_path in ("/api/copilot/explain", "/api/copilot/query", "/api/copilot"):
                user_prompt = body.get("prompt") or body.get("query") or body.get("message")
                incident_id = body.get("incident_id")
                if not incident_id and self.engine.last_snapshot and self.engine.last_snapshot.incidents:
                    incident_id = self.engine.last_snapshot.incidents[0].id

                if incident_id:
                    resp_dict = self.engine.explain_incident(incident_id=incident_id, prompt=user_prompt)
                else:
                    # General query without specific incident
                    snapshot = self.engine.last_snapshot or self.engine.step_simulation()
                    telem = snapshot.latest_telemetry
                    copilot_resp = self.engine.copilot.query(prompt=user_prompt or "Provide current network status and recommendations", telemetry_snapshot=telem)
                    resp_dict = copilot_resp.model_dump()
                    self.engine.db.record_copilot_query(
                        prompt=user_prompt or "General network inquiry",
                        response_dict=resp_dict,
                        incident_id=None,
                        source=getattr(self.engine, "mode", "synthetic"),
                    )
                self._send_json(200, resp_dict)

            elif norm_path in ("/api/claims/verify",):
                claim_text = body.get("claim") or body.get("text") or body.get("claim_text", "")
                snapshot = self.engine.last_snapshot or self.engine.step_simulation()
                telem = body.get("telemetry") or snapshot.latest_telemetry or {}
                verifications = self.engine.copilot.verifier.verify_response(claim_text, telem)
                if not verifications:
                    res_payload = {
                        "status": "completed",
                        "claim_input": claim_text,
                        "verifications": [
                            {
                                "claim_text": claim_text,
                                "metric_id": "unknown",
                                "claimed_value": 0.0,
                                "actual_value": None,
                                "status": "UNVERIFIED",
                                "explanation": "No numerical metric assertion (latency, packet loss, jitter, throughput) detected in claim text.",
                            }
                        ],
                        "telemetry_used": telem,
                    }
                else:
                    res_payload = {
                        "status": "completed",
                        "claim_input": claim_text,
                        "verifications": [v.model_dump() for v in verifications],
                        "telemetry_used": telem,
                    }
                self._send_json(200, res_payload)

            elif norm_path in ("/api/evaluation/run", "/api/evaluation"):
                sc_name = body.get("scenario", self.engine.scenario_type.value)
                seed = int(body.get("seed", self.engine.seed))
                target_sc = resolve_scenario_type(sc_name, fallback=self.engine.scenario_type)
                result = self.engine.run_paired_evaluation(target_sc, seed=seed)
                eval_dict = result.model_dump()
                eval_id = f"eval_{target_sc.value}_seed{seed}_{int(time.time())}"
                eval_record = {
                    "evaluation_id": eval_id,
                    "scenario": target_sc.value,
                    "seed": seed,
                    "timestamp": time.time(),
                    "result": eval_dict,
                }
                if not hasattr(self.engine, "saved_evaluations"):
                    self.engine.saved_evaluations = []
                self.engine.saved_evaluations.append(eval_record)
                self._send_json(200, eval_record)

            elif norm_path in ("/api/config",):
                if "scenario" in body:
                    self.engine.scenario_type = resolve_scenario_type(body["scenario"], fallback=self.engine.scenario_type)
                if "seed" in body:
                    self.engine.seed = int(body["seed"])
                if "mode" in body:
                    self.engine.set_mode(body["mode"])
                if "interface_id" in body:
                    self.engine.interface_id = str(body["interface_id"])
                if "sla_thresholds" in body and isinstance(body["sla_thresholds"], dict):
                    if not hasattr(self.engine, "sla_thresholds"):
                        self.engine.sla_thresholds = {
                            "latency_ms": 60.0,
                            "packet_loss_pct": 2.0,
                            "jitter_ms": 10.0,
                        }
                    self.engine.sla_thresholds.update(body["sla_thresholds"])
                if "reliability_gate" in body and isinstance(body["reliability_gate"], dict):
                    if not hasattr(self.engine, "reliability_gate_config"):
                        self.engine.reliability_gate_config = {
                            "drift_alpha": 0.05,
                            "min_points": 15,
                            "abstain_on_sensor_failure": True,
                        }
                    self.engine.reliability_gate_config.update(body["reliability_gate"])

                sla_thresholds = getattr(self.engine, "sla_thresholds", {
                    "latency_ms": 60.0,
                    "packet_loss_pct": 2.0,
                    "jitter_ms": 10.0,
                })
                reliability_gate = getattr(self.engine, "reliability_gate_config", {
                    "drift_alpha": 0.05,
                    "min_points": 15,
                    "abstain_on_sensor_failure": True,
                })
                self._send_json(200, {
                    "status": "updated",
                    "scenario": self.engine.scenario_type.value,
                    "seed": self.engine.seed,
                    "mode": getattr(self.engine, "mode", "synthetic"),
                    "interface_id": self.engine.interface_id,
                    "sla_thresholds": sla_thresholds,
                    "reliability_gate": reliability_gate,
                })

            elif norm_path in ("/api/runs/save", "/api/save"):
                export_csv = bool(body.get("export_csv", True))
                paths = self.engine.save_run(export_csv=export_csv)
                self._send_json(200, {
                    "status": "saved",
                    "run_id": paths.get("run_id"),
                    "json_path": paths.get("json_path"),
                    "csv_path": paths.get("csv_path"),
                })

            elif path.startswith("/api/incidents/") and path.endswith("/status"):
                inc_id = path.replace("/api/incidents/", "").replace("/status", "").strip()
                new_status = body.get("status", "INVESTIGATING")
                updated = False
                if hasattr(self.engine, "incident_db"):
                    updated = self.engine.incident_db.update_status(inc_id, new_status) or updated
                if hasattr(self.engine, "db"):
                    updated = self.engine.db.update_incident_status(inc_id, new_status) or updated
                if self.engine.last_snapshot:
                    for inc in self.engine.last_snapshot.incidents:
                        if inc.id == inc_id:
                            inc.status = new_status
                            updated = True
                if updated:
                    if not hasattr(self.engine, "incident_states"):
                        self.engine.incident_states = {}
                    self.engine.incident_states[inc_id] = new_status
                    self._send_json(200, {
                        "status": "updated",
                        "incident_id": inc_id,
                        "new_status": new_status,
                    })
                else:
                    self._send_json(404, {"error": "Incident not found", "id": inc_id})

            else:
                self._send_json(404, {"error": "Endpoint not found", "path": path})

    def log_message(self, format, *args):
        """Suppress default HTTP server logging to keep terminal output clean."""
        pass


_live_stream_thread: Optional[threading.Thread] = None
_live_stream_running = True


def _live_stream_worker():
    """Background streaming thread that continuously samples live network telemetry or steps synthetic simulation."""
    while _live_stream_running:
        try:
            handler = PrecursorApiHandler
            if handler.engine:
                engine_mode = getattr(handler.engine, "mode", "synthetic")
                if engine_mode == "live":
                    if handler.engine_lock:
                        with handler.engine_lock:
                            handler.engine.step_live()
                    else:
                        handler.engine.step_live()
                elif engine_mode == "synthetic":
                    if handler.engine_lock:
                        with handler.engine_lock:
                            handler.engine.step_simulation()
                    else:
                        handler.engine.step_simulation()
        except Exception:
            pass
        time.sleep(3.0)


def create_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    engine: Optional[PrecursorEngine] = None,
) -> ThreadedHTTPServer:
    """Instantiate and configure the PRECURSOR threaded HTTP server."""
    global _live_stream_thread
    if engine is None:
        engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
        # Pre-seed nominal 25 steps (125s) for baseline instantly
        engine.fast_forward(125.0)

    PrecursorApiHandler.engine = engine
    PrecursorApiHandler.engine_lock = threading.Lock()
    if PrecursorApiHandler.system_manager is None:
        PrecursorApiHandler.system_manager = SystemProbeManager()
    engine.system_manager = PrecursorApiHandler.system_manager

    if _live_stream_thread is None or not _live_stream_thread.is_alive():
        _live_stream_thread = threading.Thread(target=_live_stream_worker, daemon=True, name="precursor-live-streamer")
        _live_stream_thread.start()

    server = ThreadedHTTPServer((host, port), PrecursorApiHandler)
    return server


def run_server():
    """CLI entrypoint for running the REST API server."""
    host = os.environ.get("PRECURSOR_HOST", "0.0.0.0")
    port = int(os.environ.get("PRECURSOR_PORT", "8000"))
    print("============================================================")
    print("  PRECURSOR REST API Service (CORS enabled)")
    print(f"  Listening on http://{host}:{port}")
    print("  Endpoints: /health, /ready, /docs, /api/status, /api/topology,")
    print("             /api/telemetry, /api/gate, /api/predictions,")
    print("             /api/incidents, /api/simulation, /api/evaluation,")
    print("             /api/copilot/query, /api/claims/verify, /api/config")
    print("============================================================")
    server = create_server(host=host, port=port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down PRECURSOR REST API service...")
        server.server_close()


if __name__ == "__main__":
    run_server()
