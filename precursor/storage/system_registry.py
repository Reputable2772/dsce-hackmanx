"""Dynamic System Discovery and Topology Registry for PRECURSOR.

Automatically tracks systems accessing the server, monitored hardware endpoints,
and maintains topological graph relationships for the frontend.
"""

import os
import json
import sqlite3
import time
from typing import List, Dict, Any, Optional
import math


class SystemRegistry:
    """Embedded SQLite registry tracking connected systems, access history, and topology graph."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            data_dir = os.path.join(base_dir, "data")
            os.makedirs(data_dir, exist_ok=True)
            self.db_path = os.path.join(data_dir, "precursor.db")
        else:
            self.db_path = db_path
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

        self._init_db()
        self._seed_default_nodes()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Create discovered_systems and topology_links tables."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS discovered_systems (
                    id TEXT PRIMARY KEY,
                    ip_address TEXT NOT NULL,
                    name TEXT NOT NULL,
                    node_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    first_seen_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    request_count INTEGER NOT NULL,
                    user_agent TEXT NOT NULL,
                    last_endpoint TEXT NOT NULL,
                    metrics_json TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    pos_x REAL NOT NULL,
                    pos_y REAL NOT NULL,
                    pos_z REAL NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS topology_links (
                    id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    latency_ms REAL,
                    packet_loss_pct REAL,
                    utilization_pct REAL,
                    metadata_json TEXT NOT NULL,
                    last_updated TEXT NOT NULL
                )
            """)
            conn.commit()

    def _seed_default_nodes(self):
        """Seed the core server node if table is brand new."""
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM discovered_systems WHERE id = 'sys-core-engine'")
            if cur.fetchone()[0] == 0:
                conn.execute(
                    """
                    INSERT INTO discovered_systems (
                        id, ip_address, name, node_type, status, first_seen_at, last_seen_at,
                        request_count, user_agent, last_endpoint, metrics_json, metadata_json,
                        pos_x, pos_y, pos_z
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        "sys-core-engine",
                        "127.0.0.1",
                        "PRECURSOR Core Engine",
                        "server",
                        "healthy",
                        now_iso,
                        now_iso,
                        1,
                        "PRECURSOR-Internal/1.0",
                        "/health",
                        json.dumps({"latencyMs": 0.5, "jitterMs": 0.05, "packetLossPct": 0.0, "throughputMbps": 100.0}),
                        json.dumps({
                            "role": "Telemetry & Anomaly Intelligence Engine",
                            "firmware": "PRECURSOR v0.1.0-nix",
                            "location": "Local Datacenter / Host",
                            "interfaceName": "eth0",
                            "ipAddress": "127.0.0.1",
                        }),
                        0.0,
                        0.0,
                        0.0,
                    ),
                )
                conn.commit()

    def register_access(
        self,
        ip_address: str,
        user_agent: str = "",
        endpoint: str = "/",
        system_id: Optional[str] = None,
    ) -> str:
        """
        Record an incoming HTTP client access. If new, registers system.
        If existing, increments request_count and updates last_seen_at.
        """
        now = time.time()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))

        if not system_id:
            # Clean IP for ID
            clean_ip = ip_address.replace(":", "-").replace(".", "-").replace("%", "_")
            system_id = f"sys-{clean_ip}"

        # Classify node type
        ua_lower = user_agent.lower()
        if "mozilla" in ua_lower or "chrome" in ua_lower or "safari" in ua_lower or "vite" in ua_lower:
            node_type = "endpoint"
            role = "Frontend Dashboard Client"
        elif "curl" in ua_lower or "python" in ua_lower:
            node_type = "server"
            role = "API / Automation Client"
        elif "agent" in ua_lower:
            node_type = "router"
            role = "Telemetry Agent"
        else:
            node_type = "endpoint"
            role = "Network Node"

        friendly_name = f"Node ({ip_address})"
        if ip_address in ("127.0.0.1", "localhost", "::1"):
            friendly_name = "Localhost Client"

        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT request_count, pos_x, pos_y, pos_z FROM discovered_systems WHERE id = ?", (system_id,))
            row = cur.fetchone()

            if row:
                count = row["request_count"] + 1
                conn.execute(
                    """
                    UPDATE discovered_systems
                    SET last_seen_at = ?, request_count = ?, last_endpoint = ?, user_agent = ?
                    WHERE id = ?
                """,
                    (now_iso, count, endpoint, user_agent, system_id),
                )
            else:
                # Compute layout position around center (circle packing)
                cur.execute("SELECT COUNT(*) FROM discovered_systems")
                node_idx = cur.fetchone()[0]
                angle = (node_idx * 1.25) % (2 * math.pi)
                radius = 4.0 + (node_idx % 3) * 1.5
                pos_x = round(radius * math.cos(angle), 2)
                pos_y = round(radius * math.sin(angle), 2)
                pos_z = 0.0

                metrics = {"latencyMs": 1.2, "packetLossPct": 0.0, "throughputMbps": 10.0}
                metadata = {
                    "role": role,
                    "firmware": "Auto-Discovered Client",
                    "location": "Local Network Segment",
                    "interfaceName": "eth0",
                    "ipAddress": ip_address,
                }

                conn.execute(
                    """
                    INSERT INTO discovered_systems (
                        id, ip_address, name, node_type, status, first_seen_at, last_seen_at,
                        request_count, user_agent, last_endpoint, metrics_json, metadata_json,
                        pos_x, pos_y, pos_z
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        system_id,
                        ip_address,
                        friendly_name,
                        node_type,
                        "healthy",
                        now_iso,
                        now_iso,
                        1,
                        user_agent,
                        endpoint,
                        json.dumps(metrics),
                        json.dumps(metadata),
                        pos_x,
                        pos_y,
                        pos_z,
                    ),
                )

                # Connect newly discovered node to core engine
                link_id = f"link-{system_id}-core"
                link_meta = {
                    "cableType": "10GbE DAC",
                    "bandwidthGbps": 10.0,
                    "sourceInterface": "eth0",
                    "targetInterface": "eth0",
                }
                conn.execute(
                    """
                    INSERT OR REPLACE INTO topology_links (
                        id, source_id, target_id, status, latency_ms, packet_loss_pct,
                        utilization_pct, metadata_json, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        link_id,
                        system_id,
                        "sys-core-engine",
                        "active",
                        1.2,
                        0.0,
                        15.0,
                        json.dumps(link_meta),
                        now_iso,
                    ),
                )

            conn.commit()

        return system_id

    def register_node(
        self,
        node_id: str,
        name: str,
        node_type: str,
        ip_address: str,
        status: str = "healthy",
        metrics: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        position: Optional[List[float]] = None,
    ):
        """Explicitly register or update a network node (e.g. gateway, probe target)."""
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        metrics_dict = metrics or {}
        metadata_dict = metadata or {
            "role": "Network Element",
            "firmware": "v1.0",
            "location": "Datacenter",
            "interfaceName": "eth0",
            "ipAddress": ip_address,
        }
        pos = position or [3.0, 3.0, 0.0]

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO discovered_systems (
                    id, ip_address, name, node_type, status, first_seen_at, last_seen_at,
                    request_count, user_agent, last_endpoint, metrics_json, metadata_json,
                    pos_x, pos_y, pos_z
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    status = excluded.status,
                    last_seen_at = excluded.last_seen_at,
                    metrics_json = excluded.metrics_json,
                    metadata_json = excluded.metadata_json
            """,
                (
                    node_id,
                    ip_address,
                    name,
                    node_type,
                    status,
                    now_iso,
                    now_iso,
                    1,
                    "PRECURSOR-Topology-Manager",
                    "/topology",
                    json.dumps(metrics_dict),
                    json.dumps(metadata_dict),
                    pos[0],
                    pos[1],
                    pos[2],
                ),
            )
            conn.commit()

    def register_link(
        self,
        source_id: str,
        target_id: str,
        status: str = "active",
        latency_ms: Optional[float] = None,
        packet_loss_pct: Optional[float] = None,
        utilization_pct: float = 20.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Register or update a link between two topology nodes."""
        link_id = f"link-{source_id}-{target_id}"
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        meta = metadata or {
            "cableType": "Fiber Optic",
            "bandwidthGbps": 10.0,
            "sourceInterface": "eth0",
            "targetInterface": "eth1",
        }

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO topology_links (
                    id, source_id, target_id, status, latency_ms, packet_loss_pct,
                    utilization_pct, metadata_json, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status = excluded.status,
                    latency_ms = excluded.latency_ms,
                    packet_loss_pct = excluded.packet_loss_pct,
                    utilization_pct = excluded.utilization_pct,
                    last_updated = excluded.last_updated
            """,
                (
                    link_id,
                    source_id,
                    target_id,
                    status,
                    latency_ms,
                    packet_loss_pct,
                    utilization_pct,
                    json.dumps(meta),
                    now_iso,
                ),
            )
            conn.commit()

    def get_systems(self) -> List[Dict[str, Any]]:
        """Return list of all registered systems."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM discovered_systems ORDER BY last_seen_at DESC")
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    def get_topology_graph(self, mode: Optional[str] = None) -> Dict[str, Any]:
        """
        Return complete topology graph matching NetworkTopologyData interface in frontend:
        { id, name, description, isDemoFixture: false, nodes: [...], links: [...] }
        When mode == 'live', filters out synthetic datacenter nodes.
        """
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM discovered_systems")
            node_rows = cur.fetchall()

            cur.execute("SELECT * FROM topology_links")
            link_rows = cur.fetchall()

            nodes = []
            for r in node_rows:
                n_id = r["id"]
                if mode == "live" and (
                    n_id.startswith(("sw-", "rtr-", "gw-", "leaf-", "spine-"))
                    or "fixture" in n_id
                    or "Spine" in r["name"]
                    or "Leaf" in r["name"]
                    or "Gateway" in r["name"]
                ):
                    continue

                nodes.append({
                    "id": r["id"],
                    "name": r["name"],
                    "type": r["node_type"],
                    "position": [r["pos_x"], r["pos_y"], r["pos_z"]],
                    "status": r["status"],
                    "metrics": json.loads(r["metrics_json"]),
                    "metadata": json.loads(r["metadata_json"]),
                })

            valid_node_ids = {n["id"] for n in nodes}
            links = []
            for r in link_rows:
                if mode == "live" and (r["source_id"] not in valid_node_ids or r["target_id"] not in valid_node_ids):
                    continue
                links.append({
                    "id": r["id"],
                    "sourceId": r["source_id"],
                    "targetId": r["target_id"],
                    "status": r["status"],
                    "utilizationPct": r["utilization_pct"],
                    "latencyMs": r["latency_ms"],
                    "packetLossPct": r["packet_loss_pct"],
                    "metadata": json.loads(r["metadata_json"]),
                })

            return {
                "id": "topology-dynamic-live",
                "name": "Live Network Dynamic Topology" if mode == "live" else "Dynamic Network Topology",
                "description": f"Real-time graph tracking {len(nodes)} active systems and {len(links)} connections.",
                "isDemoFixture": False,
                "nodes": nodes,
                "links": links,
            }

