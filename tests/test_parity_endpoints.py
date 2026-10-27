"""Integration and parity tests for newly wired backend endpoints."""

import json
import time
import threading
import urllib.request
import urllib.error
import pytest

from precursor.server import create_server
from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType

SERVER_BASE = "http://127.0.0.1:8000"


@pytest.fixture(scope="module", autouse=True)
def ensure_server():
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=0.5)
        yield
    except Exception:
        engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
        engine.fast_forward(125.0)
        server = create_server(host="127.0.0.1", port=8000, engine=engine)
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        time.sleep(0.3)
        yield
        server.shutdown()
        server.server_close()


def _request(method: str, path: str, data: dict = None):
    url = f"{SERVER_BASE}{path}"
    headers = {"Content-Type": "application/json"} if data else {}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=5) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def test_fast_forward_endpoint():
    status, body = _request("POST", "/api/fast_forward", {"seconds": 30.0})
    assert status == 200
    assert body.get("status") == "fast_forwarded"
    assert body.get("advanced_seconds") == 30.0
    assert "timestamp" in body
    assert "gate_state" in body


def test_config_get_and_patch_thresholds():
    # 1. GET /api/config
    status, cfg = _request("GET", "/api/config")
    assert status == 200
    assert "sla_thresholds" in cfg
    assert "reliability_gate" in cfg
    assert "latency_ms" in cfg["sla_thresholds"]

    # 2. PATCH /api/config
    patch_payload = {
        "sla_thresholds": {
            "latency_ms": 75.0,
            "packet_loss_pct": 3.5,
        },
        "reliability_gate": {
            "drift_alpha": 0.08,
            "min_points": 20,
        },
    }
    status, updated = _request("PATCH", "/api/config", patch_payload)
    assert status == 200
    assert updated.get("status") == "updated"
    assert updated["sla_thresholds"]["latency_ms"] == 75.0
    assert updated["sla_thresholds"]["packet_loss_pct"] == 3.5
    assert updated["reliability_gate"]["drift_alpha"] == 0.08
    assert updated["reliability_gate"]["min_points"] == 20

    # 3. Verify GET returns updated values
    status, verified = _request("GET", "/api/config")
    assert verified["sla_thresholds"]["latency_ms"] == 75.0
    assert verified["reliability_gate"]["min_points"] == 20


def test_custom_telemetry_ingestion():
    point = {
        "timestamp": 1729000000.0,
        "node_id": "spine-01",
        "interface_id": "eth0",
        "metric_id": "rtt_ms",
        "value": 188.0,
        "quality": "good",
    }
    status, res = _request("POST", "/api/telemetry/ingest", {"points": [point]})
    assert status == 200
    assert res.get("status") == "ingested"
    assert res.get("count") == 1
    assert "gate_state" in res


def test_runbooks_list_endpoint():
    status, res = _request("GET", "/api/runbooks")
    assert status == 200
    assert res.get("total", 0) >= 9
    assert len(res.get("runbooks", [])) >= 9
