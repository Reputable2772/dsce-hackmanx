"""Integration tests for PRECURSOR Dynamic Systems and Peer Probing REST API."""

import json
import time
import threading
import urllib.request
import urllib.error
import pytest

from precursor.server import create_server, PrecursorApiHandler
from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType
from precursor.systems.manager import SystemProbeManager


@pytest.fixture(scope="module")
def systems_api_server(tmp_path_factory):
    """Start test server on port 8003 with isolated systems manager storage."""
    temp_dir = tmp_path_factory.mktemp("systems_data")
    persistence_file = str(temp_dir / "test_systems.json")

    mgr = SystemProbeManager(persistence_path=persistence_file, auto_start_worker=False)
    PrecursorApiHandler.system_manager = mgr

    engine = PrecursorEngine(scenario_type=ScenarioType.NORMAL_BASELINE, seed=42)
    engine.step_simulation()

    server = create_server(host="127.0.0.1", port=8003, engine=engine)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.2)

    yield "http://127.0.0.1:8003", mgr
    server.shutdown()
    server.server_close()


def _request(url: str, method: str = "GET", data: dict | None = None):
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def test_list_systems_initial(systems_api_server):
    url, _ = systems_api_server
    status, body = _request(f"{url}/api/systems")
    assert status == 200
    assert "systems" in body
    assert body["count"] >= 1
    # Local host must be present
    local = next((s for s in body["systems"] if s.get("is_local")), None)
    assert local is not None
    assert local["id"] == "local-host"
    assert local["probe_type"] == "loopback"
    assert local["reachability"] == "reachable"
    assert local["latency_ms"] is not None
    assert "remote_cpu" in local["unsupported_metrics"]


def test_topology_systems_view(systems_api_server):
    url, _ = systems_api_server
    # Default topology returns spine-leaf fabric
    status, body = _request(f"{url}/api/topology")
    assert status == 200
    assert body["id"] == "precursor-fabric-01"

    # Systems view returns dynamic systems topology
    status, body = _request(f"{url}/api/topology?view=systems")
    assert status == 200
    assert body["id"] == "precursor-systems-01"
    assert body["view"] == "systems"
    assert any(n["id"] == "local-host" for n in body["nodes"])


def test_add_and_probe_peer(systems_api_server):
    url, _ = systems_api_server
    # Register peer using secondary loopback address to verify real probe execution
    payload = {
        "name": "Friend's Computer 2",
        "address": "127.0.0.10",
        "description": "Secondary test node in lab",
        "probe_enabled": True,
        "tags": ["peer", "lab"],
    }
    status, body = _request(f"{url}/api/systems", method="POST", data=payload)
    assert status == 201
    peer_id = body["id"]
    assert body["name"] == "Friend's Computer 2"
    assert body["address"] == "127.0.0.10"
    assert body["is_local"] is False
    assert body["probe_enabled"] is True

    # Topology should now contain nodes and links
    status, topo = _request(f"{url}/api/topology?view=systems")
    assert status == 200
    node_ids = [n["id"] for n in topo["nodes"]]
    assert "local-host" in node_ids
    assert peer_id in node_ids
    assert len(topo["links"]) >= 1


def test_invalid_peer_registration(systems_api_server):
    url, _ = systems_api_server
    # Missing fields
    status, body = _request(f"{url}/api/systems", method="POST", data={"name": "Bad"})
    assert status == 400

    # Invalid IP address / hostname injection
    status, body = _request(f"{url}/api/systems", method="POST", data={
        "name": "Malicious Node",
        "address": "127.0.0.1; rm -rf /",
    })
    assert status == 400
    assert "invalid" in body["error"].lower()


def test_update_and_toggle_peer(systems_api_server):
    url, _ = systems_api_server
    # Add peer to update
    payload = {
        "name": "Peer Beta",
        "address": "127.0.0.2",
        "description": "Initial description",
        "probe_enabled": True,
    }
    status, created = _request(f"{url}/api/systems", method="POST", data=payload)
    peer_id = created["id"]

    # Toggle probe
    status, toggled = _request(f"{url}/api/systems/{peer_id}/toggle", method="POST")
    assert status == 200
    assert toggled["probe_enabled"] is False

    # Update description and name
    update_payload = {
        "name": "Peer Beta Updated",
        "description": "Updated notes",
    }
    status, updated = _request(f"{url}/api/systems/{peer_id}", method="PATCH", data=update_payload)
    assert status == 200
    assert updated["name"] == "Peer Beta Updated"
    assert updated["description"] == "Updated notes"


def test_delete_peer(systems_api_server):
    url, _ = systems_api_server
    # Cannot delete local host
    status, body = _request(f"{url}/api/systems/local-host", method="DELETE")
    assert status == 400
    assert "cannot remove local host" in body["error"].lower()

    # Add a peer and delete it
    payload = {
        "name": "Temporary Peer",
        "address": "127.0.0.3",
    }
    status, created = _request(f"{url}/api/systems", method="POST", data=payload)
    peer_id = created["id"]

    status, deleted = _request(f"{url}/api/systems/{peer_id}", method="DELETE")
    assert status == 200
    assert deleted["status"] == "deleted"

    # Confirm not in list
    status, _ = _request(f"{url}/api/systems/{peer_id}")
    assert status == 404
