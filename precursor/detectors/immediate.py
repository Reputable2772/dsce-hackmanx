"""Immediate Failure Detector for zero-latency hard fault detection."""

from typing import Dict, Any, Optional

from precursor.detectors.base import BaseDetector, DetectorResult
from precursor.telemetry.buffer import TelemetryBuffer


class ImmediateFaultDetector(BaseDetector):
    """
    Detects hard failure events (link-down, tunnel-down, 100% loss) immediately upon arrival.
    Flags is_immediate_fault = True, which bypasses gate suppression in all states.
    """

    def __init__(self, metric_id: str = "link_state", down_value: float = 0.0):
        super().__init__(name="immediate", metric_id=metric_id)
        self.down_value = down_value

    def evaluate(
        self,
        buffer: TelemetryBuffer,
        current_time: float,
        horizon_minutes: int = 5,
    ) -> DetectorResult:
        # Check most recent observations within the last 15 seconds
        start_time = current_time - 15.0
        ts, vals, _ = buffer.get_series(self.metric_id, start_time, current_time)

        if len(vals) == 0:
            return DetectorResult(
                detector_name=self.name,
                metric_id=self.metric_id,
                horizon_minutes=horizon_minutes,
                predicted_impact=False,
                raw_score=0.0,
                threshold=0.5,
                is_sustained=False,
                is_immediate_fault=False,
                evidence={"status": "no_recent_observations"},
            )

        latest_val = float(vals[-1])
        is_fault = bool(latest_val == self.down_value)

        # Check packet loss 100% as secondary immediate fault if this is loss metric
        if self.metric_id == "packet_loss_pct" and latest_val >= 99.0:
            is_fault = True

        return DetectorResult(
            detector_name=self.name,
            metric_id=self.metric_id,
            horizon_minutes=horizon_minutes,
            predicted_impact=is_fault,
            raw_score=1.0 if is_fault else 0.0,
            threshold=0.5,
            is_sustained=is_fault,
            is_immediate_fault=is_fault,
            evidence={
                "metric_id": self.metric_id,
                "latest_val": latest_val,
                "is_fault": is_fault,
                "description": f"Immediate {self.metric_id} failure observed at {round(current_time, 2)}",
            },
        )
