"""Forecast-Residual Anomaly Detector."""

from typing import Dict, Any, Optional
import numpy as np

from precursor.detectors.base import BaseDetector, DetectorResult
from precursor.telemetry.buffer import TelemetryBuffer


class ForecastResidualDetector(BaseDetector):
    """
    Lightweight trend projection and residual anomaly scoring.
    Computes 1-step forecast residuals over past window and projects trajectory across horizon.
    """

    def __init__(
        self,
        metric_id: str,
        residual_threshold_factor: float = 2.5,
        lookback_seconds: float = 900.0,
        min_samples: int = 12,
    ):
        super().__init__(name="forecast_residual", metric_id=metric_id)
        self.residual_threshold_factor = residual_threshold_factor
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
                threshold=self.residual_threshold_factor,
                is_sustained=False,
                is_immediate_fault=False,
                evidence={"reason": "insufficient_samples"},
            )

        # Baseline window: first 60% of observations
        n = len(valid_vals)
        split = max(int(n * 0.6), self.min_samples // 2)
        baseline_vals = valid_vals[:split]
        baseline_mean = float(np.mean(baseline_vals))
        baseline_std = float(np.std(baseline_vals))
        baseline_std = max(baseline_std, 1e-3)

        # Fit linear model on recent window
        t_rel = valid_ts - valid_ts[0]
        slope, intercept = np.polyfit(t_rel, valid_vals, deg=1)
        fitted = slope * t_rel + intercept
        residuals = valid_vals - fitted
        rmse = float(np.sqrt(np.mean(residuals**2)))

        # Current residual
        latest_residual = float(valid_vals[-1] - fitted[-1])
        normalized_residual = abs(latest_residual) / max(rmse, 1e-3)

        # Horizon projection
        horizon_seconds = horizon_minutes * 60.0
        future_t = t_rel[-1] + horizon_seconds
        projected_val = float(slope * future_t + intercept)

        # Anomaly condition: either recent residual is huge, or projected value breaches 3 sigma of baseline
        deviation_from_baseline = abs(projected_val - baseline_mean) / baseline_std
        predicted_impact = bool(
            normalized_residual > self.residual_threshold_factor
            or (slope > 0 and deviation_from_baseline > 3.0)
        )

        return DetectorResult(
            detector_name=self.name,
            metric_id=self.metric_id,
            horizon_minutes=horizon_minutes,
            predicted_impact=predicted_impact,
            raw_score=round(normalized_residual, 3),
            threshold=round(self.residual_threshold_factor, 2),
            is_sustained=normalized_residual > self.residual_threshold_factor,
            is_immediate_fault=False,
            evidence={
                "current_val": round(float(valid_vals[-1]), 2),
                "projected_val": round(projected_val, 2),
                "slope": round(float(slope), 4),
                "rmse": round(rmse, 3),
                "latest_residual": round(latest_residual, 3),
                "normalized_residual": round(normalized_residual, 2),
                "deviation_from_baseline": round(deviation_from_baseline, 2),
            },
        )
