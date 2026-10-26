"""Detector Registry orchestrating multi-horizon detector evaluations."""

from typing import Dict, List, Optional
from precursor.detectors.base import BaseDetector, DetectorResult
from precursor.detectors.fixed_sla import FixedSLADetector
from precursor.detectors.ewma import EWMADetector
from precursor.detectors.forecast_residual import ForecastResidualDetector
from precursor.detectors.immediate import ImmediateFaultDetector
from precursor.telemetry.buffer import TelemetryBuffer


class DetectorRegistry:
    """Manages detector instances and runs evaluations across 5m, 15m, and 30m horizons."""

    def __init__(self):
        self.detectors: List[BaseDetector] = []
        self._init_default_detectors()

    def _init_default_detectors(self):
        # 1. Fixed SLA Detectors (Tuned for LAN and live operational early warning)
        self.detectors.append(FixedSLADetector(metric_id="latency_ms", threshold=50.0, sustained_samples=2))
        self.detectors.append(FixedSLADetector(metric_id="packet_loss_pct", threshold=5.0, sustained_samples=2))
        self.detectors.append(FixedSLADetector(metric_id="jitter_ms", threshold=10.0, sustained_samples=2))
        self.detectors.append(FixedSLADetector(metric_id="drops_in", threshold=20.0, sustained_samples=2))

        # 2. EWMA Detectors with adaptive dynamic bands
        self.detectors.append(EWMADetector(metric_id="latency_ms", alpha=0.2, k_sigma=3.0))
        self.detectors.append(EWMADetector(metric_id="packet_loss_pct", alpha=0.2, k_sigma=3.0))
        self.detectors.append(EWMADetector(metric_id="jitter_ms", alpha=0.2, k_sigma=3.0))

        # 3. Forecast-Residual Detectors
        self.detectors.append(ForecastResidualDetector(metric_id="latency_ms", residual_threshold_factor=2.5))
        self.detectors.append(ForecastResidualDetector(metric_id="packet_loss_pct", residual_threshold_factor=2.5))

        # 4. Immediate Rule Detectors (zero-latency alerts)
        self.detectors.append(ImmediateFaultDetector(metric_id="link_state", down_value=0.0))
        self.detectors.append(ImmediateFaultDetector(metric_id="packet_loss_pct", down_value=100.0))

    def add_detector(self, detector: BaseDetector):
        self.detectors.append(detector)

    def evaluate_horizons(
        self,
        buffer: TelemetryBuffer,
        current_time: float,
        horizons: Optional[List[int]] = None,
    ) -> Dict[int, List[DetectorResult]]:
        """
        Evaluate all detectors at each specified horizon (default [5, 15, 30]).
        Returns mapping: horizon_minutes -> List[DetectorResult].
        """
        if horizons is None:
            horizons = [5, 15, 30]

        results_by_horizon: Dict[int, List[DetectorResult]] = {h: [] for h in horizons}

        for h in horizons:
            for det in self.detectors:
                # Immediate detector is horizon-independent, but evaluated alongside
                res = det.evaluate(buffer, current_time, horizon_minutes=h)
                results_by_horizon[h].append(res)

        return results_by_horizon
