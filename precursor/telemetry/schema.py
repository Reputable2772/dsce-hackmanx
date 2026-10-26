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


class TelemetryPoint(BaseModel):
    """Atomic telemetry measurement at a specific point in time."""
    timestamp: float = Field(..., description="Unix epoch seconds in UTC")
    metric_id: str = Field(..., description="Unique metric identifier, e.g. 'rtt_ms', 'packet_loss_pct'")
    value: Optional[float] = Field(None, description="Observed numeric value; None if missing/invalid")
    quality: MetricQuality = Field(default=MetricQuality.GOOD, description="Sensor observation quality")
    source: str = Field(default="synthetic", description="Data source: 'synthetic' or 'live'")
    interface_id: Optional[str] = Field(default=None, description="Network interface ID, e.g. 'eth0'")
    labels: Dict[str, str] = Field(default_factory=dict, description="Arbitrary metadata key-value tags")

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
