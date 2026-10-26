"""Persistent SQLite database for PRECURSOR Incidents, Packets, and Copilot Guidance."""

import os
import json
import sqlite3
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class StoredPacketSample(BaseModel):
    """Detailed packet or telemetry probe sample with full network metadata."""
    packet_id: str = Field(default="", description="Unique packet identifier")
    timestamp: float = Field(..., description="Sample UTC epoch timestamp")
    timestamp_iso: str = Field(..., description="Sample ISO 8601 UTC timestamp")
    source: str = Field(..., description="Source IP, interface, or node identifier")
    source_port: Optional[int] = Field(default=None, description="Source transport port")
    destination: str = Field(..., description="Destination IP, port, or target")
    destination_port: Optional[int] = Field(default=None, description="Destination transport port")
    protocol: str = Field(default="TCP", description="Network protocol: TCP, ICMP, UDP, ETH, IP")
    packet_size_bytes: Optional[int] = Field(default=None, description="Total packet length in bytes")
    ttl: Optional[int] = Field(default=None, description="IP Time To Live / Hop Limit")
    flags: List[str] = Field(default_factory=list, description="Control flags (e.g. SYN, ACK, FIN, RST, PSH)")
    metric_id: str = Field(..., description="Telemetry metric ID")
    value: Optional[float] = Field(None, description="Observed numeric reading")
    unit: str = Field(default="", description="Metric unit: ms, %, Mbps, drops, state")
    quality: str = Field(default="GOOD", description="Sensor quality flag: GOOD, STALE, INVALID, MISSING")
    labels: Dict[str, Any] = Field(default_factory=dict, description="Custom packet probe metadata")
    raw_details: Dict[str, Any] = Field(default_factory=dict, description="Raw header or socket payload metadata")


class StoredIncident(BaseModel):
    """Complete forensic record of a network incident."""
    id: str
    created_at: str
    epoch_time: float
    source: str  # "synthetic" or "live"
    title: str
    severity: str  # "CRITICAL", "WARNING", "INFO"
    status: str  # "OPEN", "INVESTIGATING", "RESOLVED", "ACKNOWLEDGED"
    category: str
    predicted_horizon_minutes: Optional[int] = Field(default=None)
    is_active_fault: bool
    gate_state: str
    node_id: str
    interface_id: str
    primary_metrics: List[str]
    telemetry_snapshot: Dict[str, Optional[float]]
    packet_samples: List[StoredPacketSample]
    copilot_summary: str
    copilot_hypotheses: List[Dict[str, Any]]
    copilot_assumptions: List[Dict[str, Any]]
    copilot_claims: List[Dict[str, Any]]
    diagnostic_commands: List[str]
    verification_steps: List[str]
    risks_and_rollback: List[str]


class IncidentDB:
    """Embedded SQLite storage for full incident history, packet traces, and copilot audits."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to data/precursor.db relative to repository root
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            data_dir = os.path.join(base_dir, "data")
            os.makedirs(data_dir, exist_ok=True)
            self.db_path = os.path.join(data_dir, "precursor.db")
        else:
            self.db_path = db_path
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Create incidents and packet_samples tables if they do not exist."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    epoch_time REAL NOT NULL,
                    source TEXT NOT NULL,
                    title TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT NOT NULL,
                    category TEXT NOT NULL,
                    predicted_horizon_minutes INTEGER,
                    is_active_fault INTEGER NOT NULL,
                    gate_state TEXT NOT NULL,
                    node_id TEXT NOT NULL,
                    interface_id TEXT NOT NULL,
                    primary_metrics TEXT NOT NULL,
                    telemetry_snapshot TEXT NOT NULL,
                    packet_samples TEXT NOT NULL,
                    copilot_summary TEXT NOT NULL,
                    copilot_hypotheses TEXT NOT NULL,
                    copilot_assumptions TEXT NOT NULL,
                    copilot_claims TEXT NOT NULL,
                    diagnostic_commands TEXT NOT NULL,
                    verification_steps TEXT NOT NULL,
                    risks_and_rollback TEXT NOT NULL,
                    raw_envelope TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS packet_samples (
                    id TEXT PRIMARY KEY,
                    incident_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    timestamp_iso TEXT NOT NULL,
                    source TEXT NOT NULL,
                    source_port INTEGER,
                    destination TEXT NOT NULL,
                    destination_port INTEGER,
                    protocol TEXT NOT NULL,
                    packet_size_bytes INTEGER,
                    ttl INTEGER,
                    flags TEXT,
                    metric_id TEXT NOT NULL,
                    value REAL,
                    unit TEXT,
                    quality TEXT NOT NULL,
                    labels TEXT,
                    raw_details TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_epoch ON incidents(epoch_time DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_source ON incidents(source)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_packets_incident ON packet_samples(incident_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_packets_epoch ON packet_samples(timestamp DESC)")
            conn.commit()

    def record_incident(
        self,
        incident_id: str,
        title: str,
        severity: Any,
        source: str,
        category: str,
        predicted_horizon_minutes: Optional[int] = None,
        is_active_fault: bool = False,
        gate_state: str = "PREDICT",
        node_id: str = "edge-gateway-01",
        interface_id: str = "eth0",
        primary_metrics: Optional[List[str]] = None,
        telemetry_snapshot: Optional[Dict[str, Optional[float]]] = None,
        packet_samples: Optional[List[Dict[str, Any]]] = None,
        copilot_response: Optional[Any] = None,
        status: str = "OPEN",
    ) -> str:
        """Insert or update a comprehensive incident record with full packet and copilot details."""
        now = time.time()
        iso_now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
        sev_str = severity.value if hasattr(severity, "value") else str(severity)
        metrics_list = primary_metrics or []
        snapshot_dict = telemetry_snapshot or {}
        samples_list = packet_samples or []

        # Extract copilot attributes
        summary = ""
        hypotheses = []
        assumptions = []
        claims = []
        diag_cmds = []
        verif_steps = []
        risks = []

        if copilot_response:
            summary = getattr(copilot_response, "summary", "")
            if hasattr(copilot_response, "structured_hypotheses") and copilot_response.structured_hypotheses:
                hypotheses = [
                    h.model_dump() if hasattr(h, "model_dump") else h
                    for h in copilot_response.structured_hypotheses
                ]
            else:
                hypotheses = [{"statement": h} for h in getattr(copilot_response, "hypotheses", [])]

            assumptions = [
                a.model_dump() if hasattr(a, "model_dump") else a
                for a in getattr(copilot_response, "assumptions", [])
            ]
            claims = [
                c.model_dump() if hasattr(c, "model_dump") else c
                for c in getattr(copilot_response, "claims", [])
            ]
            diag_cmds = getattr(copilot_response, "diagnostic_commands", [])
            verif_steps = getattr(copilot_response, "verification_steps", [])
            risks = getattr(copilot_response, "risks_and_rollback", [])
            model_used = getattr(copilot_response, "model_used", "offline_fallback")
        else:
            model_used = "offline_fallback"

        # Build complete JSON envelope
        envelope = {
            "id": incident_id,
            "created_at": iso_now,
            "epoch_time": now,
            "source": source,
            "title": title,
            "severity": severity,
            "status": status,
            "category": category,
            "predicted_horizon_minutes": predicted_horizon_minutes,
            "is_active_fault": is_active_fault,
            "gate_state": gate_state,
            "node_id": node_id,
            "interface_id": interface_id,
            "primary_metrics": primary_metrics,
            "telemetry_snapshot": telemetry_snapshot,
            "packet_samples": packet_samples,
            "copilot": {
                "summary": summary,
                "hypotheses": hypotheses,
                "assumptions": assumptions,
                "claims": claims,
                "diagnostic_commands": diag_cmds,
                "verification_steps": verif_steps,
                "risks_and_rollback": risks,
                "model_used": model_used,
            },
        }

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO incidents (
                    id, created_at, epoch_time, source, title, severity, status, category,
                    predicted_horizon_minutes, is_active_fault, gate_state, node_id, interface_id,
                    primary_metrics, telemetry_snapshot, packet_samples, copilot_summary,
                    copilot_hypotheses, copilot_assumptions, copilot_claims, diagnostic_commands,
                    verification_steps, risks_and_rollback, raw_envelope
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    epoch_time=excluded.epoch_time,
                    severity=excluded.severity,
                    telemetry_snapshot=excluded.telemetry_snapshot,
                    packet_samples=excluded.packet_samples,
                    copilot_summary=excluded.copilot_summary,
                    copilot_hypotheses=excluded.copilot_hypotheses,
                    copilot_assumptions=excluded.copilot_assumptions,
                    copilot_claims=excluded.copilot_claims,
                    diagnostic_commands=excluded.diagnostic_commands,
                    verification_steps=excluded.verification_steps,
                    risks_and_rollback=excluded.risks_and_rollback,
                    raw_envelope=excluded.raw_envelope
            """,
                (
                    incident_id,
                    iso_now,
                    now,
                    source,
                    title,
                    severity,
                    status,
                    category,
                    predicted_horizon_minutes,
                    1 if is_active_fault else 0,
                    gate_state,
                    node_id,
                    interface_id,
                    json.dumps(primary_metrics),
                    json.dumps(telemetry_snapshot),
                    json.dumps(packet_samples),
                    summary,
                    json.dumps(hypotheses),
                    json.dumps(assumptions),
                    json.dumps(claims),
                    json.dumps(diag_cmds),
                    json.dumps(verif_steps),
                    json.dumps(risks),
                    json.dumps(envelope),
                ),
            )

            # Relational granular packet insertion
            for idx, p in enumerate(packet_samples):
                pkt_id = p.get("packet_id") or f"pkt-{incident_id}-{idx:04d}"
                p_flags = p.get("flags", [])
                flags_str = json.dumps(p_flags) if isinstance(p_flags, list) else str(p_flags)
                labels_str = json.dumps(p.get("labels", {}))
                raw_str = json.dumps(p.get("raw_details", {}))
                conn.execute(
                    """
                    INSERT INTO packet_samples (
                        id, incident_id, timestamp, timestamp_iso, source, source_port,
                        destination, destination_port, protocol, packet_size_bytes, ttl,
                        flags, metric_id, value, unit, quality, labels, raw_details
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        value=excluded.value,
                        quality=excluded.quality,
                        raw_details=excluded.raw_details
                """,
                    (
                        pkt_id,
                        incident_id,
                        p.get("timestamp", now),
                        p.get("timestamp_iso", iso_now),
                        p.get("source", node_id),
                        p.get("source_port"),
                        p.get("destination", "unknown"),
                        p.get("destination_port"),
                        p.get("protocol", "TCP"),
                        p.get("packet_size_bytes"),
                        p.get("ttl"),
                        flags_str,
                        p.get("metric_id", "unknown"),
                        p.get("value"),
                        p.get("unit", ""),
                        p.get("quality", "GOOD"),
                        labels_str,
                        raw_str,
                    ),
                )
            conn.commit()

        return incident_id

    def get_incident_packets(self, incident_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve individual granular packet records for a given incident."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM packet_samples WHERE incident_id = ? ORDER BY timestamp ASC LIMIT ?",
                (incident_id, limit),
            )
            rows = cur.fetchall()
            packets = []
            for r in rows:
                p_dict = dict(r)
                p_dict["packet_id"] = p_dict["id"]
                flags_val = r["flags"] or "[]"
                try:
                    p_dict["flags"] = json.loads(flags_val) if flags_val.startswith("[") else [flags_val]
                except Exception:
                    p_dict["flags"] = []
                p_dict["labels"] = json.loads(r["labels"]) if r["labels"] else {}
                p_dict["raw_details"] = json.loads(r["raw_details"]) if r["raw_details"] else {}
                packets.append(p_dict)
            return packets

    def list_incidents(
        self,
        source: Optional[str] = None,
        severity: Optional[str] = None,
        node_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Fetch paginated incidents with optional filters."""
        query = "SELECT * FROM incidents WHERE 1=1"
        params = []

        if source and source != "all":
            query += " AND source = ?"
            params.append(source)
        if severity and severity != "all":
            query += " AND severity = ?"
            params.append(severity)
        if node_id and node_id != "all":
            query += " AND node_id = ?"
            params.append(node_id)

        # Count total
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(count_query, params)
            total = cur.fetchone()[0]

            query += " ORDER BY epoch_time DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cur.execute(query, params)
            rows = cur.fetchall()

            incidents = []
            for r in rows:
                incidents.append({
                    "id": r["id"],
                    "created_at": r["created_at"],
                    "epoch_time": r["epoch_time"],
                    "source": r["source"],
                    "title": r["title"],
                    "severity": r["severity"],
                    "status": r["status"],
                    "category": r["category"],
                    "predicted_horizon_minutes": r["predicted_horizon_minutes"],
                    "is_active_fault": bool(r["is_active_fault"]),
                    "gate_state": r["gate_state"],
                    "node_id": r["node_id"],
                    "interface_id": r["interface_id"],
                    "primary_metrics": json.loads(r["primary_metrics"]),
                    "telemetry_snapshot": json.loads(r["telemetry_snapshot"]),
                    "packet_samples_count": len(json.loads(r["packet_samples"])),
                    "copilot_summary": r["copilot_summary"],
                    "hypotheses_count": len(json.loads(r["copilot_hypotheses"])),
                    "assumptions_count": len(json.loads(r["copilot_assumptions"])),
                    "claims_count": len(json.loads(r["copilot_claims"])),
                })

            return {
                "total": total,
                "limit": limit,
                "offset": offset,
                "incidents": incidents,
            }

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Fetch complete incident record including raw packets, claims, assumptions, and commands."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT raw_envelope FROM incidents WHERE id = ?", (incident_id,))
            row = cur.fetchone()
            if row:
                return json.loads(row["raw_envelope"])
            return None

    def update_status(self, incident_id: str, new_status: str) -> bool:
        """Update incident workflow status."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT raw_envelope FROM incidents WHERE id = ?", (incident_id,))
            row = cur.fetchone()
            if not row:
                return False
            try:
                env = json.loads(row["raw_envelope"])
                env["status"] = new_status
                updated_env = json.dumps(env)
            except Exception:
                updated_env = row["raw_envelope"]

            cur.execute(
                "UPDATE incidents SET status = ?, raw_envelope = ? WHERE id = ?",
                (new_status, updated_env, incident_id),
            )
            conn.commit()
            return cur.rowcount > 0

    def update_copilot_guidance(self, incident_id: str, copilot_response: Any) -> bool:
        """Update incident with enriched LLM suggestions and auditing after async inference."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT raw_envelope FROM incidents WHERE id = ?", (incident_id,))
            row = cur.fetchone()
            if not row:
                return False
            try:
                env = json.loads(row["raw_envelope"])
            except Exception:
                return False

            summary = getattr(copilot_response, "summary", "")
            if hasattr(copilot_response, "structured_hypotheses") and copilot_response.structured_hypotheses:
                hypotheses = [
                    h.model_dump() if hasattr(h, "model_dump") else h
                    for h in copilot_response.structured_hypotheses
                ]
            else:
                hypotheses = [{"statement": h} for h in getattr(copilot_response, "hypotheses", [])]

            assumptions = [
                a.model_dump() if hasattr(a, "model_dump") else a
                for a in getattr(copilot_response, "assumptions", [])
            ]
            claims = [
                c.model_dump() if hasattr(c, "model_dump") else c
                for c in getattr(copilot_response, "claims", [])
            ]
            diag_cmds = getattr(copilot_response, "diagnostic_commands", [])
            verif_steps = getattr(copilot_response, "verification_steps", [])
            risks = getattr(copilot_response, "risks_and_rollback", [])
            model_used = getattr(copilot_response, "model_used", "offline_llm")

            env["copilot"] = {
                "summary": summary,
                "hypotheses": hypotheses,
                "assumptions": assumptions,
                "claims": claims,
                "diagnostic_commands": diag_cmds,
                "verification_steps": verif_steps,
                "risks_and_rollback": risks,
                "model_used": model_used,
            }

            cur.execute(
                """
                UPDATE incidents SET
                    copilot_summary = ?,
                    copilot_hypotheses = ?,
                    copilot_assumptions = ?,
                    copilot_claims = ?,
                    diagnostic_commands = ?,
                    verification_steps = ?,
                    risks_and_rollback = ?,
                    raw_envelope = ?
                WHERE id = ?
            """,
                (
                    summary,
                    json.dumps(hypotheses),
                    json.dumps(assumptions),
                    json.dumps(claims),
                    json.dumps(diag_cmds),
                    json.dumps(verif_steps),
                    json.dumps(risks),
                    json.dumps(env),
                    incident_id,
                ),
            )
            conn.commit()
            return cur.rowcount > 0
