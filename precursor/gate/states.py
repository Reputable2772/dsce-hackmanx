"""Reliability Gate States and Decision schemas."""

from enum import Enum
from typing import List
from pydantic import BaseModel, Field


class GateState(str, Enum):
    """The three discrete states of the PRECURSOR Reliability Gate."""
    PREDICT = "PREDICT"     # High trust: checks pass, predictions presented within validated limits
    DEGRADED = "DEGRADED"   # Lower trust: reliability warnings exist, rule-based monitoring preserved
    ABSTAIN = "ABSTAIN"     # Invalidation: predictions suppressed to prevent misleading the operator


class GateDecision(BaseModel):
    """Evaluation result from the Reliability Gate."""
    state: GateState = Field(..., description="Active gate state: PREDICT, DEGRADED, or ABSTAIN")
    reasons: List[str] = Field(default_factory=list, description="Human-readable reasons for state transition")
    sensor_health_score: float = Field(default=1.0, description="Completeness & quality score (0.0 to 1.0)")
    drift_score: float = Field(default=0.0, description="Distribution drift metric (e.g. KS statistic)")
    residual_error_score: float = Field(default=0.0, description="Normalized forecast error growth")
    suppressed_metrics: List[str] = Field(default_factory=list, description="Metrics whose predictions are withheld")
    immediate_alerts_active: bool = Field(default=True, description="Invariant: immediate rule alerts remain active")
    evaluated_at: float = Field(..., description="Timestamp of gate evaluation")
