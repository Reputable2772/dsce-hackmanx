"""Unit tests for IncidentDB, packet storage, dynamic system discovery, and topology APIs."""

import os
import tempfile
import time
import pytest
from precursor.storage.incident_db import IncidentDB, StoredPacketSample
from precursor.storage.system_registry import SystemRegistry
from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType
from precursor.server import create_server
import urllib.request
import json
import threading


@pytest.fixture
def temp_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.remove(path)


def test_incident_db_envelope_and_packet_storage(temp_db):
    """Verify IncidentDB persists full forensic envelope and individual packet records."""
    db = IncidentDB(temp_db)

    packet_samples = [
        {
            "packet_id": "pkt-001",
            "timestamp": 1700000000.0,
            "timestamp_iso": "2023-11-14T22:13:20Z",
            "source": "10.0.1.10",
            "source_port": 54321,
            "destination": "1.1.1.1",
            "destination_port": 80,
            "protocol": "TCP",
            "packet_size_bytes": 64,
            "ttl": 64,
            "flags": ["SYN", "ACK"],
            "metric_id": "latency_ms",
            "value": 142.5,
            "unit": "ms",
            "quality": "GOOD",
            "labels": {"iface": "eth0"},
            "raw_details": {"seq": 1001, "ack": 2001},
        },
        {
            "packet_id": "pkt-002",
            "timestamp": 1700000005.0,
            "timestamp_iso": "2023-11-14T22:13:25Z",
            "source": "10.0.1.10",
            "source_port": 54321,
            "destination": "1.1.1.1",
            "destination_port": 80,
            "protocol": "IP",
            "packet_size_bytes": 1420,
            "ttl": 58,
            "flags": ["ACK"],
            "metric_id": "drops_in",
            "value": 12.0,
            "unit": "drops",
            "quality": "GOOD",
            "labels": {"iface": "eth0"},
            "raw_details": {"error": "buffer_overflow"},
        },
    ]

    inc_id = db.record_incident(
        incident_id="inc-test-001",
        title="Simulated Hardware Queue Overflow",
        severity="CRITICAL",
        source="synthetic",
        category="BUFFER_OVERFLOW",
        predicted_horizon_minutes=5,
        is_active_fault=False,
        gate_state="PREDICT",
        node_id="edge-gateway-01",
        interface_id="eth0",
        primary_metrics=["latency_ms", "drops_in"],
        telemetry_snapshot={"latency_ms": 142.5, "drops_in": 12.0},
        packet_samples=packet_samples,
        copilot_response=None,
    )
    assert inc_id == "inc-test-001"

    # Verify list_incidents
    listing = db.list_incidents(severity="CRITICAL")
    assert listing["total"] == 1
    assert listing["incidents"][0]["id"] == "inc-test-001"
    assert listing["incidents"][0]["packet_samples_count"] == 2
    assert listing["incidents"][0]["severity"] == "CRITICAL"

    # Verify get_incident full envelope
    envelope = db.get_incident("inc-test-001")
    assert envelope is not None
    assert envelope["id"] == "inc-test-001"
    assert len(envelope["packet_samples"]) == 2
    assert envelope["packet_samples"][0]["source"] == "10.0.1.10"
    assert envelope["packet_samples"][0]["destination"] == "1.1.1.1"
    assert envelope["packet_samples"][0]["destination_port"] == 80
    assert envelope["packet_samples"][0]["flags"] == ["SYN", "ACK"]
    assert envelope["packet_samples"][0]["raw_details"]["seq"] == 1001

    # Verify relational get_incident_packets
    packets = db.get_incident_packets("inc-test-001")
    assert len(packets) == 2
    assert packets[0]["packet_id"] == "pkt-001"
    assert packets[0]["source_port"] == 54321
    assert packets[0]["protocol"] == "TCP"
    assert packets[0]["flags"] == ["SYN", "ACK"]
    assert packets[1]["metric_id"] == "drops_in"
    assert packets[1]["raw_details"]["error"] == "buffer_overflow"

    # Verify status update
    updated = db.update_status("inc-test-001", "RESOLVED")
    assert updated is True
    envelope_updated = db.get_incident("inc-test-001")
    assert envelope_updated["status"] == "RESOLVED"


def test_system_registry_and_topology_graph(temp_db):
    """Verify dynamic system discovery and topology graph compilation."""
    registry = SystemRegistry(temp_db)

    # Core engine node is pre-seeded
    systems = registry.get_systems()
    assert len(systems) >= 1
    assert any(s["id"] == "sys-core-engine" for s in systems)

    # Simulate client access from web browser
    sys_id_1 = registry.register_access(
        ip_address="192.168.1.105",
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0",
        endpoint="/api/status",
    )
    assert sys_id_1 == "sys-192-168-1-105"

    # Repeat access increments counter
    sys_id_repeat = registry.register_access(
        ip_address="192.168.1.105",
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0",
        endpoint="/api/predictions",
    )
    assert sys_id_repeat == sys_id_1

    systems = registry.get_systems()
    client_node = next(s for s in systems if s["id"] == "sys-192-168-1-105")
    assert client_node["request_count"] == 2
    assert client_node["node_type"] == "endpoint"

    # Register gateway and link
    registry.register_node(
        node_id="sys-gateway-01",
        name="Gateway Router 01",
        node_type="router",
        ip_address="10.0.0.1",
        status="warning",
        metrics={"latencyMs": 15.2, "packetLossPct": 1.5},
        position=[10.0, 5.0, 0.0],
    )
    registry.register_link(
        source_id="sys-core-engine",
        target_id="sys-gateway-01",
        status="active",
        latency_ms=15.2,
        packet_loss_pct=1.5,
    )

    # Verify graph matches frontend NetworkTopologyData schema
    graph = registry.get_topology_graph()
    assert graph["id"] == "topology-dynamic-live"
    assert "nodes" in graph and "links" in graph
    node_ids = {n["id"] for n in graph["nodes"]}
    assert "sys-core-engine" in node_ids
    assert "sys-192-168-1-105" in node_ids
    assert "sys-gateway-01" in node_ids

    # Verify link structure
    links = graph["links"]
    assert any(l["sourceId"] == "sys-core-engine" and l["targetId"] == "sys-gateway-01" for l in links)
    link = next(l for l in links if l["sourceId"] == "sys-core-engine" and l["targetId"] == "sys-gateway-01")
    assert link["latencyMs"] == 15.2
    assert link["packetLossPct"] == 1.5


def test_rest_api_incident_and_topology_endpoints():
    """Verify live HTTP endpoints for incidents, packet retrieval, and topology graph."""
    engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    # Fast forward to generate predictions and trigger incident recording
    engine.fast_forward(300.0)

    # Spawn test server on random ephemeral port
    server = create_server(host="127.0.0.1", port=0, engine=engine)
    port = server.server_address[1]
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    base_url = f"http://127.0.0.1:{port}"

    try:
        # 1. Test GET /api/topology/systems
        req = urllib.request.Request(f"{base_url}/api/topology/systems")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            assert "nodes" in data and "links" in data
            assert len(data["nodes"]) >= 1

        # 2. Test GET /api/systems
        req = urllib.request.Request(f"{base_url}/api/systems")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            assert "systems" in data
            assert data["total"] >= 1

        # 3. Test GET /api/incidents/history
        req = urllib.request.Request(f"{base_url}/api/incidents/history?limit=10")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            assert "incidents" in data
            assert "total" in data

            if data["incidents"]:
                test_inc_id = data["incidents"][0]["id"]

                # 4. Test GET /api/incidents/:id (full envelope with packets)
                inc_req = urllib.request.Request(f"{base_url}/api/incidents/{test_inc_id}")
                with urllib.request.urlopen(inc_req) as inc_resp:
                    assert inc_resp.status == 200
                    inc_data = json.loads(inc_resp.read().decode("utf-8"))
                    assert inc_data["id"] == test_inc_id
                    assert "packet_samples" in inc_data
                    assert len(inc_data["packet_samples"]) > 0

                # 5. Test GET /api/incidents/:id/packets
                pkt_req = urllib.request.Request(f"{base_url}/api/incidents/{test_inc_id}/packets?limit=5")
                with urllib.request.urlopen(pkt_req) as pkt_resp:
                    assert pkt_resp.status == 200
                    pkt_data = json.loads(pkt_resp.read().decode("utf-8"))
                    assert pkt_data["incident_id"] == test_inc_id
                    assert len(pkt_data["packets"]) > 0
                    p0 = pkt_data["packets"][0]
                    assert "source" in p0 and "destination" in p0 and "protocol" in p0

                # 6. Test POST /api/incidents/:id/status
                status_payload = json.dumps({"status": "INVESTIGATING"}).encode("utf-8")
                post_req = urllib.request.Request(
                    f"{base_url}/api/incidents/{test_inc_id}/status",
                    data=status_payload,
                    headers={"Content-Type": "application/json"},
                )
                with urllib.request.urlopen(post_req) as post_resp:
                    assert post_resp.status == 200
                    status_data = json.loads(post_resp.read().decode("utf-8"))
                    assert status_data["status"] == "updated"
                    assert status_data["new_status"] == "INVESTIGATING"

    finally:
        server.shutdown()
        server.server_close()
