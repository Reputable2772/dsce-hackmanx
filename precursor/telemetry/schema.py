"""Telemetry data models and quality definitions for PRECURSOR."""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class MetricQuality(str, Enum):
    """Quality classification for telemetry observations."""
    GOOD = "good"
    STALE = "stale"
    MISSING = "missing"
    INVALID = "invalid"


DEFAULT_METRIC_UNITS: Dict[str, str] = {
    "latency_ms": "ms",
    "rtt_ms": "ms",
    "jitter_ms": "ms",
    "packet_loss_pct": "%",
    "throughput_mbps": "Mbps",
    "link_state": "state",
    "drops_in": "packets",
    "rx_drops": "packets",
}


class TelemetryPoint(BaseModel):
    """Atomic telemetry measurement at a specific point in time."""
    timestamp: float = Field(..., description="Unix epoch seconds in UTC")
    metric_id: str = Field(..., description="Unique metric identifier, e.g. 'latency_ms', 'packet_loss_pct'")
    value: Optional[float] = Field(None, description="Observed numeric value; None if missing/invalid")
    unit: Optional[str] = Field(default=None, description="Measurement unit, e.g. 'ms', '%', 'Mbps'")
    quality: MetricQuality = Field(default=MetricQuality.GOOD, description="Sensor observation quality")
    source: str = Field(default="synthetic", description="Data source: 'synthetic' or 'live'")
    node_id: Optional[str] = Field(default="gateway-01", description="Node / host identifier")
    interface_id: Optional[str] = Field(default="eth0", description="Network interface ID, e.g. 'eth0'")
    labels: Dict[str, str] = Field(default_factory=dict, description="Arbitrary metadata key-value tags")

    def model_post_init(self, __context: Any) -> None:
        if self.unit is None:
            self.unit = DEFAULT_METRIC_UNITS.get(self.metric_id, "unknown")

    @property
    def is_usable(self) -> bool:
        """Indicates if the observation is mathematically valid for forecasting."""
        return self.quality == MetricQuality.GOOD and self.value is not None


class MetricBatch(BaseModel):
    """Collection of telemetry points recorded at the same sampling step."""
    timestamp: float = Field(..., description="Unix epoch seconds in UTC")
    source: str = Field(default="synthetic")
    points: List[TelemetryPoint] = Field(default_factory=list)

    def get_metric(self, metric_id: str, interface_id: Optional[str] = None) -> Optional[TelemetryPoint]:
        """Lookup a specific point within the batch."""
        for p in self.points:
            if p.metric_id == metric_id:
                if interface_id is None or p.interface_id == interface_id:
                    return p
        return None
