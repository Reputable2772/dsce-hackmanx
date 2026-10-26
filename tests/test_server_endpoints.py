"""Automated integration tests for PRECURSOR REST API server endpoints."""

import json
import time
import threading
import urllib.request
import urllib.error
import pytest

from precursor.server import create_server
from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType


@pytest.fixture(scope="module")
def api_server():
    """Start threaded test server on port 8001 for test suite isolation."""
    engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    engine.fast_forward(125.0)
    server = create_server(host="127.0.0.1", port=8001, engine=engine)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.2)  # Give server socket a moment to bind
    yield "http://127.0.0.1:8001"
    server.shutdown()
    server.server_close()


def _get(url: str):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def _post(url: str, data: dict):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=25) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def _patch(url: str, data: dict):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="PATCH")
    with urllib.request.urlopen(req, timeout=25) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def test_health_and_readiness(api_server):
    """Verify /health and /ready endpoints."""
    status, body = _get(f"{api_server}/health")
    assert status == 200
    assert body["status"] == "ok"
    assert body["service"] == "precursor-api"

    status, body = _get(f"{api_server}/ready")
    assert status == 200
    assert body["status"] == "ready"
    assert "subsystems" in body
    assert body["subsystems"]["telemetry_buffer"] == "ready"


def test_openapi_and_docs(api_server):
    """Verify /openapi.json and /docs."""
    status, body = _get(f"{api_server}/openapi.json")
    assert status == 200
    assert body["openapi"] == "3.0.0"
    assert "/api/status" in body["paths"]

    req = urllib.request.Request(f"{api_server}/docs")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200
        content = resp.read().decode("utf-8")
        assert "PRECURSOR REST API" in content


def test_status_and_versioning(api_server):
    """Verify /api/status and /api/v1/status parity."""
    status, b1 = _get(f"{api_server}/api/status")
    assert status == 200
    assert "gate_state" in b1
    assert "latest_metrics" in b1

    status, b2 = _get(f"{api_server}/api/v1/status")
    assert status == 200
    assert b2["gate_state"] == b1["gate_state"]


def test_topology_endpoint(api_server):
    """Verify /api/topology digital twin payload."""
    status, body = _get(f"{api_server}/api/topology")
    assert status == 200
    assert body["id"] == "precursor-fabric-01"
    assert len(body["nodes"]) == 10
    assert len(body["links"]) >= 9
    assert any(n["type"] == "router" for n in body["nodes"])


def test_telemetry_and_predictions(api_server):
    """Verify /api/telemetry and /api/predictions."""
    status, telem = _get(f"{api_server}/api/telemetry?window=300")
    assert status == 200
    assert "points" in telem
    assert telem["count"] > 0

    status, preds = _get(f"{api_server}/api/predictions")
    assert status == 200
    assert "predictions" in preds
    assert "5" in preds["predictions"]
    assert "15" in preds["predictions"]
    assert "30" in preds["predictions"]


def test_gate_and_incidents(api_server):
    """Verify /api/gate and /api/incidents."""
    status, gate = _get(f"{api_server}/api/gate")
    assert status == 200
    assert gate["state"] in ("PREDICT", "DEGRADED", "ABSTAIN")
    assert gate["immediate_alerts_active"] is True

    status, incs = _get(f"{api_server}/api/incidents")
    assert status == 200
    assert "incidents" in incs
    assert "active_faults" in incs
    assert "predicted_events" in incs


def test_simulation_controls(api_server):
    """Verify step, reset, and state endpoints."""
    # Simulation state
    status, state = _get(f"{api_server}/api/simulation/state")
    assert status == 200
    assert state["scenario"] == "gradual_degradation"

    # Step
    status, step_res = _post(f"{api_server}/api/simulation/step", {"seconds": 5.0})
    assert status == 200
    assert step_res["status"] == "stepped"

    # Reset
    status, reset_res = _post(f"{api_server}/api/simulation/reset", {"scenario": "normal", "seed": 42})
    assert status == 200
    assert reset_res["status"] == "reset"


def test_claim_verification_endpoint(api_server):
    """Verify deterministic claim verification endpoint."""
    # Numeric claim that matches nominal telemetry (around 14-25 ms)
    status, res = _post(f"{api_server}/api/claims/verify", {"claim": "latency is 20 ms", "telemetry": {"latency_ms": 20.5}})
    assert status == 200
    assert res["status"] == "completed"
    assert len(res["verifications"]) == 1
    assert res["verifications"][0]["status"] == "VERIFIED"

    # Numeric claim that is contradicted
    status, res = _post(f"{api_server}/api/claims/verify", {"claim": "latency is 150 ms", "telemetry": {"latency_ms": 20.5}})
    assert status == 200
    assert res["verifications"][0]["status"] == "CONTRADICTED"

    # Non-numeric claim
    status, res = _post(f"{api_server}/api/claims/verify", {"claim": "network feels a bit slow today"})
    assert status == 200
    assert res["verifications"][0]["status"] == "UNVERIFIED"


def test_evaluation_run_and_history(api_server):
    """Verify evaluation trigger and list endpoints."""
    status, eval_res = _post(f"{api_server}/api/evaluation/run", {"scenario": "gradual_degradation", "seed": 42})
    assert status == 200
    assert "evaluation_id" in eval_res
    assert "gate_on" in eval_res["result"]
    assert "gate_off" in eval_res["result"]

    status, runs = _get(f"{api_server}/api/evaluation/runs")
    assert status == 200
    assert runs["total"] >= 1


def test_incident_lifecycle(api_server):
    """Verify incident acknowledge and resolve lifecycle endpoints."""
    # Create or step until incidents exist
    _post(f"{api_server}/api/simulation/reset", {"scenario": "sudden_failure", "seed": 42})
    _post(f"{api_server}/api/simulation/step", {"seconds": 800.0})

    status, incs = _get(f"{api_server}/api/incidents")
    if incs["incidents"]:
        inc_id = incs["incidents"][0]["id"]
        status, ack = _post(f"{api_server}/api/incidents/{inc_id}/acknowledge", {})
        assert status == 200
        assert ack["status"] == "acknowledged"

        status, single = _get(f"{api_server}/api/incidents/{inc_id}")
        assert status == 200
        assert single["status"] == "ACKNOWLEDGED"

        status, res = _post(f"{api_server}/api/incidents/{inc_id}/resolve", {})
        assert status == 200
        assert res["status"] == "resolved"


def test_config_endpoints(api_server):
    """Verify GET and PATCH /api/config."""
    status, cfg = _get(f"{api_server}/api/config")
    assert status == 200
    assert "sla_thresholds" in cfg
    assert "reliability_gate" in cfg

    status, patched = _patch(f"{api_server}/api/config", {"seed": 99})
    assert status == 200
    assert patched["seed"] == 99


def test_runbooks_endpoints(api_server):
    """Verify /api/runbooks and /api/runbooks/{id}."""
    status, body = _get(f"{api_server}/api/runbooks")
    assert status == 200
    assert body["total"] == 9
    assert len(body["runbooks"]) == 9
    assert any(rb["id"] == "latency_jitter" for rb in body["runbooks"])

    status, single = _get(f"{api_server}/api/runbooks/latency_jitter")
    assert status == 200
    assert single["id"] == "latency_jitter"
    assert "content" in single
    assert "ping" in single["content"] or "latency" in single["content"].lower()


def test_prompt_driven_copilot_and_scenario_aliases(api_server):
    """Verify dynamic prompt querying in copilot and scenario alias mapping."""
    # Copilot with query prompt
    status, copilot_res = _post(
        f"{api_server}/api/copilot/query",
        {"prompt": "Investigate packet loss spike and buffer drops on eth0"},
    )
    assert status == 200
    assert "hypotheses" in copilot_res
    assert len(copilot_res["hypotheses"]) > 0
    assert len(copilot_res["diagnostic_commands"]) > 0
    assert len(copilot_res["verification_steps"]) > 0

    # Scenario alias testing: 'distribution_shift' -> SLOW_DRIFT
    status, reset_res = _post(
        f"{api_server}/api/simulation/reset",
        {"scenario": "distribution_shift", "seed": 42},
    )
    assert status == 200
    assert reset_res["scenario"] == "slow_drift"

    # Scenario alias testing: 'recovery' -> POST_FAULT_RECOVERY
    status, reset_res = _post(
        f"{api_server}/api/simulation/reset",
        {"scenario": "recovery", "seed": 42},
    )
    assert status == 200
    assert reset_res["scenario"] == "post_fault_recovery"

    # Reset back to baseline normal
    status, reset_res = _post(
        f"{api_server}/api/simulation/reset",
        {"scenario": "normal", "seed": 42},
    )
    assert status == 200
    assert reset_res["scenario"] == "normal_baseline"

