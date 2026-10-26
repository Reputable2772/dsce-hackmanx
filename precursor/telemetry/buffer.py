"""Sliding in-memory ring buffer for telemetry streams with quality diagnostics."""

from collections import deque
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd

from precursor.telemetry.schema import TelemetryPoint, MetricQuality


class TelemetryBuffer:
    """Thread-safe in-memory ring buffer maintaining a rolling time window of telemetry."""

    def __init__(self, max_points: int = 50000, max_retention_seconds: float = 7200.0):
        self.max_points = max_points
        self.max_retention_seconds = max_retention_seconds
        self._buffer: deque[TelemetryPoint] = deque(maxlen=max_points)

    def add(self, point: TelemetryPoint) -> None:
        """Append a telemetry point and prune aged entries beyond retention window."""
        self._buffer.append(point)
        cutoff = point.timestamp - self.max_retention_seconds
        while self._buffer and self._buffer[0].timestamp < cutoff:
            self._buffer.popleft()

    def add_batch(self, points: List[TelemetryPoint]) -> None:
        """Add multiple points to the buffer."""
        for p in points:
            self.add(p)

    def get_window(
        self,
        start_time: float,
        end_time: float,
        metric_id: Optional[str] = None,
        interface_id: Optional[str] = None,
    ) -> List[TelemetryPoint]:
        """Extract all points within [start_time, end_time]."""
        results: List[TelemetryPoint] = []
        for p in self._buffer:
            if start_time <= p.timestamp <= end_time:
                if metric_id is not None and p.metric_id != metric_id:
                    continue
                if interface_id is not None and p.interface_id != interface_id:
                    continue
                results.append(p)
        return results

    def get_latest_timestamp(self) -> Optional[float]:
        """Return the most recent timestamp in the buffer."""
        if self._buffer:
            return self._buffer[-1].timestamp
        return None

    def get_series(
        self,
        metric_id: str,
        start_time: float,
        end_time: float,
        interface_id: Optional[str] = None,
    ) -> tuple[np.ndarray, np.ndarray, List[MetricQuality]]:
        """Return (timestamps, values, qualities) as numpy arrays for rapid vectorized operations."""
        points = self.get_window(start_time, end_time, metric_id=metric_id, interface_id=interface_id)
        if not points:
            return np.array([]), np.array([]), []

        ts = np.array([p.timestamp for p in points], dtype=np.float64)
        vals = np.array([np.nan if p.value is None else p.value for p in points], dtype=np.float64)
        quals = [p.quality for p in points]
        return ts, vals, quals

    def get_df(
        self,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        metric_id: Optional[str] = None,
    ) -> pd.DataFrame:
        """Convert buffer window to pandas DataFrame."""
        if not self._buffer:
            return pd.DataFrame(columns=["timestamp", "metric_id", "value", "quality", "source", "interface_id"])

        t_end = end_time if end_time is not None else self._buffer[-1].timestamp
        t_start = start_time if start_time is not None else (t_end - self.max_retention_seconds)

        records = [
            {
                "timestamp": p.timestamp,
                "metric_id": p.metric_id,
                "value": p.value,
                "quality": p.quality.value,
                "source": p.source,
                "interface_id": p.interface_id,
            }
            for p in self._buffer
            if t_start <= p.timestamp <= t_end and (metric_id is None or p.metric_id == metric_id)
        ]
        return pd.DataFrame(records)

    def quality_stats(self, window_seconds: float = 300.0, current_time: Optional[float] = None) -> Dict[str, Any]:
        """Compute sensor quality metrics over the most recent time window."""
        if not self._buffer:
            return {
                "total_points": 0,
                "good_ratio": 1.0,
                "missing_ratio": 0.0,
                "stale_ratio": 0.0,
                "invalid_ratio": 0.0,
                "is_sensor_healthy": True,
            }

        t_now = current_time if current_time is not None else self._buffer[-1].timestamp
        t_start = t_now - window_seconds
        points = [p for p in self._buffer if t_start <= p.timestamp <= t_now]

        if not points:
            return {
                "total_points": 0,
                "good_ratio": 0.0,
                "missing_ratio": 1.0,
                "stale_ratio": 0.0,
                "invalid_ratio": 0.0,
                "is_sensor_healthy": False,
            }

        total = len(points)
        good = sum(1 for p in points if p.quality == MetricQuality.GOOD and p.value is not None)
        missing = sum(1 for p in points if p.quality == MetricQuality.MISSING or p.value is None)
        stale = sum(1 for p in points if p.quality == MetricQuality.STALE)
        invalid = sum(1 for p in points if p.quality == MetricQuality.INVALID)

        good_ratio = good / total
        missing_ratio = missing / total
        stale_ratio = stale / total
        invalid_ratio = invalid / total

        # Sensor considered degraded if missing/invalid > 20%, or unhealthy if > 40%
        is_healthy = (missing_ratio + invalid_ratio + stale_ratio) < 0.20

        return {
            "total_points": total,
            "good_ratio": good_ratio,
            "missing_ratio": missing_ratio,
            "stale_ratio": stale_ratio,
            "invalid_ratio": invalid_ratio,
            "is_sensor_healthy": is_healthy,
        }

    def clear(self) -> None:
        """Clear the buffer."""
        self._buffer.clear()
