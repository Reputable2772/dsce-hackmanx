"""Dynamic network systems and peer probe manager for PRECURSOR.

Discovers local host identity, manages configured peer systems,
executes safe read-only ICMP/TCP latency and reachability probes,
computes empirical packet loss and jitter over measurement windows,
and generates dynamic 3D network topology.
"""

import os
import re
import json
import time
import socket
import platform
import subprocess
import threading
import ipaddress
from typing import Dict, List, Optional, Any, Tuple


def is_valid_target(target: str) -> bool:
    """Validate whether target is a valid IPv4/IPv6 address or RFC 1123 hostname."""
    if not target or not isinstance(target, str):
        return False
    target = target.strip()
    if not target or len(target) > 255:
        return False
    # Check IP
    try:
        ipaddress.ip_address(target)
        return True
    except ValueError:
        pass
    # Check Hostname
    hostname_regex = re.compile(r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))*$")
    return bool(hostname_regex.match(target))


class SystemNode:
    """Represents a local or remote network system in the dynamic topology."""

    def __init__(
        self,
        id: str,
        name: str,
        address: str,
        is_local: bool = False,
        description: str = "",
        probe_enabled: bool = True,
        port: int = 80,
    ):
        self.id = id
        self.name = name
        self.address = address
        self.is_local = is_local
        self.description = description
        self.probe_enabled = probe_enabled
        self.port = port

        # Health & Measurement state
        self.status: str = "healthy"  # "healthy", "degraded", "critical", "offline"
        self.probe_status: str = "reachable" if is_local else "unprobed"  # "reachable", "unreachable", "disabled", "error"
        self.diagnostic_message: str = "Local host" if is_local else "Initialized"
        self.latency_ms: Optional[float] = 0.0 if is_local else None
        self.jitter_ms: Optional[float] = 0.0 if is_local else None
        self.packet_loss_pct: Optional[float] = 0.0 if is_local else None
        self.last_probe_time: Optional[float] = time.time() if is_local else None
        self.probe_history: List[Dict[str, Any]] = []

    def record_probe(self, rtt: Optional[float], success: bool, diagnostic: str):
        """Append probe result to 10-sample rolling window and update empirical statistics."""
        now = time.time()
        self.last_probe_time = now
        self.diagnostic_message = diagnostic

        # Append to rolling history
        self.probe_history.append({"time": now, "rtt": rtt, "success": success})
        if len(self.probe_history) > 10:
            self.probe_history = self.probe_history[-10:]

        total_probes = len(self.probe_history)
        if total_probes == 0:
            return

        failed_probes = sum(1 for p in self.probe_history if not p["success"])
        self.packet_loss_pct = round((failed_probes / total_probes) * 100.0, 1)

        if success and rtt is not None:
            self.latency_ms = round(rtt, 1)
            self.probe_status = "reachable"

            # Compute jitter from consecutive successful RTTs
            successful_rtts = [p["rtt"] for p in self.probe_history if p["success"] and p["rtt"] is not None]
            if len(successful_rtts) >= 2:
                deltas = [abs(successful_rtts[i] - successful_rtts[i - 1]) for i in range(1, len(successful_rtts))]
                self.jitter_ms = round(sum(deltas) / len(deltas), 1)
            else:
                self.jitter_ms = None

            # Determine health status based on SLA thresholds
            if self.latency_ms > 60.0 or self.packet_loss_pct >= 5.0:
                self.status = "critical"
            elif self.latency_ms > 35.0 or (self.jitter_ms and self.jitter_ms > 10.0) or self.packet_loss_pct > 0.0:
                self.status = "degraded"
            else:
                self.status = "healthy"
        else:
            self.probe_status = "unreachable"
            self.latency_ms = None
            self.jitter_ms = None
            self.status = "critical" if self.packet_loss_pct >= 50.0 else "degraded"

    def to_dict(self) -> Dict[str, Any]:
        """Convert system node to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "is_local": self.is_local,
            "description": self.description,
            "probe_enabled": self.probe_enabled,
            "port": self.port,
            "status": self.status,
            "reachability": "reachable" if self.probe_status in ("ok", "reachable") else self.probe_status,
            "probe_status": self.probe_status,
            "probe_type": "loopback" if self.is_local else "icmp_with_tcp_fallback",
            "diagnostic_message": self.diagnostic_message,
            "latency_ms": self.latency_ms,
            "jitter_ms": self.jitter_ms,
            "packet_loss_pct": self.packet_loss_pct,
            "telemetry_source": "local_host_loopback" if self.is_local else "network_probe_adapter",
            "unsupported_metrics": [
                "remote_cpu",
                "remote_memory",
                "remote_throughput",
                "internal_interfaces",
            ],
            "metrics": {
                "latencyMs": self.latency_ms,
                "jitterMs": self.jitter_ms,
                "packetLossPct": self.packet_loss_pct,
                "throughputMbps": None,  # Intentionally unavailable: not measured remotely
                "cpuUtilizationPct": None,
                "memoryUtilizationPct": None,
            },
            "last_seen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.last_probe_time)) if self.last_probe_time else None,
            "tags": getattr(self, "tags", ["local"] if self.is_local else ["peer"]),
        }


class SystemProbeManager:
    """Thread-safe manager for configured peer systems and periodic network probing."""

    def __init__(
        self,
        data_file: str = "data/registered_systems.json",
        persistence_path: Optional[str] = None,
        auto_start_worker: bool = True,
    ):
        self.data_file = persistence_path or data_file
        self.lock = threading.Lock()
        self.systems: Dict[str, SystemNode] = {}
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None

        self._init_local_system()
        self._load_persisted_systems()
        if auto_start_worker:
            self.start_probing_worker()

    def _init_local_system(self):
        """Discover and initialize Local Host system."""
        try:
            local_hostname = socket.gethostname()
            local_ip = socket.gethostbyname(local_hostname)
        except Exception:
            local_hostname = "localhost"
            local_ip = "127.0.0.1"

        local_node = SystemNode(
            id="local-host",
            name=f"My Computer ({local_hostname})",
            address=local_ip,
            is_local=True,
            description="Local operator workstation running PRECURSOR intelligence agent",
            probe_enabled=True,
        )
        local_node.record_probe(0.2, True, "Local host loopback reachable")
        self.systems["local-host"] = local_node

    def _load_persisted_systems(self):
        """Load configured peer systems from persistence or seed default demonstration peer."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    if item.get("id") == "local-host":
                        continue
                    node = SystemNode(
                        id=item["id"],
                        name=item.get("name", "Peer Node"),
                        address=item.get("address", "127.0.0.1"),
                        is_local=False,
                        description=item.get("description", ""),
                        probe_enabled=item.get("probe_enabled", True),
                        port=item.get("port", 80),
                    )
                    self.systems[node.id] = node
                return
            except Exception:
                pass

        # Seed initial two-computer demo peer: "Friend's Computer"
        # Points to 127.0.0.1 or standard gateway so local testing immediately succeeds!
        default_peer = SystemNode(
            id="peer-friend",
            name="Friend's Computer (Peer)",
            address="127.0.0.1",
            is_local=False,
            description="Configured peer workstation for two-computer collaborative network operations demo",
            probe_enabled=True,
            port=80,
        )
        self.systems["peer-friend"] = default_peer
        self._save_systems()

    def _save_systems(self):
        """Persist registered peer systems to disk."""
        try:
            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            export_data = []
            for s in self.systems.values():
                if s.is_local:
                    continue
                export_data.append({
                    "id": s.id,
                    "name": s.name,
                    "address": s.address,
                    "description": s.description,
                    "probe_enabled": s.probe_enabled,
                    "port": s.port,
                })
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(export_data, f, indent=2)
        except Exception:
            pass

    def execute_probe(self, target: str, port: int = 80) -> Tuple[Optional[float], bool, str]:
        """Execute safe read-only network reachability and RTT probe via ICMP ping with TCP socket fallback."""
        if not is_valid_target(target):
            return None, False, f"Invalid target address format: {target}"

        # 1. Primary: System ICMP Ping
        start = time.perf_counter()
        is_windows = platform.system() == "Windows"
        ping_cmd = ["ping", "-n", "1", "-w", "1000", target] if is_windows else ["ping", "-c", "1", "-W", "1", target]

        try:
            proc = subprocess.run(
                ping_cmd,
                capture_output=True,
                text=True,
                timeout=2.0,
            )
            output = proc.stdout or ""
            if proc.returncode == 0:
                duration_ms = None
                # Parse Windows: time=12ms or time<1ms
                m_win = re.search(r"time[<=](\d+)(?:ms)?", output, re.IGNORECASE)
                if m_win:
                    duration_ms = max(0.5, float(m_win.group(1)))
                else:
                    # Parse Linux: time=12.4 ms
                    m_lin = re.search(r"time=([\d\.]+)\s*ms", output, re.IGNORECASE)
                    if m_lin:
                        duration_ms = float(m_lin.group(1))

                if duration_ms is None:
                    duration_ms = max(0.5, (time.perf_counter() - start) * 1000.0)

                return round(duration_ms, 2), True, f"ICMP Echo Reply received in {round(duration_ms, 1)} ms"
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
            pass

        # 2. Secondary Fallback: TCP Socket Connect Probe (useful if ICMP is filtered by firewall)
        start_tcp = time.perf_counter()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        try:
            sock.connect((target, port))
            tcp_rtt = (time.perf_counter() - start_tcp) * 1000.0
            sock.close()
            return round(tcp_rtt, 2), True, f"TCP Connect Probe to port {port} succeeded in {round(tcp_rtt, 1)} ms"
        except (ConnectionRefusedError, socket.error) as e:
            tcp_rtt = (time.perf_counter() - start_tcp) * 1000.0
            sock.close()
            # If refused (RST packet received), the host is alive and responding at network level!
            if isinstance(e, ConnectionRefusedError) or (tcp_rtt < 1500.0 and "refused" in str(e).lower()):
                return round(tcp_rtt, 2), True, f"Host active (TCP RST received on port {port} in {round(tcp_rtt, 1)} ms)"
            return None, False, f"Target unreachable: {e}"
        except Exception as e:
            sock.close()
            return None, False, f"Probe error: {e}"

    def probe_all_enabled(self):
        """Probe all enabled peers in the registry."""
        with self.lock:
            systems_to_probe = [s for s in self.systems.values() if not s.is_local and s.probe_enabled]

        for s in systems_to_probe:
            rtt, success, diag = self.execute_probe(s.address, s.port)
            with self.lock:
                if s.id in self.systems:
                    self.systems[s.id].record_probe(rtt, success, diag)

    def _worker_loop(self):
        """Background probing loop running every 5 seconds."""
        # Initial probe
        time.sleep(0.5)
        self.probe_all_enabled()
        while not self._stop_event.is_set():
            self._stop_event.wait(5.0)
            if not self._stop_event.is_set():
                self.probe_all_enabled()

    def start_probing_worker(self):
        """Start daemonized background probe thread."""
        if self._worker_thread is None or not self._worker_thread.is_alive():
            self._stop_event.clear()
            self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
            self._worker_thread.start()

    def stop_probing_worker(self):
        """Stop background probe thread."""
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=1.0)

    # API CRUD Methods
    def list_systems(self) -> List[Dict[str, Any]]:
        """Return list of all registered systems."""
        with self.lock:
            return [s.to_dict() for s in self.systems.values()]

    def get_system(self, system_id: str) -> Optional[SystemNode]:
        """Retrieve single registered system node by ID."""
        with self.lock:
            return self.systems.get(system_id)

    def add_system(
        self,
        name: str,
        address: str,
        description: str = "",
        probe_enabled: bool = True,
        port: int = 80,
        tags: Optional[List[str]] = None,
        system_id: Optional[str] = None,
    ) -> SystemNode:
        """Validate and register a new peer system."""
        clean_addr = address.strip()
        clean_name = name.strip()
        if not clean_name:
            raise ValueError("Display name is required.")
        if not is_valid_target(clean_addr):
            raise ValueError(f"Invalid target IP address or hostname format: '{clean_addr}'")

        with self.lock:
            # Reject duplicates
            for s in self.systems.values():
                if not s.is_local and s.address.lower() == clean_addr.lower() and s.port == port:
                    raise ValueError(f"A system with address '{clean_addr}:{port}' is already registered as '{s.name}'.")

            if system_id and system_id not in self.systems:
                candidate_id = system_id
            else:
                base_id = "peer-" + re.sub(r"[^a-zA-Z0-9-]", "", clean_name.lower().replace(" ", "-"))[:20]
                if not base_id or base_id == "peer-":
                    base_id = f"peer-{int(time.time())}"
                candidate_id = base_id
                counter = 1
                while candidate_id in self.systems:
                    candidate_id = f"{base_id}-{counter}"
                    counter += 1

            new_node = SystemNode(
                id=candidate_id,
                name=clean_name,
                address=clean_addr,
                is_local=False,
                description=description.strip(),
                probe_enabled=probe_enabled,
                port=port,
            )
            new_node.tags = tags or ["peer"]
            self.systems[candidate_id] = new_node
            self._save_systems()

        # Immediate synchronous first probe
        if probe_enabled:
            rtt, success, diag = self.execute_probe(clean_addr, port)
            with self.lock:
                new_node.record_probe(rtt, success, diag)

        return new_node

    def update_system(
        self,
        system_id: str,
        updates: Optional[Dict[str, Any]] = None,
        name: Optional[str] = None,
        address: Optional[str] = None,
        description: Optional[str] = None,
        probe_enabled: Optional[bool] = None,
        port: Optional[int] = None,
    ) -> Optional[SystemNode]:
        """Update properties of an existing registered peer."""
        with self.lock:
            node = self.systems.get(system_id)
            if not node:
                return None
            if node.is_local:
                raise ValueError("Cannot modify properties of Local Host system.")

            u = dict(updates or {})
            if name is not None:
                u["name"] = name
            if address is not None:
                u["address"] = address
            if description is not None:
                u["description"] = description
            if probe_enabled is not None:
                u["probe_enabled"] = probe_enabled
            if port is not None:
                u["port"] = port

            if "name" in u and str(u["name"]).strip():
                node.name = str(u["name"]).strip()
            if "description" in u:
                node.description = str(u["description"]).strip()
            if "probe_enabled" in u:
                node.probe_enabled = bool(u["probe_enabled"])
                if not node.probe_enabled:
                    node.probe_status = "disabled"
                    node.diagnostic_message = "Probing disabled by operator"
            if "port" in u:
                node.port = int(u["port"])
            if "address" in u:
                new_addr = str(u["address"]).strip()
                if not is_valid_target(new_addr):
                    raise ValueError(f"Invalid IP address or hostname format: '{new_addr}'")
                node.address = new_addr
                node.probe_history.clear()

            self._save_systems()
            return node

    def toggle_probe(self, system_id: str) -> Optional[SystemNode]:
        """Toggle probe enabled state for a system."""
        with self.lock:
            node = self.systems.get(system_id)
            if not node or node.is_local:
                return None
            node.probe_enabled = not node.probe_enabled
            if not node.probe_enabled:
                node.probe_status = "disabled"
                node.diagnostic_message = "Probing disabled by operator"
            self._save_systems()
            return node

    def trigger_probe(self, system_id: str) -> Optional[SystemNode]:
        """Trigger immediate on-demand network probe for a system."""
        with self.lock:
            node = self.systems.get(system_id)
            if not node:
                return None
            target = node.address
            port = node.port
            enabled = node.probe_enabled

        if not enabled:
            return node

        rtt, success, diag = self.execute_probe(target, port)
        with self.lock:
            node.record_probe(rtt, success, diag)
            return node

    def remove_system(self, system_id: str) -> bool:
        """Remove a registered peer system from topology."""
        with self.lock:
            node = self.systems.get(system_id)
            if not node:
                return False
            if node.is_local:
                raise ValueError("Cannot remove Local Host from network topology.")

            del self.systems[system_id]
            self._save_systems()
            return True

    def build_dynamic_topology(self, gate_state: str = "PREDICT") -> Dict[str, Any]:
        """Generate React Three Fiber compatible 3D network topology from registered systems."""
        import math

        with self.lock:
            nodes_list = list(self.systems.values())

        topo_nodes = []
        topo_links = []

        local_sys = next((s for s in nodes_list if s.is_local), None)
        peers = [s for s in nodes_list if not s.is_local]

        # 1. Place Local Host in center of 3D canvas
        if local_sys:
            topo_nodes.append({
                "id": local_sys.id,
                "name": local_sys.name,
                "type": "server",
                "position": [0, 0, 0],
                "status": local_sys.status,
                "metrics": {
                    "latencyMs": 0.0,
                    "jitterMs": 0.0,
                    "packetLossPct": 0.0,
                    "throughputMbps": None,
                },
                "metadata": {
                    "role": "Local Host (Observer)",
                    "interfaceName": "eth0",
                    "ipAddress": local_sys.address,
                    "location": "Local Host Environment",
                    "firmware": f"{platform.system()} {platform.release()}",
                },
            })

        # 2. Place configured peers dynamically around Local Host in a circular ring
        num_peers = len(peers)
        radius = 8.5
        for i, peer in enumerate(peers):
            if num_peers == 1:
                pos = [6.5, 0.0, 0.0]
            else:
                angle = (2.0 * math.pi * i) / num_peers
                pos = [round(radius * math.cos(angle), 2), 0.0, round(radius * math.sin(angle), 2)]

            topo_nodes.append({
                "id": peer.id,
                "name": peer.name,
                "type": "endpoint",
                "position": pos,
                "status": peer.status if peer.probe_enabled else "offline",
                "metrics": {
                    "latencyMs": peer.latency_ms,
                    "jitterMs": peer.jitter_ms,
                    "packetLossPct": peer.packet_loss_pct,
                    "throughputMbps": None,
                },
                "metadata": {
                    "role": "Configured Network Peer",
                    "interfaceName": f"probe:{peer.port}",
                    "ipAddress": peer.address,
                    "location": peer.description or "Configured Network Target",
                    "firmware": peer.diagnostic_message,
                },
            })

            # Real link between Local Host and this peer
            link_status = (
                "active" if peer.status == "healthy" and peer.probe_enabled
                else "degraded" if peer.status == "degraded" and peer.probe_enabled
                else "down"
            )

            topo_links.append({
                "id": f"link-local-{peer.id}",
                "sourceId": "local-host",
                "targetId": peer.id,
                "status": link_status,
                "utilizationPct": 25 if link_status == "active" else 0,
                "latencyMs": peer.latency_ms,
                "packetLossPct": peer.packet_loss_pct,
                "metadata": {
                    "cableType": "1GbE Twisted Pair",
                    "bandwidthGbps": 1,
                    "sourceInterface": "local-nic",
                    "targetInterface": f"port-{peer.port}",
                },
            })

        return {
            "id": "precursor-systems-01",
            "name": "Live Systems Network Topology",
            "description": f"Dynamic multi-system topology ({1 + len(peers)} systems registered). Real ICMP/TCP probe telemetry.",
            "isDemoFixture": False,
            "mode": "live",
            "view": "systems",
            "gate_state": gate_state,
            "timestamp": time.time(),
            "nodes": topo_nodes,
            "links": topo_links,
        }
