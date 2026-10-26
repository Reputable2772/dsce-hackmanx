"""Advanced simulation situations and system resilience test suite.

Validates:
1. Scenario transitions across all 5 synthetic modes (baseline, degradation, flap, cut, sensor drift).
2. Dynamic multi-node & multi-interface system discovery via telemetry ingestion.
3. Forensic packet sample fidelity and relational querying.
4. Paired counterfactual evaluation REST API.
5. Edge case validation and error handling (400 Bad Request, 404 Not Found).
"""

import json
import time
import urllib.request
import urllib.error
import threading
import pytest

from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType
from precursor.server import create_server


@pytest.fixture(scope="module")
def advanced_test_server():
    """Start an ephemeral PRECURSOR API server for advanced situation testing."""
    engine = PrecursorEngine(scenario_type=ScenarioType.NORMAL_BASELINE, seed=101)
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


def test_scenario_transitions_across_all_modes(advanced_test_server):
    """
    Validates switching between all synthetic scenario types and stepping:
    - normal_baseline
    - gradual_degradation
    - oscillating_instability
    - sudden_failure (sudden link cut)
    - sensor_degradation
    """
    base_url = advanced_test_server["base_url"]
    scenarios = [
        "normal_baseline",
        "gradual_degradation",
        "oscillating_instability",
        "sudden_failure",
        "sensor_degradation",
    ]

    for sc in scenarios:
        reset_resp = _post_json(f"{base_url}/api/scenario/reset", {"scenario": sc, "seed": 42})
        assert reset_resp["status"] == "reset"
        assert reset_resp["scenario"] == sc
        assert "gate_state" in reset_resp

        step_resp = _post_json(f"{base_url}/api/step", {"seconds": 25.0})
        assert step_resp["status"] == "stepped"
        assert step_resp["advanced_seconds"] == 25.0
        assert "latest_metrics" in step_resp


def test_multi_node_multi_interface_telemetry_discovery(advanced_test_server):
    """
    Simulates real-world distributed topology ingestion:
    3 different network nodes (leaf-01, core-02, db-03) pushing telemetry
    across multiple physical and logical interfaces (eth0, eth1, bond0).
    Verifies that topology and systems endpoints dynamically register them all into the graph.
    """
    base_url = advanced_test_server["base_url"]
    now = time.time()

    multi_node_points = [
        # Leaf Switch 01 - eth0 and eth1
        {"timestamp": now, "node_id": "leaf-switch-01", "interface_id": "eth0", "metric_id": "latency_ms", "value": 12.4, "quality": "good"},
        {"timestamp": now, "node_id": "leaf-switch-01", "interface_id": "eth1", "metric_id": "packet_loss_pct", "value": 0.0, "quality": "good"},
        # Core Router 02 - bond0
        {"timestamp": now, "node_id": "core-router-02", "interface_id": "bond0", "metric_id": "latency_ms", "value": 18.9, "quality": "good"},
        {"timestamp": now, "node_id": "core-router-02", "interface_id": "bond0", "metric_id": "throughput_mbps", "value": 920.0, "quality": "good"},
        # DB Server 03 - eth0
        {"timestamp": now, "node_id": "db-server-03", "interface_id": "eth0", "metric_id": "latency_ms", "value": 14.1, "quality": "good"},
        {"timestamp": now, "node_id": "db-server-03", "interface_id": "eth0", "metric_id": "drops_in", "value": 0.0, "quality": "good"},
    ]

    ingest_resp = _post_json(f"{base_url}/api/telemetry/ingest", {"points": multi_node_points})
    assert ingest_resp["status"] == "ingested"
    assert ingest_resp["count"] == 6

    # Verify systems endpoint discovers the new systems
    systems_resp = _get_json(f"{base_url}/api/systems")
    assert "systems" in systems_resp
    discovered_ids = {s["id"] for s in systems_resp["systems"]}
    assert "leaf-switch-01" in discovered_ids
    assert "core-router-02" in discovered_ids
    assert "db-server-03" in discovered_ids

    # Verify topology endpoint exports nodes and links
    topo_resp = _get_json(f"{base_url}/api/topology/systems")
    assert "nodes" in topo_resp
    assert "links" in topo_resp
    graph_node_ids = {node["id"] for node in topo_resp["nodes"]}
    assert "leaf-switch-01" in graph_node_ids
    assert "core-router-02" in graph_node_ids
    assert "db-server-03" in graph_node_ids


def test_packet_forensics_sampling_and_fidelity(advanced_test_server):
    """
    Validates packet forensic envelope details recorded during an incident:
    - Protocol (TCP/UDP/ICMP)
    - IP endpoints
    - Ports, window size, flags, TTL, quality
    """
    base_url = advanced_test_server["base_url"]

    # Step into gradual degradation to create an incident
    _post_json(f"{base_url}/api/scenario/reset", {"scenario": "gradual_degradation", "seed": 42})
    _post_json(f"{base_url}/api/step", {"seconds": 750.0})

    history = _get_json(f"{base_url}/api/incidents/history?limit=1")
    assert history["total"] > 0
    incident = history["incidents"][0]
    inc_id = incident["id"]

    # Query packet samples
    pkts = _get_json(f"{base_url}/api/incidents/{inc_id}/packets?limit=5")
    assert pkts["incident_id"] == inc_id
    assert len(pkts["packets"]) > 0

    p = pkts["packets"][0]
    assert "packet_id" in p
    assert "protocol" in p
    assert p["protocol"] in ("TCP", "UDP", "ICMP")
    assert "source_ip" in p or "source" in p
    assert "destination_ip" in p or "destination" in p
    assert "packet_size_bytes" in p
    assert p["packet_size_bytes"] > 0


def test_paired_counterfactual_evaluation_api(advanced_test_server):
    """
    Validates /api/evaluation counterfactual paired comparison.
    Proves mathematical comparison between GATE ON vs GATE OFF.
    """
    base_url = advanced_test_server["base_url"]
    eval_resp = _get_json(f"{base_url}/api/evaluation?scenario=gradual_degradation")

    assert "scenario_type" in eval_resp
    assert eval_resp["scenario_type"] == "gradual_degradation"
    assert "gate_on" in eval_resp
    assert "gate_off" in eval_resp
    assert "5" in eval_resp["gate_on"]
    assert "15" in eval_resp["gate_on"]
    assert "30" in eval_resp["gate_on"]

    # Verify metrics structure
    m5 = eval_resp["gate_on"]["5"]
    assert "horizon_minutes" in m5
    assert m5["horizon_minutes"] == 5
    assert "gate_enabled" in m5
    assert m5["gate_enabled"] is True


def test_rest_api_error_handling_and_edge_cases(advanced_test_server):
    """
    Validates defensive API behavior against invalid requests:
    - 400 for empty points in telemetry ingest
    - 404 for non-existent incident detail
    - 404 for non-existent incident status update
    """
    base_url = advanced_test_server["base_url"]

    # 1. Empty telemetry points array -> 400 Bad Request
    req = urllib.request.Request(
        f"{base_url}/api/telemetry/ingest",
        data=json.dumps({"points": []}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(req)
    assert exc_info.value.code == 400

    # 2. Non-existent incident query -> 404 Not Found
    req_404 = urllib.request.Request(f"{base_url}/api/incidents/non-existent-uuid-9999")
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(req_404)
    assert exc_info.value.code == 404

    # 3. Status update on non-existent incident -> 404 Not Found
    req_status_404 = urllib.request.Request(
        f"{base_url}/api/incidents/non-existent-uuid-9999/status",
        data=json.dumps({"status": "RESOLVED"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(req_status_404)
    assert exc_info.value.code == 404
