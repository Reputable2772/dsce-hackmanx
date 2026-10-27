"""Live telemetry collector for Linux active ICMP/socket probes and network interface metrics."""

import os
import re
import time
import socket
import platform
import subprocess
from collections import deque
from typing import Dict, Optional, Tuple
from precursor.telemetry.schema import TelemetryPoint, MetricQuality, MetricBatch


def get_default_network_info() -> Tuple[str, str]:
    """Auto-detect default network interface and default gateway IP from /proc/net/route on Linux."""
    iface = "eth0"
    gateway = "127.0.0.1"
    proc_route = "/proc/net/route"
    if os.path.exists(proc_route):
        try:
            with open(proc_route, "r", encoding="utf-8") as f:
                for line in f.readlines()[1:]:
                    fields = line.strip().split()
                    if len(fields) >= 3 and fields[1] == "00000000":  # default route
                        iface = fields[0]
                        gw_hex = fields[2]
                        # Convert 8-char hex (e.g. 015019AC) in little-endian order to IP string
                        ip_bytes = [int(gw_hex[i:i+2], 16) for i in (6, 4, 2, 0)]
                        gateway = ".".join(map(str, ip_bytes))
                        break
        except Exception:
            pass
    return iface, gateway


class LiveTelemetryCollector:
    """Collects real-time network telemetry via ICMP ping, socket probes, and /proc metrics."""

    def __init__(
        self,
        target_host: str = "127.0.0.1",
        target_port: int = 80,
        interface_id: str = "eth0",
        poll_interval_seconds: float = 5.0,
    ):
        detected_iface, detected_gw = get_default_network_info()
        # If user left interface default eth0 or auto, use detected system interface
        if interface_id in ("eth0", "", "auto") and detected_iface:
            interface_id = detected_iface

        # If user left target host localhost/127.0.0.1 and we have a valid LAN gateway, probe gateway by default
        if target_host in ("127.0.0.1", "localhost", "") and detected_gw != "127.0.0.1":
            target_host = detected_gw

        self.target_host = target_host
        self.target_port = target_port
        self.interface_id = interface_id
        self.poll_interval = poll_interval_seconds

        self._prev_rtt: Optional[float] = None
        self._prev_stats: Optional[Dict[str, float]] = None
        self._prev_icmp_stats: Optional[Dict[str, float]] = None
        self._prev_time: Optional[float] = None
        self._recent_probes: deque[bool] = deque(maxlen=10)

    def set_target(self, target_host: str, target_port: int = 80, interface_id: Optional[str] = None) -> None:
        """Update probe target host, port, and interface dynamically."""
        if target_host:
            self.target_host = target_host.strip()
        if target_port:
            self.target_port = int(target_port)
        if interface_id:
            self.interface_id = interface_id.strip()

    def probe_latency(self) -> Tuple[Optional[float], MetricQuality]:
        """Measure round-trip latency via ICMP ping with TCP socket connect fallback."""
        # 1. Primary: ICMP Ping (true OS network round-trip time)
        try:
            is_windows = platform.system() == "Windows"
            cmd = (
                ["ping", "-n", "1", "-w", "1000", self.target_host]
                if is_windows
                else ["ping", "-c", "1", "-W", "1", self.target_host]
            )
            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=1.5,
            )
            if proc.returncode == 0:
                match = re.search(r"time[=<]([0-9.]+)\s*ms", proc.stdout)
                if match:
                    rtt_ms = float(match.group(1))
                    self._recent_probes.append(True)
                    return round(rtt_ms, 2), MetricQuality.GOOD
        except Exception:
            pass

        # 2. Secondary: TCP connect probe
        start = time.perf_counter()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        try:
            sock.connect((self.target_host, self.target_port))
            duration_ms = (time.perf_counter() - start) * 1000.0
            sock.close()
            self._recent_probes.append(True)
            return round(duration_ms, 2), MetricQuality.GOOD
        except (socket.timeout, ConnectionRefusedError, OSError):
            sock.close()

        # Both ICMP and TCP failed / timed out
        self._recent_probes.append(False)
        return None, MetricQuality.MISSING

    def read_interface_stats(self) -> Dict[str, float]:
        """Read rx/tx bytes, packets, errors, and drops from /proc/net/dev on Linux."""
        stats = {
            "rx_bytes": 0.0,
            "tx_bytes": 0.0,
            "rx_packets": 0.0,
            "tx_packets": 0.0,
            "rx_errors": 0.0,
            "rx_drops": 0.0,
            "link_up": 1.0,
        }
        proc_path = "/proc/net/dev"
        if os.path.exists(proc_path):
            try:
                with open(proc_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                matched = False
                non_lo_lines = []
                for line in lines[2:]:
                    parts = line.split(":")
                    if len(parts) == 2:
                        iface = parts[0].strip()
                        if iface != "lo":
                            non_lo_lines.append((iface, parts[1].split()))
                        if iface == self.interface_id or self.interface_id in ("all", "*"):
                            data = parts[1].split()
                            stats["rx_bytes"] += float(data[0])
                            stats["rx_packets"] += float(data[1])
                            stats["rx_errors"] += float(data[2])
                            stats["rx_drops"] += float(data[3])
                            stats["tx_bytes"] += float(data[8])
                            stats["tx_packets"] += float(data[9])
                            matched = True
                # If explicit interface_id not matched, dynamically find active default or highest traffic NIC
                if not matched and non_lo_lines:
                    detected_iface, _ = get_default_network_info()
                    target_candidate = next((item for item in non_lo_lines if item[0] == detected_iface), None)
                    if not target_candidate:
                        # Pick the interface with the highest active traffic
                        target_candidate = max(non_lo_lines, key=lambda item: float(item[1][1]))
                    iface, data = target_candidate
                    self.interface_id = iface
                    stats["rx_bytes"] = float(data[0])
                    stats["rx_packets"] = float(data[1])
                    stats["rx_errors"] = float(data[2])
                    stats["rx_drops"] = float(data[3])
                    stats["tx_bytes"] = float(data[8])
                    stats["tx_packets"] = float(data[9])
            except Exception:
                pass
        return stats

    def read_icmp_stats(self) -> Dict[str, float]:
        """Read incoming/outgoing ICMP echo and error counters from /proc/net/snmp on Linux."""
        stats = {"in_echos": 0.0, "out_echoreps": 0.0, "in_errors": 0.0}
        proc_snmp = "/proc/net/snmp"
        if os.path.exists(proc_snmp):
            try:
                with open(proc_snmp, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                for i, line in enumerate(lines):
                    if line.startswith("Icmp:") and i + 1 < len(lines) and lines[i + 1].startswith("Icmp:"):
                        headers = line.split()[1:]
                        values = lines[i + 1].split()[1:]
                        h_map = dict(zip(headers, values))
                        stats["in_echos"] = float(h_map.get("InEchos", 0.0))
                        stats["out_echoreps"] = float(h_map.get("OutEchoReps", 0.0))
                        stats["in_errors"] = float(h_map.get("InErrors", 0.0))
                        break
            except Exception:
                pass
        return stats

    def collect(self) -> MetricBatch:
        """Execute a single collection sweep and return a complete MetricBatch."""
        now = time.time()
        rtt, rtt_quality = self.probe_latency()
        stats = self.read_interface_stats()
        icmp_stats = self.read_icmp_stats()

        # 1. Jitter computation from successive RTT deltas
        if rtt is not None and self._prev_rtt is not None:
            jitter = round(abs(rtt - self._prev_rtt), 2)
            jitter_quality = MetricQuality.GOOD
        else:
            jitter = 0.0
            jitter_quality = MetricQuality.GOOD if rtt is not None else MetricQuality.MISSING
        self._prev_rtt = rtt

        # 2. Packet loss percentage from rolling probe window
        if self._recent_probes:
            dropped = sum(1 for s in self._recent_probes if not s)
            loss_pct = round((dropped / len(self._recent_probes)) * 100.0, 1)
            loss_quality = MetricQuality.GOOD
        else:
            loss_pct = 0.0 if rtt is not None else 100.0
            loss_quality = MetricQuality.GOOD if rtt is not None else MetricQuality.MISSING

        # 3. Throughput and packet rate calculations from byte and packet counter deltas
        throughput_mbps = 0.0
        packets_in_sec = 0.0
        packets_out_sec = 0.0
        inbound_icmp_rate = 0.0
        if self._prev_stats is not None and self._prev_time is not None:
            dt = max(0.1, now - self._prev_time)
            delta_bytes = (stats["rx_bytes"] - self._prev_stats["rx_bytes"]) + (
                stats["tx_bytes"] - self._prev_stats["tx_bytes"]
            )
            if delta_bytes >= 0:
                throughput_mbps = round((delta_bytes * 8.0) / (dt * 1e6), 3)

            delta_rx_pkts = stats["rx_packets"] - self._prev_stats.get("rx_packets", stats["rx_packets"])
            delta_tx_pkts = stats["tx_packets"] - self._prev_stats.get("tx_packets", stats["tx_packets"])
            if delta_rx_pkts >= 0:
                packets_in_sec = round(delta_rx_pkts / dt, 1)
            if delta_tx_pkts >= 0:
                packets_out_sec = round(delta_tx_pkts / dt, 1)

            if self._prev_icmp_stats is not None:
                delta_echos = icmp_stats["in_echos"] - self._prev_icmp_stats["in_echos"]
                if delta_echos >= 0:
                    inbound_icmp_rate = round(delta_echos / dt, 2)

        self._prev_stats = stats
        self._prev_icmp_stats = icmp_stats
        self._prev_time = now

        target_label = f"{self.target_host}:{self.target_port}"
        points = [
            TelemetryPoint(
                timestamp=now,
                metric_id="latency_ms",
                value=rtt,
                quality=rtt_quality,
                source="live",
                interface_id=self.interface_id,
                labels={"target": target_label},
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="jitter_ms",
                value=jitter,
                quality=jitter_quality,
                source="live",
                interface_id=self.interface_id,
                labels={"target": target_label},
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="packet_loss_pct",
                value=loss_pct,
                quality=loss_quality,
                source="live",
                interface_id=self.interface_id,
                labels={"target": target_label},
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="throughput_mbps",
                value=throughput_mbps,
                quality=MetricQuality.GOOD,
                source="live",
                interface_id=self.interface_id,
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="packets_in_sec",
                value=packets_in_sec,
                quality=MetricQuality.GOOD,
                source="live",
                interface_id=self.interface_id,
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="packets_out_sec",
                value=packets_out_sec,
                quality=MetricQuality.GOOD,
                source="live",
                interface_id=self.interface_id,
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="link_state",
                value=stats["link_up"],
                quality=MetricQuality.GOOD,
                source="live",
                interface_id=self.interface_id,
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="drops_in",
                value=stats["rx_drops"],
                quality=MetricQuality.GOOD,
                source="live",
                interface_id=self.interface_id,
            ),
            TelemetryPoint(
                timestamp=now,
                metric_id="icmp_inbound_rate",
                value=inbound_icmp_rate,
                quality=MetricQuality.GOOD,
                source="live",
                interface_id=self.interface_id,
            ),
        ]
        return MetricBatch(timestamp=now, source="live", points=points)

    def read_arp_peers(self) -> list:
        """Read active neighbors / ARP table from /proc/net/arp on Linux."""
        peers = []
        proc_arp = "/proc/net/arp"
        if os.path.exists(proc_arp):
            try:
                with open(proc_arp, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                for line in lines[1:]:
                    parts = line.strip().split()
                    if len(parts) >= 6:
                        ip = parts[0]
                        flags = parts[2]
                        mac = parts[3]
                        device = parts[5]
                        # Flags 0x2 indicates complete entry (valid hardware address)
                        if flags == "0x2" and mac != "00:00:00:00:00:00":
                            peers.append({"ip": ip, "mac": mac, "device": device})
            except Exception:
                pass
        return peers

