"""Evaluation metrics and results data models for PRECURSOR."""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class HorizonEvaluationMetrics(BaseModel):
    """Evaluation metrics for a specific horizon under GATE ON or GATE OFF."""
    horizon_minutes: int
    gate_enabled: bool
    scenario_type: str
    seed: int
    total_events: int = 0
    detected_early_warnings: int = 0
    event_recall: float = 0.0              # Fraction of events with pre-impact warning (0.0 to 1.0)
    false_alarms_total: int = 0
    false_alarms_per_hour: float = 0.0
    average_lead_time_minutes: float = 0.0  # Time between earliest warning and impact onset
    missed_faults: int = 0
    abstention_count: int = 0
    abstention_rate: float = 0.0           # Fraction of simulation steps gate abstained


class ScenarioComparisonResult(BaseModel):
    """Paired comparison of GATE ON vs GATE OFF for a single scenario."""
    scenario_type: str
    seed: int
    gate_on: Dict[int, HorizonEvaluationMetrics]   # horizon_minutes -> metrics
    gate_off: Dict[int, HorizonEvaluationMetrics]  # horizon_minutes -> metrics
    description: str = ""
