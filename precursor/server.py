"""Lightweight REST API service for PRECURSOR.

Provides HTTP/JSON endpoints for dashboard UI, React frontend, and external clients.
Runs on 0.0.0.0:8000 by default with full CORS support and Podman container compatibility.
"""

import os
import sys
import json
import time
import urllib.parse
from typing import Dict, Any, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import threading

from precursor.runner import PrecursorEngine, SystemSnapshot
from precursor.telemetry.synthetic import ScenarioType
from precursor.gate.states import GateState


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Multi-threaded HTTP server handling concurrent requests without blocking."""
    daemon_threads = True


class PrecursorApiHandler(BaseHTTPRequestHandler):
    """HTTP request handler for PRECURSOR REST API with CORS headers."""

    # Reference to singleton engine and lock set by server runner
    engine: PrecursorEngine = None
    engine_lock: threading.Lock = threading.Lock()

    def _set_cors_headers(self, content_type: str = "application/json"):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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

    def _read_json_body(self) -> Dict[str, Any]:
        """Read and parse JSON body from POST requests."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        """Route GET requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = urllib.parse.parse_qs(parsed.query)

        if path in ("", "/health", "/api/health"):
            self._send_json(200, {
                "status": "ok",
                "service": "precursor-api",
                "version": "1.0.0",
                "timestamp": time.time(),
            })
            return

        with self.engine_lock:
            # Ensure engine has at least an initial snapshot
            if not self.engine.last_snapshot:
                self.engine.step_simulation()
            snapshot = self.engine.last_snapshot

            if path == "/api/status":
                q_stats = self.engine.buffer.quality_stats(window_seconds=300.0)
                self._send_json(200, {
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

            elif path == "/api/telemetry":
                window_sec = float(query.get("window", [300.0])[0])
                df = self.engine.buffer.get_df()
                points_data = []
                if not df.empty:
                    # Filter to recent window
                    t_latest = self.engine.buffer.get_latest_timestamp() or snapshot.timestamp
                    recent_df = df[df["timestamp"] >= (t_latest - window_sec)]
                    points_data = recent_df.to_dict(orient="records")
                self._send_json(200, {
                    "count": len(points_data),
                    "window_seconds": window_sec,
                    "latest": snapshot.latest_telemetry,
                    "points": points_data,
                })

            elif path == "/api/gate":
                self._send_json(200, {
                    "state": snapshot.gate_decision.state.value,
                    "sensor_health_score": snapshot.gate_decision.sensor_health_score,
                    "distribution_drift_score": snapshot.gate_decision.drift_score,
                    "residual_error_score": snapshot.gate_decision.residual_error_score,
                    "reasons": snapshot.gate_decision.reasons,
                    "immediate_alerts_active": snapshot.gate_decision.immediate_alerts_active,
                    "timestamp": snapshot.timestamp,
                })

            elif path == "/api/predictions":
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

            elif path == "/api/incidents":
                serialized = [i.model_dump() for i in snapshot.incidents]
                self._send_json(200, {
                    "total": len(serialized),
                    "incidents": serialized,
                    "active_faults": [i for i in serialized if i.get("is_active_fault")],
                    "predicted_events": [i for i in serialized if not i.get("is_active_fault")],
                })

            elif path == "/api/evaluation":
                sc_name = query.get("scenario", [self.engine.scenario_type.value])[0]
                try:
                    target_sc = ScenarioType(sc_name)
                except ValueError:
                    target_sc = self.engine.scenario_type
                result = self.engine.run_paired_evaluation(target_sc, seed=self.engine.seed)
                self._send_json(200, result.model_dump())

            else:
                self._send_json(404, {"error": "Endpoint not found", "path": path})

    def do_POST(self):
        """Route POST requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self._read_json_body()

        with self.engine_lock:
            if path in ("/api/step", "/api/simulation/step"):
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

            elif path in ("/api/scenario/reset", "/api/reset"):
                sc_name = body.get("scenario", "gradual_degradation")
                seed = int(body.get("seed", 42))
                try:
                    sc_type = ScenarioType(sc_name)
                except ValueError:
                    sc_type = ScenarioType.GRADUAL_DEGRADATION
                self.engine.reset_scenario(sc_type, seed=seed)
                # Seed baseline
                for _ in range(25):
                    snapshot = self.engine.step_simulation()
                self._send_json(200, {
                    "status": "reset",
                    "scenario": sc_type.value,
                    "seed": seed,
                    "timestamp": snapshot.timestamp,
                    "gate_state": snapshot.gate_decision.state.value,
                })

            elif path in ("/api/copilot/query", "/api/copilot"):
                snapshot = self.engine.last_snapshot or self.engine.step_simulation()
                if snapshot.copilot_response:
                    resp_dict = snapshot.copilot_response.model_dump()
                else:
                    resp_dict = {
                        "summary": "Nominal network operating state.",
                        "hypotheses": ["Steady-state traffic"],
                        "diagnostic_commands": ["ping -c 3 1.1.1.1"],
                        "verification_steps": ["Confirm latency remains nominal"],
                        "risks_and_rollback": [],
                        "claims": [],
                        "model_used": "offline_heuristic_fallback",
                    }
                self._send_json(200, resp_dict)

            else:
                self._send_json(404, {"error": "Endpoint not found", "path": path})

    def log_message(self, format, *args):
        """Suppress default HTTP server logging to keep terminal output clean."""
        pass


def create_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    engine: Optional[PrecursorEngine] = None,
) -> ThreadedHTTPServer:
    """Instantiate and configure the PRECURSOR threaded HTTP server."""
    if engine is None:
        engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
        # Pre-seed nominal 25 steps for baseline
        for _ in range(25):
            engine.step_simulation()

    PrecursorApiHandler.engine = engine
    PrecursorApiHandler.engine_lock = threading.Lock()
    server = ThreadedHTTPServer((host, port), PrecursorApiHandler)
    return server


def run_server():
    """CLI entrypoint for running the REST API server."""
    host = os.environ.get("PRECURSOR_HOST", "0.0.0.0")
    port = int(os.environ.get("PRECURSOR_PORT", "8000"))
    print(f"============================================================")
    print(f"  PRECURSOR REST API Service (CORS enabled)")
    print(f"  Listening on http://{host}:{port}")
    print(f"  Endpoints: /health, /api/status, /api/telemetry, /api/gate,")
    print(f"             /api/predictions, /api/incidents, /api/evaluation")
    print(f"============================================================")
    server = create_server(host=host, port=port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down PRECURSOR REST API service...")
        server.server_close()


if __name__ == "__main__":
    run_server()
