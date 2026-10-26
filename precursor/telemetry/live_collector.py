"""Live telemetry collector for Linux active probes and network interface metrics."""

import os
import sys
import time
import socket
from typing import Dict, List, Optional
from precursor.telemetry.schema import TelemetryPoint, MetricQuality, MetricBatch


class LiveTelemetryCollector:
    """Collects real-time network telemetry via socket latency probes and /proc/net/dev."""

    def __init__(
        self,
        target_host: str = "127.0.0.1",
        target_port: int = 80,
        interface_id: str = "eth0",
        poll_interval_seconds: float = 5.0,
    ):
        self.target_host = target_host
        self.target_port = target_port
        self.interface_id = interface_id
        self.poll_interval = poll_interval_seconds
        self._prev_stats: Optional[Dict[str, int]] = None
        self._prev_time: Optional[float] = None

    def probe_latency(self) -> tuple[Optional[float], MetricQuality]:
        """Measure round-trip connection latency via TCP connect probe."""
        start = time.perf_counter()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2.0)
        try:
            sock.connect((self.target_host, self.target_port))
            duration_ms = (time.perf_counter() - start) * 1000.0
            sock.close()
            return round(duration_ms, 2), MetricQuality.GOOD
        except (socket.timeout, ConnectionRefusedError, OSError):
            # If refused, the round-trip still succeeded at the TCP SYN-RST level
            duration_ms = (time.perf_counter() - start) * 1000.0
            sock.close()
            if duration_ms < 2000.0:
                return round(duration_ms, 2), MetricQuality.GOOD
            return None, MetricQuality.MISSING

    def read_interface_stats(self) -> Dict[str, float]:
        """Read rx/tx bytes, errors, and drops from /proc/net/dev on Linux."""
        stats = {"rx_bytes": 0.0, "tx_bytes": 0.0, "rx_errors": 0.0, "rx_drops": 0.0, "link_up": 1.0}
        proc_path = "/proc/net/dev"
        if os.path.exists(proc_path):
            try:
                with open(proc_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                for line in lines[2:]:
                    parts = line.split(":")
                    if len(parts) == 2:
                        iface = parts[0].strip()
                        if iface == self.interface_id or self.interface_id in ("all", "*"):
                            data = parts[1].split()
                            stats["rx_bytes"] += float(data[0])
                            stats["rx_errors"] += float(data[2])
                            stats["rx_drops"] += float(data[3])
                            stats["tx_bytes"] += float(data[8])
            except Exception:
                pass
        return stats

    def collect(self) -> MetricBatch:
        """Execute a single collection sweep and return a MetricBatch."""
        now = time.time()
        rtt, rtt_quality = self.probe_latency()
        stats = self.read_interface_stats()

        points = [
            TelemetryPoint(
                timestamp=now,
                metric_id="latency_ms",
                value=rtt,
                quality=rtt_quality,
                source="live",
                interface_id=self.interface_id,
                labels={"target": f"{self.target_host}:{self.target_port}"},
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
        ]
        return MetricBatch(timestamp=now, source="live", points=points)
