"""Data schemas for PRECURSOR local run archives and export packages."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from precursor.telemetry.schema import TelemetryPoint


class RunMetadata(BaseModel):
    """Metadata describing a synthetic or live execution run."""
    run_id: str = Field(..., description="Unique run identifier (e.g. run_gradual_degradation_seed42_20261026T083000Z)")
    scenario_type: str = Field(..., description="Scenario type identifier")
    seed: int = Field(default=42, description="Random seed")
    interface_id: str = Field(default="eth0", description="Network interface ID")
    node_id: str = Field(default="gateway-01", description="Node identifier")
    start_time_epoch: float = Field(..., description="Run start time in UTC epoch seconds")
    start_time_iso: str = Field(..., description="Run start time in ISO 8601 UTC format")
    end_time_epoch: float = Field(..., description="Run end time in UTC epoch seconds")
    end_time_iso: str = Field(..., description="Run end time in ISO 8601 UTC format")
    total_steps: int = Field(..., description="Total simulation steps executed")
    duration_seconds: float = Field(..., description="Total duration of run in seconds")
    created_at_utc: str = Field(..., description="Archive creation timestamp in ISO 8601 UTC format")


class FaultEventRecord(BaseModel):
    """Ground-truth fault or degradation event specification."""
    scenario_type: str
    impact_start_seconds: Optional[float] = None
    impact_end_seconds: Optional[float] = None
    impact_metric: Optional[str] = None
    sla_breach_threshold: Optional[float] = None
    description: str = ""


class RunArchive(BaseModel):
    """
    Self-contained, nested structured archive of a complete PRECURSOR execution run.
    Contains metadata, ground truth fault events, full telemetry points, gate timeline,
    detector predictions, grouped incidents, copilot outputs, and paired evaluation metrics.
    """
    metadata: RunMetadata
    fault_events: List[FaultEventRecord] = Field(default_factory=list)
    telemetry_summary: Dict[str, Any] = Field(default_factory=dict)
    telemetry_points: List[TelemetryPoint] = Field(default_factory=list)
    gate_decisions: List[Dict[str, Any]] = Field(default_factory=list)
    predictions: List[Dict[str, Any]] = Field(default_factory=list)
    incidents: List[Dict[str, Any]] = Field(default_factory=list)
    copilot_records: List[Dict[str, Any]] = Field(default_factory=list)
    evaluation_results: Optional[Dict[str, Any]] = None
