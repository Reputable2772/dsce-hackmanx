"""Multi-factor Reliability Gate evaluating sensor quality, distribution drift, and residual errors."""

from typing import List, Optional
import numpy as np
from scipy.stats import ks_2samp

from precursor.gate.states import GateState, GateDecision
from precursor.telemetry.buffer import TelemetryBuffer


class ReliabilityGate:
    """
    Evidence-based gate evaluating whether model predictions are trustworthy.
    Transitions dynamically between PREDICT, DEGRADED, and ABSTAIN.
    Immediate rule-based fault detection continues in every gate state.
    """

    def __init__(
        self,
        sensor_degraded_threshold: float = 0.20,
        sensor_abstain_threshold: float = 0.50,
        drift_ks_threshold: float = 0.65,
        residual_expansion_threshold: float = 3.5,
        lookback_seconds: float = 600.0,
        baseline_duration_seconds: float = 1200.0,
    ):
        self.sensor_degraded_threshold = sensor_degraded_threshold
        self.sensor_abstain_threshold = sensor_abstain_threshold
        self.drift_ks_threshold = drift_ks_threshold
        self.residual_expansion_threshold = residual_expansion_threshold
        self.lookback_seconds = lookback_seconds
        self.baseline_duration_seconds = baseline_duration_seconds

    def evaluate(
        self,
        buffer: TelemetryBuffer,
        current_time: float,
        target_metrics: Optional[List[str]] = None,
    ) -> GateDecision:
        if target_metrics is None:
            target_metrics = ["latency_ms", "packet_loss_pct", "jitter_ms", "throughput_mbps"]

        reasons: List[str] = []
        suppressed_metrics: List[str] = []

        # 1. Sensor Health Assessment
        q_stats = buffer.quality_stats(window_seconds=self.lookback_seconds, current_time=current_time)
        unhealthy_ratio = q_stats["missing_ratio"] + q_stats["invalid_ratio"] + q_stats["stale_ratio"]
        sensor_health_score = max(0.0, 1.0 - unhealthy_ratio)

        hard_sensor_failure = unhealthy_ratio >= self.sensor_abstain_threshold
        mild_sensor_degraded = unhealthy_ratio >= self.sensor_degraded_threshold

        if hard_sensor_failure:
            reasons.append(
                f"Sensor quality failure: {round(unhealthy_ratio * 100, 1)}% missing/stale/invalid observations"
            )
            suppressed_metrics.extend(target_metrics)
        elif mild_sensor_degraded:
            reasons.append(
                f"Sensor degradation warning: {round(unhealthy_ratio * 100, 1)}% degraded observations"
            )

        # 2. Distribution Shift / Drift Assessment (KS test on latency_ms and throughput_mbps)
        max_ks_stat = 0.0
        drift_detected = False

        for metric in ["latency_ms", "throughput_mbps"]:
            t_base_start = max(0.0, current_time - 3600.0)
            t_base_end = t_base_start + self.baseline_duration_seconds
            _, base_vals, _ = buffer.get_series(metric, t_base_start, t_base_end)

            t_recent_start = current_time - self.lookback_seconds
            _, recent_vals, _ = buffer.get_series(metric, t_recent_start, current_time)

            base_clean = base_vals[~np.isnan(base_vals)]
            recent_clean = recent_vals[~np.isnan(recent_vals)]

            if len(base_clean) >= 20 and len(recent_clean) >= 20:
                ks_res = ks_2samp(base_clean, recent_clean)
                stat = float(ks_res.statistic)
                p_val = float(ks_res.pvalue)
                max_ks_stat = max(max_ks_stat, stat)

                if stat > self.drift_ks_threshold and p_val < 0.01:
                    drift_detected = True
                    reasons.append(
                        f"Distribution drift on {metric}: KS-statistic={round(stat, 3)} (p={round(p_val, 4)})"
                    )

        # 3. Forecast Residual Drift Assessment
        residual_score = 0.0
        _, lat_vals, _ = buffer.get_series("latency_ms", current_time - self.lookback_seconds, current_time)
        clean_lat = lat_vals[~np.isnan(lat_vals)]
        if len(clean_lat) >= 15:
            # Check variance expansion
            early_var = np.var(clean_lat[: len(clean_lat) // 2])
            late_var = np.var(clean_lat[len(clean_lat) // 2 :])
            if early_var > 1e-3:
                expansion = float(late_var / early_var)
                residual_score = round(expansion, 2)
                if expansion > self.residual_expansion_threshold:
                    reasons.append(f"Residual variance expansion: {expansion:.1f}x baseline noise")

        # 4. Synthesize Gate State
        if hard_sensor_failure:
            state = GateState.ABSTAIN
        elif mild_sensor_degraded or drift_detected or residual_score > self.residual_expansion_threshold:
            state = GateState.DEGRADED
        else:
            state = GateState.PREDICT

        if state == GateState.PREDICT and not reasons:
            reasons.append("All reliability checks passed. Model predictions validated within operational bounds.")

        return GateDecision(
            state=state,
            reasons=reasons,
            sensor_health_score=round(sensor_health_score, 3),
            drift_score=round(max_ks_stat, 3),
            residual_error_score=residual_score,
            suppressed_metrics=suppressed_metrics,
            immediate_alerts_active=True,  # Invariant: immediate rule alerts continue in every state
            evaluated_at=current_time,
        )
