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
from precursor.telemetry.schema import TelemetryPoint
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
        except Exception:
            pass

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

            if path == "/api/snapshot":
                self._send_json(200, snapshot.model_dump())

            elif path == "/api/mode":
                self._send_json(200, {
                    "mode": getattr(self.engine, "mode", "synthetic"),
                    "scenario": self.engine.scenario_type.value,
                    "target_host": getattr(self.engine.live_collector, "target_host", "127.0.0.1") if self.engine.live_collector else "127.0.0.1",
                    "target_port": getattr(self.engine.live_collector, "target_port", 80) if self.engine.live_collector else 80,
                    "interface_id": getattr(self.engine.live_collector, "interface_id", self.engine.interface_id) if self.engine.live_collector else self.engine.interface_id,
                    "timestamp": snapshot.timestamp,
                })

            elif path == "/api/status":
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

            elif path == "/api/export/csv":
                csv_text = self.engine.export_telemetry_csv()
                payload = csv_text.encode("utf-8")
                self.send_response(200)
                self._set_cors_headers("text/csv; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="precursor_telemetry.csv"')
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            elif path == "/api/export/json":
                archive = self.engine.build_run_archive()
                payload = archive.model_dump_json(indent=2).encode("utf-8")
                self.send_response(200)
                self._set_cors_headers("application/json")
                self.send_header("Content-Disposition", 'attachment; filename="precursor_run_archive.json"')
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            elif path == "/api/runs":
                runs = self.engine.storage_manager.list_saved_runs()
                self._send_json(200, {"total": len(runs), "runs": runs})

            elif path.startswith("/api/runs/"):
                run_id = path.replace("/api/runs/", "").strip()
                archive = self.engine.storage_manager.load_run(run_id)
                if archive:
                    self._send_json(200, archive.model_dump())
                else:
                    self._send_json(404, {"error": "Run archive not found", "run_id": run_id})

            elif path == "/api/incidents/history":
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

            elif path.startswith("/api/incidents/"):
                suffix = path.replace("/api/incidents/", "").strip()
                if "/packets" in suffix:
                    inc_id = suffix.replace("/packets", "").strip()
                    limit = int(query.get("limit", [100])[0])
                    packets = self.engine.incident_db.get_incident_packets(inc_id, limit=limit)
                    self._send_json(200, {
                        "incident_id": inc_id,
                        "count": len(packets),
                        "packets": packets,
                    })
                else:
                    inc_id = suffix
                    rec = self.engine.incident_db.get_incident(inc_id)
                    if rec:
                        self._send_json(200, rec)
                    else:
                        self._send_json(404, {"error": "Incident not found", "id": inc_id})

            elif path in ("/api/topology/systems", "/api/topology"):
                graph = self.engine.system_registry.get_topology_graph()
                self._send_json(200, graph)

            elif path in ("/api/systems", "/api/systems/discovered"):
                systems = self.engine.system_registry.get_systems()
                self._send_json(200, {"total": len(systems), "systems": systems})

            else:
                self._send_json(404, {"error": "Endpoint not found", "path": path})

    def do_POST(self):
        """Route POST requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
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
        except Exception:
            pass

        with self.engine_lock:
            if path in ("/api/mode", "/api/mode/set"):
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

            elif path in ("/api/telemetry/ingest", "/api/ingest"):
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

            elif path in ("/api/step", "/api/simulation/step"):
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
                # Seed baseline instantly
                snapshot = self.engine.fast_forward(125.0)
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

            elif path in ("/api/runs/save", "/api/save"):
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
                updated = self.engine.incident_db.update_status(inc_id, new_status)
                if updated:
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


def create_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    engine: Optional[PrecursorEngine] = None,
) -> ThreadedHTTPServer:
    """Instantiate and configure the PRECURSOR threaded HTTP server."""
    if engine is None:
        engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
        # Pre-seed nominal 25 steps (125s) for baseline instantly
        engine.fast_forward(125.0)

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
