"""Durable SQLite storage engine for PRECURSOR.

Provides persistent relational storage and querying for:
- Incidents with full lifecycle (first_seen, last_seen, resolved_at, acknowledged_at).
- Telemetry history across time windows.
- Reliability gate decisions and transitions over time.
- Copilot queries, explanations, and runbook references.
- Claim verifications and verdicts.
- Operational notifications and event feed.
"""

import os
import sqlite3
import json
import time
from typing import Dict, List, Optional, Any, Tuple


class DatabaseManager:
    """Thread-safe SQLite database manager for PRECURSOR operations."""

    def __init__(self, db_path: str = "data/precursor.db"):
        if not os.path.isabs(db_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.db_path = os.path.join(base_dir, db_path)
        else:
            self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        return conn

    def _init_schema(self):
        """Create database tables and indices if not present."""
        with self._get_connection() as conn:
            # 1. Incidents Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    is_active_fault INTEGER NOT NULL,
                    predicted_horizon_minutes INTEGER,
                    primary_metrics TEXT NOT NULL,
                    supporting_signals TEXT NOT NULL,
                    gate_state TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    detected_at REAL NOT NULL,
                    first_seen REAL NOT NULL,
                    last_seen REAL NOT NULL,
                    resolved_at REAL,
                    status TEXT NOT NULL,
                    interface_id TEXT DEFAULT 'eth0',
                    evidence_summary TEXT,
                    source TEXT DEFAULT 'synthetic',
                    scenario_type TEXT,
                    seed INTEGER
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_detected_at ON incidents(detected_at DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity)")

            # 2. Telemetry History Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    node_id TEXT NOT NULL,
                    interface_id TEXT NOT NULL,
                    metric_id TEXT NOT NULL,
                    value REAL,
                    unit TEXT,
                    quality TEXT NOT NULL,
                    source TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_telem_metric_ts ON telemetry_history(metric_id, timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_telem_ts ON telemetry_history(timestamp DESC)")

            # 3. Gate History Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS gate_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    state TEXT NOT NULL,
                    sensor_health_score REAL,
                    drift_score REAL,
                    residual_error_score REAL,
                    reasons TEXT,
                    immediate_alerts_active INTEGER,
                    source TEXT DEFAULT 'synthetic'
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_gate_ts ON gate_history(timestamp DESC)")

            # 4. Copilot Records Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS copilot_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    incident_id TEXT,
                    prompt TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    hypotheses TEXT,
                    diagnostic_commands TEXT,
                    runbook_ids TEXT,
                    model_used TEXT,
                    source TEXT DEFAULT 'offline'
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_copilot_ts ON copilot_records(timestamp DESC)")

            # 5. Claim Verifications Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS claim_verifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    incident_id TEXT,
                    statement TEXT NOT NULL,
                    verdict TEXT NOT NULL,
                    metric_id TEXT NOT NULL,
                    claimed_value REAL,
                    observed_value REAL,
                    tolerance_pct REAL,
                    explanation TEXT,
                    source TEXT DEFAULT 'verifier'
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_claims_ts ON claim_verifications(timestamp DESC)")

            # 6. Operational Events / Notifications Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS operational_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    related_incident_id TEXT,
                    is_read INTEGER DEFAULT 0
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON operational_events(timestamp DESC)")
            conn.execute("UPDATE operational_events SET severity = REPLACE(severity, 'IncidentSeverity.', '') WHERE severity LIKE 'IncidentSeverity.%'")
            conn.execute("UPDATE incidents SET severity = REPLACE(severity, 'IncidentSeverity.', '') WHERE severity LIKE 'IncidentSeverity.%'")
            conn.commit()

    # --- Telemetry History ---
    def record_telemetry_batch(self, points: List[Any], source: str = "synthetic"):
        """Batch insert telemetry points."""
        if not points:
            return
        records = []
        for p in points:
            val = p.value if hasattr(p, "value") else p.get("value")
            ts = p.timestamp if hasattr(p, "timestamp") else p.get("timestamp", time.time())
            node_id = p.node_id if hasattr(p, "node_id") else p.get("node_id", "gateway-01")
            if_id = p.interface_id if hasattr(p, "interface_id") else p.get("interface_id", "eth0")
            metric_id = p.metric_id if hasattr(p, "metric_id") else p.get("metric_id", "unknown")
            unit = p.unit if hasattr(p, "unit") else p.get("unit", "")
            quality = p.quality if hasattr(p, "quality") else p.get("quality", "good")
            if hasattr(quality, "value"):
                quality = quality.value
            records.append((ts, node_id, if_id, metric_id, val, unit, str(quality), source))

        with self._get_connection() as conn:
            conn.executemany("""
                INSERT INTO telemetry_history (timestamp, node_id, interface_id, metric_id, value, unit, quality, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, records)
            conn.commit()

    def get_telemetry_window(
        self,
        start_time: float,
        end_time: float,
        metric_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """Query historical telemetry points in a bounded time interval."""
        with self._get_connection() as conn:
            if metric_id:
                cursor = conn.execute("""
                    SELECT timestamp, node_id, interface_id, metric_id, value, unit, quality, source
                    FROM telemetry_history
                    WHERE timestamp >= ? AND timestamp <= ? AND metric_id = ?
                    ORDER BY timestamp ASC LIMIT ?
                """, (start_time, end_time, metric_id, limit))
            else:
                cursor = conn.execute("""
                    SELECT timestamp, node_id, interface_id, metric_id, value, unit, quality, source
                    FROM telemetry_history
                    WHERE timestamp >= ? AND timestamp <= ?
                    ORDER BY timestamp ASC LIMIT ?
                """, (start_time, end_time, limit))
            return [dict(r) for r in cursor.fetchall()]

    # --- Incidents ---
    def upsert_incident(self, inc_data: Dict[str, Any], source: str = "synthetic") -> str:
        """Insert a newly detected incident or update an existing active incident."""
        inc_id = inc_data["id"]
        now = inc_data.get("detected_at", time.time())

        raw_sev = inc_data.get("severity", "WARNING")
        sev = getattr(raw_sev, "value", str(raw_sev)).replace("IncidentSeverity.", "").upper()
        if sev not in ("CRITICAL", "WARNING", "INFO"):
            sev = "WARNING"

        gate_st = inc_data.get("gate_state", "PREDICT")
        gate_st_str = getattr(gate_st, "value", str(gate_st)).replace("GateState.", "").upper()

        with self._get_connection() as conn:
            existing = conn.execute("SELECT id, first_seen, status FROM incidents WHERE id = ?", (inc_id,)).fetchone()
            if existing:
                # Update last_seen and evidence
                status = inc_data.get("status", existing["status"])
                resolved_at = now if status == "RESOLVED" else None
                conn.execute("""
                    UPDATE incidents
                    SET last_seen = ?,
                        evidence_summary = ?,
                        gate_state = ?,
                        severity = ?,
                        status = ?,
                        resolved_at = COALESCE(resolved_at, ?)
                    WHERE id = ?
                """, (
                    now,
                    json.dumps(inc_data.get("evidence_summary", {})),
                    gate_st_str,
                    sev,
                    status,
                    resolved_at,
                    inc_id,
                ))
            else:
                # Insert new incident
                first_seen = now
                conn.execute("""
                    INSERT INTO incidents (
                        id, title, is_active_fault, predicted_horizon_minutes,
                        primary_metrics, supporting_signals, gate_state, severity,
                        detected_at, first_seen, last_seen, resolved_at, status,
                        interface_id, evidence_summary, source, scenario_type, seed
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    inc_id,
                    inc_data["title"],
                    1 if inc_data.get("is_active_fault") else 0,
                    inc_data.get("predicted_horizon_minutes"),
                    json.dumps(inc_data.get("primary_metrics", [])),
                    json.dumps(inc_data.get("supporting_signals", [])),
                    gate_st_str,
                    sev,
                    now,
                    first_seen,
                    now,
                    None,
                    inc_data.get("status", "ACTIVE"),
                    inc_data.get("interface_id") or "server-nic",
                    json.dumps(inc_data.get("evidence_summary", {})),
                    source,
                    inc_data.get("scenario_type"),
                    inc_data.get("seed"),
                ))

                # Add a notification event for new warning/critical incident
                if sev in ("CRITICAL", "WARNING"):
                    iface_label = inc_data.get("interface_id") or "server-nic"
                    conn.execute("""
                        INSERT INTO operational_events (timestamp, event_type, title, message, severity, related_incident_id)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        now,
                        "INCIDENT_DETECTED",
                        inc_data["title"],
                        f"New {sev} event on {iface_label}: {inc_data['title']}",
                        sev,
                        inc_id,
                    ))

            conn.commit()
            return inc_id

    def update_incident_status(self, incident_id: str, new_status: str) -> bool:
        """Acknowledge or resolve an incident."""
        now = time.time()
        with self._get_connection() as conn:
            resolved_at = now if new_status.upper() == "RESOLVED" else None
            cursor = conn.execute("""
                UPDATE incidents
                SET status = ?,
                    resolved_at = CASE WHEN ? IS NOT NULL THEN ? ELSE resolved_at END
                WHERE id = ?
            """, (new_status.upper(), resolved_at, resolved_at, incident_id))
            if cursor.rowcount > 0:
                conn.execute("""
                    INSERT INTO operational_events (timestamp, event_type, title, message, severity, related_incident_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    now,
                    f"INCIDENT_{new_status.upper()}",
                    f"Incident {incident_id} marked as {new_status.upper()}",
                    f"Incident {incident_id} transitioned to {new_status.upper()}",
                    "INFO",
                    incident_id,
                ))
                conn.commit()
                return True
            return False

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single incident with deserialized fields."""
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
            if not row:
                return None
            return self._format_incident_row(row)

    def list_incidents(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        source: Optional[str] = None,
        interface_id: Optional[str] = None,
        is_active_fault: Optional[bool] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Query filtered and paginated historical incidents."""
        query = "SELECT * FROM incidents WHERE 1=1"
        params: List[Any] = []

        if status and status.upper() != "ALL":
            query += " AND status = ?"
            params.append(status.upper())
        if severity and severity.upper() != "ALL":
            query += " AND severity = ?"
            params.append(severity.upper())
        if source and source.upper() != "ALL":
            query += " AND source = ?"
            params.append(source.lower())
        if interface_id:
            query += " AND interface_id = ?"
            params.append(interface_id)
        if is_active_fault is not None:
            query += " AND is_active_fault = ?"
            params.append(1 if is_active_fault else 0)
        if start_time is not None:
            query += " AND detected_at >= ?"
            params.append(start_time)
        if end_time is not None:
            query += " AND detected_at <= ?"
            params.append(end_time)

        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        with self._get_connection() as conn:
            total = conn.execute(count_query, params).fetchone()[0]
            query += " ORDER BY detected_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            rows = conn.execute(query, params).fetchall()
            return [self._format_incident_row(r) for r in rows], total

    def _format_incident_row(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        try:
            d["primary_metrics"] = json.loads(d.get("primary_metrics") or "[]")
        except Exception:
            d["primary_metrics"] = []
        try:
            d["supporting_signals"] = json.loads(d.get("supporting_signals") or "[]")
        except Exception:
            d["supporting_signals"] = []
        try:
            d["evidence_summary"] = json.loads(d.get("evidence_summary") or "{}")
        except Exception:
            d["evidence_summary"] = {}

        # Calculate duration if available
        first = d.get("first_seen")
        last = d.get("resolved_at") or d.get("last_seen")
        if first and last and last >= first:
            d["duration_seconds"] = round(last - first, 1)
        else:
            d["duration_seconds"] = None

        d["is_active_fault"] = bool(d.get("is_active_fault"))
        return d

    # --- Gate History ---
    def record_gate_decision(self, gate_decision: Any, timestamp: float, source: str = "synthetic"):
        """Record reliability gate state decision."""
        state = gate_decision.state.value if hasattr(gate_decision.state, "value") else str(gate_decision.state)
        sh = getattr(gate_decision, "sensor_health_score", 1.0)
        drift = getattr(gate_decision, "drift_score", 0.0)
        res = getattr(gate_decision, "residual_error_score", 0.0)
        reasons = json.dumps(getattr(gate_decision, "reasons", []))
        alerts = 1 if getattr(gate_decision, "immediate_alerts_active", False) else 0

        with self._get_connection() as conn:
            # Check last state to record state transitions as notifications
            last_row = conn.execute("SELECT state FROM gate_history ORDER BY id DESC LIMIT 1").fetchone()
            if last_row and last_row["state"] != state:
                conn.execute("""
                    INSERT INTO operational_events (timestamp, event_type, title, message, severity)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    timestamp,
                    "GATE_STATE_TRANSITION",
                    f"Reliability Gate: {last_row['state']} -> {state}",
                    f"Gate transitioned from {last_row['state']} to {state}. Reasons: {reasons}",
                    "WARNING" if state != "PREDICT" else "INFO",
                ))

            conn.execute("""
                INSERT INTO gate_history (
                    timestamp, state, sensor_health_score, drift_score,
                    residual_error_score, reasons, immediate_alerts_active, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (timestamp, state, sh, drift, res, reasons, alerts, source))
            conn.commit()

    def get_gate_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve historical gate state decisions."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM gate_history ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            out = []
            for r in rows:
                item = dict(r)
                try:
                    item["reasons"] = json.loads(item.get("reasons") or "[]")
                except Exception:
                    item["reasons"] = []
                out.append(item)
            return out

    # --- Copilot & Claim Verification ---
    def record_copilot_query(
        self,
        prompt: str,
        response_dict: Dict[str, Any],
        incident_id: Optional[str] = None,
        source: str = "offline",
    ) -> int:
        """Save a user-triggered Copilot inquiry and its generated advice."""
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO copilot_records (
                    timestamp, incident_id, prompt, summary, hypotheses,
                    diagnostic_commands, runbook_ids, model_used, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now,
                incident_id,
                prompt,
                response_dict.get("summary", ""),
                json.dumps(response_dict.get("hypotheses", [])),
                json.dumps(response_dict.get("diagnostic_commands", [])),
                json.dumps(response_dict.get("matched_runbooks", [])),
                response_dict.get("model_used", "offline-matcher"),
                source,
            ))
            conn.commit()
            return cursor.lastrowid

    def list_copilot_records(self, incident_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve stored Copilot investigation records."""
        with self._get_connection() as conn:
            if incident_id:
                cursor = conn.execute("""
                    SELECT * FROM copilot_records WHERE incident_id = ? ORDER BY timestamp DESC LIMIT ?
                """, (incident_id, limit))
            else:
                cursor = conn.execute("SELECT * FROM copilot_records ORDER BY timestamp DESC LIMIT ?", (limit,))
            out = []
            for r in cursor.fetchall():
                d = dict(r)
                try:
                    d["hypotheses"] = json.loads(d.get("hypotheses") or "[]")
                except Exception:
                    d["hypotheses"] = []
                try:
                    d["diagnostic_commands"] = json.loads(d.get("diagnostic_commands") or "[]")
                except Exception:
                    d["diagnostic_commands"] = []
                try:
                    d["runbook_ids"] = json.loads(d.get("runbook_ids") or "[]")
                except Exception:
                    d["runbook_ids"] = []
                out.append(d)
            return out

    def record_claim_verification(
        self,
        statement: str,
        verdict: str,
        metric_id: str,
        claimed_value: Optional[float],
        observed_value: Optional[float],
        tolerance_pct: float,
        explanation: str,
        incident_id: Optional[str] = None,
    ) -> int:
        """Save numerical claim verification record."""
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO claim_verifications (
                    timestamp, incident_id, statement, verdict, metric_id,
                    claimed_value, observed_value, tolerance_pct, explanation
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now,
                incident_id,
                statement,
                verdict.upper(),
                metric_id,
                claimed_value,
                observed_value,
                tolerance_pct,
                explanation,
            ))
            conn.commit()
            return cursor.lastrowid

    def list_claim_verifications(self, incident_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """List historical claim verifications."""
        with self._get_connection() as conn:
            if incident_id:
                cursor = conn.execute("""
                    SELECT * FROM claim_verifications WHERE incident_id = ? ORDER BY timestamp DESC LIMIT ?
                """, (incident_id, limit))
            else:
                cursor = conn.execute("SELECT * FROM claim_verifications ORDER BY timestamp DESC LIMIT ?", (limit,))
            return [dict(r) for r in cursor.fetchall()]

    # --- Operational Events / Notifications ---
    def list_events(self, limit: int = 50, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Retrieve real operational events feed."""
        with self._get_connection() as conn:
            if unread_only:
                cursor = conn.execute("SELECT * FROM operational_events WHERE is_read = 0 ORDER BY timestamp DESC LIMIT ?", (limit,))
            else:
                cursor = conn.execute("SELECT * FROM operational_events ORDER BY timestamp DESC LIMIT ?", (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def mark_event_read(self, event_id: int) -> bool:
        """Mark an operational event as read."""
        with self._get_connection() as conn:
            cursor = conn.execute("UPDATE operational_events SET is_read = 1 WHERE id = ?", (event_id,))
            conn.commit()
            return cursor.rowcount > 0

    def mark_all_events_read(self) -> int:
        """Mark all operational events as read."""
        with self._get_connection() as conn:
            cursor = conn.execute("UPDATE operational_events SET is_read = 1 WHERE is_read = 0")
            conn.commit()
            return cursor.rowcount

    # --- History Summary ---
    def get_history_summary(self) -> Dict[str, Any]:
        """Compute aggregate statistics over recorded history."""
        with self._get_connection() as conn:
            total_incidents = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
            active_incidents = conn.execute("SELECT COUNT(*) FROM incidents WHERE status = 'ACTIVE'").fetchone()[0]
            resolved_incidents = conn.execute("SELECT COUNT(*) FROM incidents WHERE status = 'RESOLVED'").fetchone()[0]
            ack_incidents = conn.execute("SELECT COUNT(*) FROM incidents WHERE status = 'ACKNOWLEDGED'").fetchone()[0]

            min_max = conn.execute("SELECT MIN(detected_at), MAX(detected_at) FROM incidents").fetchone()
            earliest_ts = min_max[0]
            latest_ts = min_max[1]

            recent_event = conn.execute("SELECT * FROM operational_events ORDER BY timestamp DESC LIMIT 1").fetchone()
            recent_dict = dict(recent_event) if recent_event else None

            total_telem_pts = conn.execute("SELECT COUNT(*) FROM telemetry_history").fetchone()[0]

            return {
                "total_incidents": total_incidents,
                "active_incidents": active_incidents,
                "resolved_incidents": resolved_incidents,
                "acknowledged_incidents": ack_incidents,
                "earliest_timestamp": earliest_ts,
                "latest_timestamp": latest_ts,
                "total_telemetry_points": total_telem_pts,
                "most_recent_event": recent_dict,
            }
