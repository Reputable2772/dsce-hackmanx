"""Incident data models and severity classifications for PRECURSOR."""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from precursor.gate.states import GateState


class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


class Incident(BaseModel):
    """
    Deterministic incident grouping correlated anomalies into actionable operator units.
    Strictly distinguishes active faults from future predicted service impacts.
    """
    id: str = Field(..., description="Unique deterministic incident identifier")
    title: str = Field(..., description="Human-readable incident summary")
    is_active_fault: bool = Field(..., description="True if fault is currently occurring; False if predicting future event")
    predicted_horizon_minutes: Optional[int] = Field(None, description="5, 15, or 30 minutes if predicted; None if active fault")
    primary_metrics: List[str] = Field(default_factory=list, description="Primary metrics in breach")
    supporting_signals: List[str] = Field(default_factory=list, description="Correlated signals or detector names")
    gate_state: GateState = Field(..., description="Reliability gate state at time of evaluation")
    severity: IncidentSeverity = Field(default=IncidentSeverity.WARNING)
    detected_at: float = Field(..., description="Unix epoch timestamp when incident was detected")
    first_seen: Optional[float] = Field(None, description="Timestamp of first detection")
    last_seen: Optional[float] = Field(None, description="Timestamp of most recent detection")
    resolved_at: Optional[float] = Field(None, description="Timestamp when incident was resolved")
    interface_id: str = Field(default="eth0", description="Network interface ID")
    source: str = Field(default="synthetic", description="'synthetic' or 'live'")
    status: str = Field(default="ACTIVE", description="'ACTIVE', 'ACKNOWLEDGED', 'SUPPRESSED', or 'RESOLVED'")
    evidence_summary: Dict[str, Any] = Field(default_factory=dict, description="Numerical evidence snapshot")
