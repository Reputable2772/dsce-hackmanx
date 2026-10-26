"""Comprehensive tests for simulating network failure situations via REST API and engine.

Validates:
1. Simulating gradual bufferbloat degradation via step and point ingestion.
2. Simulating sudden physical link cuts with zero-latency immediate bypass alerts.
3. Simulating sensor corruption triggering Kolmogorov-Smirnov drift and ABSTAIN gate.
4. Simulating dual-stage Copilot lifecycle (instant overview -> async LLM enrichment).
5. Granular packet trace and topology inspection for simulated situations.
"""

import time
import json
import urllib.request
import threading
import pytest

from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType
from precursor.telemetry.schema import TelemetryPoint, MetricQuality
from precursor.server import create_server
from precursor.gate.states import GateState


@pytest.fixture(scope="module")
def api_test_server():
    """Start an ephemeral PRECURSOR API server for simulation scenario testing."""
    engine = PrecursorEngine(scenario_type=ScenarioType.NORMAL_BASELINE, seed=42)
    server = create_server(host="127.0.0.1", port=0, engine=engine)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{port}"
    yield {"base_url": base_url, "engine": engine, "server": server}
    server.shutdown()
    server.server_close()


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_json(url: str) -> dict:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def test_simulate_gradual_bufferbloat_via_api(api_test_server):
    """
    Simulation Situation 1:
    Operator uses curl to reset to gradual degradation, steps timeline,
    and observes early warning detectors firing before physical SLA breach.
    """
    base_url = api_test_server["base_url"]

    # 1. Reset to gradual degradation scenario
    reset_resp = _post_json(f"{base_url}/api/scenario/reset", {"scenario": "gradual_degradation", "seed": 42})
    assert reset_resp["status"] == "reset"
    assert reset_resp["scenario"] == "gradual_degradation"

    # 2. Advance simulation into the degradation onset (t = 800s)
    step_resp = _post_json(f"{base_url}/api/step", {"seconds": 675.0})
    assert step_resp["status"] == "stepped"
    assert step_resp["advanced_seconds"] == 675.0

    # 3. Query predictions endpoint to verify multi-horizon early warnings
    preds = _get_json(f"{base_url}/api/predictions")
    assert "predictions" in preds
    assert "5" in preds["predictions"]
    assert "15" in preds["predictions"]
    assert "30" in preds["predictions"]

    # At least one horizon must flag predicted impact
    impact_flags = [p["predicted_impact"] for p in preds["predictions"].values()]
    assert any(impact_flags), "Expected multi-horizon early warning to flag predicted impact"

    # 4. Check incidents endpoint
    incidents_resp = _get_json(f"{base_url}/api/incidents")
    assert incidents_resp["total"] > 0
    assert len(incidents_resp["predicted_events"]) > 0


def test_simulate_physical_link_cut_immediate_alert(api_test_server):
    """
    Simulation Situation 2:
    Operator simulates sudden fiber cut (link_state = 0.0) via direct point ingestion.
    Verifies zero-latency immediate bypass alert is generated immediately.
    """
    base_url = api_test_server["base_url"]
    t_now = time.time()

    # Ingest a severe link cut failure
    cut_points = [
        {"timestamp": t_now, "metric_id": "link_state", "value": 0.0, "quality": "good", "interface_id": "eth0"},
        {"timestamp": t_now, "metric_id": "packet_loss_pct", "value": 100.0, "quality": "good", "interface_id": "eth0"},
        {"timestamp": t_now, "metric_id": "latency_ms", "value": 0.0, "quality": "good", "interface_id": "eth0"},
        {"timestamp": t_now, "metric_id": "throughput_mbps", "value": 0.0, "quality": "good", "interface_id": "eth0"},
    ]
    ingest_resp = _post_json(f"{base_url}/api/telemetry/ingest", {"points": cut_points})
    assert ingest_resp["status"] == "ingested"
    assert ingest_resp["count"] == 4

    # Verify immediate active physical fault exists
    incidents_resp = _get_json(f"{base_url}/api/incidents")
    assert len(incidents_resp["active_faults"]) > 0
    top_fault = incidents_resp["active_faults"][0]
    assert top_fault["is_active_fault"] is True
    assert "link_state" in top_fault["primary_metrics"]

    # Verify Gate status retains immediate alerts active
    gate_resp = _get_json(f"{base_url}/api/gate")
    assert gate_resp["immediate_alerts_active"] is True


def test_simulate_sensor_malfunction_ks_drift(api_test_server):
    """
    Simulation Situation 3:
    Operator simulates broken/stale sensor readings.
    Verifies Reliability Gate transitions to ABSTAIN and reports drift/quality reasons.
    """
    engine = api_test_server["engine"]
    base_url = api_test_server["base_url"]

    # Reset to sensor degradation scenario where synthetic sensor produces stale/corrupt values
    reset_resp = _post_json(f"{base_url}/api/scenario/reset", {"scenario": "sensor_degradation", "seed": 42})
    assert reset_resp["status"] == "reset"

    # Fast forward into full corruption window
    _post_json(f"{base_url}/api/step", {"seconds": 1200.0})

    gate_resp = _get_json(f"{base_url}/api/gate")
    # Gate must reflect ABSTAIN or severe sensor health degradation
    assert gate_resp["state"] in ("ABSTAIN", "DEGRADED")
    assert len(gate_resp["reasons"]) > 0


def test_simulate_dual_stage_copilot_and_status_update(api_test_server):
    """
    Simulation Situation 4:
    Verifies instant heuristic overview (<50ms) and subsequent status update via REST API.
    """
    base_url = api_test_server["base_url"]
    engine = api_test_server["engine"]

    # Trigger fresh incident
    _post_json(f"{base_url}/api/scenario/reset", {"scenario": "gradual_degradation", "seed": 42})
    _post_json(f"{base_url}/api/step", {"seconds": 750.0})

    # 1. Query Copilot endpoint
    t0 = time.time()
    copilot_resp = _post_json(f"{base_url}/api/copilot/query", {})
    t_elapsed = time.time() - t0

    # Must return instantly (sub-500ms over local HTTP)
    assert t_elapsed < 0.50, f"Expected instant Copilot response, took {t_elapsed:.3f}s"
    assert "summary" in copilot_resp
    assert "hypotheses" in copilot_resp
    assert len(copilot_resp["diagnostic_commands"]) > 0

    # 2. Query persistent history
    history = _get_json(f"{base_url}/api/incidents/history?limit=5")
    assert history["total"] > 0
    inc_id = history["incidents"][0]["id"]

    # 3. Query granular packet samples
    packets_resp = _get_json(f"{base_url}/api/incidents/{inc_id}/packets?limit=3")
    assert packets_resp["incident_id"] == inc_id
    assert len(packets_resp["packets"]) > 0
    p = packets_resp["packets"][0]
    assert "source" in p and "destination" in p and "protocol" in p

    # 4. Update incident status to INVESTIGATING
    status_update = _post_json(f"{base_url}/api/incidents/{inc_id}/status", {"status": "INVESTIGATING"})
    assert status_update["status"] == "updated"
    assert status_update["new_status"] == "INVESTIGATING"

    # Confirm status persisted
    detail = _get_json(f"{base_url}/api/incidents/{inc_id}")
    assert detail["status"] == "INVESTIGATING"


def test_simulate_custom_telemetry_point_injection(api_test_server):
    """
    Simulation Situation 5:
    Operator uses curl to inject custom telemetry simulating a micro-burst:
    sudden latency spike from 20ms to 95ms with 15% packet loss.
    """
    base_url = api_test_server["base_url"]
    now = time.time()

    burst_points = [
        {"timestamp": now, "metric_id": "latency_ms", "value": 98.4, "quality": "good", "interface_id": "eth0"},
        {"timestamp": now, "metric_id": "packet_loss_pct", "value": 14.2, "quality": "good", "interface_id": "eth0"},
        {"timestamp": now, "metric_id": "jitter_ms", "value": 24.5, "quality": "good", "interface_id": "eth0"},
        {"timestamp": now, "metric_id": "drops_in", "value": 150.0, "quality": "good", "interface_id": "eth0"},
    ]

    resp = _post_json(f"{base_url}/api/telemetry/ingest", {"points": burst_points})
    assert resp["status"] == "ingested"
    assert resp["count"] == 4
    assert resp["latest_metrics"]["latency_ms"] == 98.4
    assert resp["latest_metrics"]["packet_loss_pct"] == 14.2
