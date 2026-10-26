"""Base detector interface and result definitions for PRECURSOR."""

from abc import ABC, abstractmethod
from typing import Dict, Any
from pydantic import BaseModel, Field

from precursor.telemetry.buffer import TelemetryBuffer


class DetectorResult(BaseModel):
    """Normalized output from any detector evaluated at a specific prediction horizon."""
    detector_name: str = Field(..., description="'fixed_sla', 'ewma', 'forecast_residual', 'immediate'")
    metric_id: str = Field(..., description="Target metric identifier")
    horizon_minutes: int = Field(default=5, description="Prediction horizon: 5, 15, or 30 minutes")
    predicted_impact: bool = Field(..., description="True if service impact is predicted within horizon")
    raw_score: float = Field(..., description="Uncalibrated anomaly score, residual, or z-score")
    threshold: float = Field(..., description="Decision boundary threshold")
    is_sustained: bool = Field(default=False, description="True if anomaly meets sustained breach duration")
    is_immediate_fault: bool = Field(default=False, description="True for explicit zero-latency failure (e.g. link-down)")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Supporting telemetry values and statistics")


class BaseDetector(ABC):
    """Abstract base class for all early warning detectors."""

    def __init__(self, name: str, metric_id: str):
        self.name = name
        self.metric_id = metric_id

    @abstractmethod
    def evaluate(
        self,
        buffer: TelemetryBuffer,
        current_time: float,
        horizon_minutes: int = 5,
    ) -> DetectorResult:
        """
        Evaluate telemetry strictly up to current_time.
        MUST NOT read observations beyond current_time (no future data leakage).
        """
        pass
