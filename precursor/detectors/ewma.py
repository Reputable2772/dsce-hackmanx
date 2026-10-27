"""Exponentially Weighted Moving Average (EWMA) Detector with dynamic variance bands."""

import numpy as np

from precursor.detectors.base import BaseDetector, DetectorResult
from precursor.telemetry.buffer import TelemetryBuffer


class EWMADetector(BaseDetector):
    """
    EWMA with adaptive dynamic variance bands.
    Detects persistent deviations and projects EWMA trajectory over horizon.
    """

    def __init__(
        self,
        metric_id: str,
        alpha: float = 0.2,
        k_sigma: float = 3.0,
        lookback_seconds: float = 600.0,
        min_samples: int = 10,
    ):
        super().__init__(name="ewma", metric_id=metric_id)
        self.alpha = alpha
        self.k_sigma = k_sigma
        self.lookback_seconds = lookback_seconds
        self.min_samples = min_samples

    def evaluate(
        self,
        buffer: TelemetryBuffer,
        current_time: float,
        horizon_minutes: int = 5,
    ) -> DetectorResult:
        start_time = current_time - self.lookback_seconds
        ts, vals, _ = buffer.get_series(self.metric_id, start_time, current_time)

        valid_mask = ~np.isnan(vals)
        valid_vals = vals[valid_mask]
        valid_ts = ts[valid_mask]

        if len(valid_vals) < self.min_samples:
            return DetectorResult(
                detector_name=self.name,
                metric_id=self.metric_id,
                horizon_minutes=horizon_minutes,
                predicted_impact=False,
                raw_score=0.0,
                threshold=self.k_sigma,
                is_sustained=False,
                is_immediate_fault=False,
                evidence={"reason": "insufficient_samples", "sample_count": len(valid_vals)},
            )

        # Compute EWMA series and rolling variance
        n = len(valid_vals)
        ewma_vals = np.zeros(n)
        ewma_vals[0] = valid_vals[0]
        for i in range(1, n):
            ewma_vals[i] = self.alpha * valid_vals[i] + (1 - self.alpha) * ewma_vals[i - 1]

        current_ewma = ewma_vals[-1]
        residuals = valid_vals - ewma_vals
        rolling_std = float(np.std(residuals)) if len(residuals) > 1 else 1.0
        rolling_std = max(rolling_std, 0.2)

        current_val = float(valid_vals[-1])
        z_score = float((current_val - current_ewma) / rolling_std)
        upper_limit = current_ewma + self.k_sigma * rolling_std

        # Immediate breach
        is_breach = current_val > upper_limit

        # Horizon trend: check if EWMA slope is steepening upward
        predicted_impact = is_breach
        projected_ewma = current_ewma

        if len(ewma_vals) >= 5:
            # Fit slope on the last 5 EWMA points
            dt = valid_ts[-5:] - valid_ts[-5]
            slope, _ = np.polyfit(dt, ewma_vals[-5:], deg=1)
            horizon_seconds = horizon_minutes * 60.0
            projected_ewma = float(current_ewma + slope * horizon_seconds)
            projected_z = (projected_ewma - current_ewma) / rolling_std

            if slope > 0 and (projected_ewma > upper_limit or projected_z >= self.k_sigma):
                if projected_ewma > 1.0:
                    predicted_impact = True

        return DetectorResult(
            detector_name=self.name,
            metric_id=self.metric_id,
            horizon_minutes=horizon_minutes,
            predicted_impact=predicted_impact,
            raw_score=round(z_score, 3),
            threshold=round(self.k_sigma, 2),
            is_sustained=is_breach,
            is_immediate_fault=False,
            evidence={
                "current_val": round(current_val, 2),
                "ewma": round(current_ewma, 2),
                "projected_ewma": round(projected_ewma, 2),
                "rolling_std": round(rolling_std, 3),
                "upper_limit": round(upper_limit, 2),
                "z_score": round(z_score, 2),
            },
        )
