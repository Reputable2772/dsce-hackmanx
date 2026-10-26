"""Fixed SLA Threshold Detector with sustained breach and horizon trend projection."""

import numpy as np

from precursor.detectors.base import BaseDetector, DetectorResult
from precursor.telemetry.buffer import TelemetryBuffer


class FixedSLADetector(BaseDetector):
    """
    Evaluates metric against fixed SLA limits.
    Supports sustained-breach rule (consecutive samples) and linear horizon projection.
    """

    def __init__(
        self,
        metric_id: str,
        threshold: float,
        sustained_samples: int = 3,
        lookback_seconds: float = 300.0,
    ):
        super().__init__(name="fixed_sla", metric_id=metric_id)
        self.threshold = threshold
        self.sustained_samples = sustained_samples
        self.lookback_seconds = lookback_seconds

    def evaluate(
        self,
        buffer: TelemetryBuffer,
        current_time: float,
        horizon_minutes: int = 5,
    ) -> DetectorResult:
        start_time = current_time - self.lookback_seconds
        ts, vals, _ = buffer.get_series(self.metric_id, start_time, current_time)

        # Filter out NaN/missing points
        valid_mask = ~np.isnan(vals)
        valid_vals = vals[valid_mask]
        valid_ts = ts[valid_mask]

        if len(valid_vals) == 0:
            return DetectorResult(
                detector_name=self.name,
                metric_id=self.metric_id,
                horizon_minutes=horizon_minutes,
                predicted_impact=False,
                raw_score=0.0,
                threshold=self.threshold,
                is_sustained=False,
                is_immediate_fault=False,
                evidence={"reason": "no_valid_data"},
            )

        current_val = float(valid_vals[-1])

        # 1. Current sustained breach check
        recent_tail = valid_vals[-self.sustained_samples :]
        is_sustained = len(recent_tail) >= self.sustained_samples and bool(np.all(recent_tail >= self.threshold))

        # 2. Horizon projection check (slope extrapolation)
        predicted_impact = is_sustained
        projected_val = current_val

        if len(valid_vals) >= 4 and not is_sustained:
            # Fit linear trend over recent observations
            time_deltas = valid_ts - valid_ts[0]
            slope, intercept = np.polyfit(time_deltas, valid_vals, deg=1)
            horizon_seconds = horizon_minutes * 60.0
            future_delta = time_deltas[-1] + horizon_seconds
            projected_val = float(slope * future_delta + intercept)

            if slope > 0 and projected_val >= self.threshold:
                predicted_impact = True

        raw_score = current_val

        return DetectorResult(
            detector_name=self.name,
            metric_id=self.metric_id,
            horizon_minutes=horizon_minutes,
            predicted_impact=predicted_impact,
            raw_score=round(raw_score, 3),
            threshold=self.threshold,
            is_sustained=is_sustained,
            is_immediate_fault=False,
            evidence={
                "current_val": round(current_val, 2),
                "projected_val": round(projected_val, 2),
                "threshold": self.threshold,
                "consecutive_breaches": int(np.sum(recent_tail >= self.threshold)),
            },
        )
