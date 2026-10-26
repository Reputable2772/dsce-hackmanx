"""Automated tests for PRECURSOR Phase 3 (Database-Backed History) and Phase 4 (Incidents & Copilot)."""

import os
import json
import time
import threading
import urllib.request
import urllib.error
import pytest

from precursor.server import create_server
from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType
from precursor.storage.database import DatabaseManager


@pytest.fixture
def test_engine(tmp_path):
    db_file = str(tmp_path / "test_precursor.db")
    engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    engine.db = DatabaseManager(db_path=db_file)
    return engine


def test_copilot_is_not_auto_triggered(test_engine):
    """Verify Phase 4 requirement: Copilot does NOT run automatically on each step."""
    snapshot = test_engine.step_simulation()
    assert snapshot.copilot_response is None, "Copilot must not automatically generate a response during step_simulation"


def test_telemetry_and_gate_persistence(test_engine):
    """Verify Phase 3 requirement: Telemetry and gate decisions are persisted to SQLite."""
    # Step simulation 5 times
    for _ in range(5):
        test_engine.step_simulation()

    # Query DB
    summary = test_engine.db.get_history_summary()
    assert summary["total_telemetry_points"] > 0
    
    gate_history = test_engine.db.get_gate_history(limit=10)
    assert len(gate_history) >= 5
    assert gate_history[0]["state"] in ("PREDICT", "DEGRADED", "ABSTAIN")


def test_incident_lifecycle_and_stable_ids(test_engine):
    """Verify Phase 4 requirement: Incidents have stable IDs and track lifecycle without duplication."""
    # Fast forward into degradation
    test_engine.fast_forward(300.0)

    snapshot = test_engine.last_snapshot
    assert snapshot is not None

    if snapshot.incidents:
        inc = snapshot.incidents[0]
        inc_id = inc.id
        # Step again
        snapshot2 = test_engine.step_simulation()
        # Ensure incident ID is stable and does not randomly regenerate on every step
        match2 = next((i for i in snapshot2.incidents if i.interface_id == inc.interface_id and i.primary_metrics == inc.primary_metrics), None)
        if match2:
            assert match2.id == inc_id, "Incident ID must be deterministic across time steps"

        # Test Acknowledge
        ok = test_engine.db.update_incident_status(inc_id, "ACKNOWLEDGED")
        assert ok is True
        db_inc = test_engine.db.get_incident(inc_id)
        assert db_inc["status"] == "ACKNOWLEDGED"

        # Test Resolve
        ok_res = test_engine.db.update_incident_status(inc_id, "RESOLVED")
        assert ok_res is True
        db_inc_res = test_engine.db.get_incident(inc_id)
        assert db_inc_res["status"] == "RESOLVED"
        assert db_inc_res["resolved_at"] is not None


def test_user_triggered_copilot_and_claim_verification(test_engine):
    """Verify Phase 4 requirement: Copilot runs on explicit operator request and records claim verification."""
    # Fast forward so we have some metrics
    test_engine.fast_forward(120.0)

    # Trigger explicit explanation
    resp = test_engine.explain_incident(incident_id="act_eth0_latency", prompt="Explain the latency issue")
    assert "summary" in resp
    assert "diagnostic_commands" in resp
    assert "claim_verifications" in resp

    # Verify recorded to DB
    copilot_records = test_engine.db.list_copilot_records(incident_id="act_eth0_latency")
    assert len(copilot_records) >= 1
    assert "Explain" in copilot_records[0]["prompt"]


def test_operational_notifications(test_engine):
    """Verify operational notifications are generated and markable as read."""
    with test_engine.db._get_connection() as conn:
        conn.execute("""
            INSERT INTO operational_events (timestamp, event_type, title, message, severity, related_incident_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (time.time(), "INCIDENT_DETECTED", "High Latency Alert", "Latency exceeded threshold", "CRITICAL", "inc_test_01"))
        conn.commit()

    events = test_engine.db.list_events(unread_only=True)
    assert len(events) >= 1
    event_id = events[0]["id"]

    # Mark as read
    marked = test_engine.db.mark_event_read(event_id)
    assert marked is True

    unread_events = test_engine.db.list_events(unread_only=True)
    assert not any(e["id"] == event_id for e in unread_events)


def _http_req(url: str, method: str = "GET", data: dict = None):
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read()
            if "json" in content_type:
                return resp.status, json.loads(raw.decode("utf-8"))
            return resp.status, raw.decode("utf-8")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw.decode("utf-8"))
        except Exception:
            return e.code, raw.decode("utf-8")


def test_history_and_export_rest_api(tmp_path):
    """Integration test: Verify History, Notifications, and Genuine CSV Export REST endpoints."""
    db_file = str(tmp_path / "test_api_precursor.db")
    engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    engine.db = DatabaseManager(db_path=db_file)

    # Step simulation to produce history
    for _ in range(5):
        engine.step_simulation()

    server = create_server(host="127.0.0.1", port=8004, engine=engine)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.3)

    try:
        base = "http://127.0.0.1:8004"

        # 1. History Summary
        status, sum_body = _http_req(f"{base}/api/history/summary")
        assert status == 200
        assert "total_incidents" in sum_body
        assert "total_telemetry_points" in sum_body

        # 2. History Incidents
        status, inc_body = _http_req(f"{base}/api/history/incidents")
        assert status == 200
        assert "incidents" in inc_body
        assert "total" in inc_body

        # 3. History Telemetry Window
        status, telem_body = _http_req(f"{base}/api/history/telemetry?start_time=0&end_time=9999999999")
        assert status == 200
        assert "points" in telem_body
        assert len(telem_body["points"]) > 0

        # 4. History Gate Decisions
        status, gate_body = _http_req(f"{base}/api/history/gate")
        assert status == 200
        assert "history" in gate_body
        assert len(gate_body["history"]) >= 5

        # 5. Operational Notifications
        status, notif_body = _http_req(f"{base}/api/notifications")
        assert status == 200
        assert "events" in notif_body

        # 6. Mark all notifications read
        status, read_body = _http_req(f"{base}/api/notifications/read", method="POST", data={"all": True})
        assert status == 200
        assert read_body["status"] == "ok"

        # 7. User-Triggered Copilot Explain
        status, copilot_body = _http_req(f"{base}/api/copilot/explain", method="POST", data={"prompt": "Diagnose current network state"})
        assert status == 200
        assert "summary" in copilot_body
        assert "hypotheses" in copilot_body

        # 8. Genuine CSV Export for Incidents
        status, csv_inc = _http_req(f"{base}/api/export/csv?type=incidents")
        assert status == 200
        assert "id,title,severity,status" in csv_inc

        # 9. Genuine CSV Export for Gate
        status, csv_gate = _http_req(f"{base}/api/export/csv?type=gate")
        assert status == 200
        assert "timestamp_iso,timestamp_epoch,state" in csv_gate

        # 10. Genuine CSV Export for Telemetry
        status, csv_telem = _http_req(f"{base}/api/export/csv?type=telemetry")
        assert status == 200
        assert "timestamp_iso" in csv_telem
        assert "metric_id" in csv_telem

    finally:
        server.shutdown()
        server.server_close()
