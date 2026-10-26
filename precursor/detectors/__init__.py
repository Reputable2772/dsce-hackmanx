"""Detectors package for PRECURSOR."""

from .base import BaseDetector, DetectorResult
from .fixed_sla import FixedSLADetector
from .ewma import EWMADetector
from .forecast_residual import ForecastResidualDetector
from .immediate import ImmediateFaultDetector
from .registry import DetectorRegistry

__all__ = [
    "BaseDetector",
    "DetectorResult",
    "FixedSLADetector",
    "EWMADetector",
    "ForecastResidualDetector",
    "ImmediateFaultDetector",
    "DetectorRegistry",
]
