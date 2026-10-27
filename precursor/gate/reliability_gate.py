"""Multi-factor Reliability Gate evaluating sensor quality, distribution drift, and residual errors."""

import os
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
        self._nominal_start_time: Optional[float] = None

    def evaluate(
        self,
        buffer: TelemetryBuffer,
        current_time: float,
        target_metrics: Optional[List[str]] = None,
        is_live: bool = False,
    ) -> GateDecision:
        if target_metrics is None:
            target_metrics = [
                "latency_ms",
                "packet_loss_pct",
                "jitter_ms",
                "throughput_mbps",
                "packets_in_sec",
                "icmp_inbound_rate",
                "drops_in",
            ]

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

        # 2. Distribution Shift / Drift Assessment (KS test on latency, throughput, and incoming packet rates)
        max_ks_stat = 0.0
        drift_detected = False

        for metric in ["latency_ms", "throughput_mbps", "packets_in_sec", "icmp_inbound_rate"]:
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

        # 3. Forecast Residual / Variance Expansion Drift Assessment
        residual_score = 0.0
        _, lat_vals, _ = buffer.get_series("latency_ms", current_time - self.lookback_seconds, current_time)
        clean_lat = lat_vals[~np.isnan(lat_vals)]
        if len(clean_lat) >= 15:
            # Check variance expansion on latency
            early_var = np.var(clean_lat[: len(clean_lat) // 2])
            late_var = np.var(clean_lat[len(clean_lat) // 2 :])
            if early_var > 1e-3:
                expansion = float(late_var / early_var)
                residual_score = round(expansion, 2)
                if expansion > self.residual_expansion_threshold:
                    reasons.append(f"Residual variance expansion: {expansion:.1f}x baseline noise")

        # Inbound traffic burst variance check
        _, in_vals, _ = buffer.get_series("packets_in_sec", current_time - self.lookback_seconds, current_time)
        clean_in = in_vals[~np.isnan(in_vals)]
        if len(clean_in) >= 15:
            early_var_in = np.var(clean_in[: len(clean_in) // 2])
            late_var_in = np.var(clean_in[len(clean_in) // 2 :])
            if early_var_in > 50.0:
                expansion_in = float(late_var_in / early_var_in)
                if expansion_in > self.residual_expansion_threshold:
                    reasons.append(f"Inbound packet rate variance surge: {expansion_in:.1f}x baseline")
                    residual_score = max(residual_score, round(expansion_in, 2))

        # Check if other networks/metrics on the node are active and operational
        node_operational = False
        for metric_id in ["packets_in_sec", "packets_out_sec", "throughput_mbps", "icmp_inbound_rate"]:
            _, m_vals, _ = buffer.get_series(metric_id, current_time - self.lookback_seconds, current_time)
            clean_m = m_vals[~np.isnan(m_vals)]
            if len(clean_m) > 0 and np.any(clean_m > 0.0):
                node_operational = True
                break

        # Check if physical link carrier is down (carrier = 0)
        _, link_vals, _ = buffer.get_series("link_state", current_time - 30.0, current_time)
        clean_link = link_vals[~np.isnan(link_vals)]
        link_hard_down = len(clean_link) > 0 and clean_link[-1] <= 0.0

        # Fast-path sysfs check for live mode interface
        if is_live and not link_hard_down:
            recent_live_pts = buffer.get_window(current_time - 10.0, current_time)
            for pt in recent_live_pts:
                if pt.interface_id and pt.interface_id not in ("all", "*", "auto"):
                    flags_p = f"/sys/class/net/{pt.interface_id}/flags"
                    oper_p = f"/sys/class/net/{pt.interface_id}/operstate"
                    carrier_p = f"/sys/class/net/{pt.interface_id}/carrier"
                    if os.path.exists(flags_p):
                        try:
                            f_val = int(open(flags_p, "r").read().strip(), 16)
                            if not (f_val & 0x1):
                                link_hard_down = True
                                break
                        except Exception:
                            pass
                    if not link_hard_down and os.path.exists(oper_p):
                        try:
                            if open(oper_p, "r").read().strip().lower() in ("down", "dormant", "lowerlayerdown", "notpresent"):
                                link_hard_down = True
                                break
                        except Exception:
                            pass
                    if not link_hard_down and os.path.exists(carrier_p):
                        try:
                            if open(carrier_p, "r").read().strip() == "0":
                                link_hard_down = True
                                break
                        except Exception:
                            link_hard_down = True
                            break

        # Check recent 10-second window for sustained normality
        t_recent_10 = current_time - 10.0
        recent_points = buffer.get_window(t_recent_10, current_time)
        is_recent_normal = True
        if not recent_points or link_hard_down or hard_sensor_failure:
            is_recent_normal = False
        else:
            for pt in recent_points:
                if pt.metric_id == "packet_loss_pct" and (pt.value is None or pt.value > 5.0):
                    is_recent_normal = False
                    break
                elif pt.metric_id == "latency_ms" and (pt.value is None or pt.value > 50.0):
                    is_recent_normal = False
                    break
                elif pt.metric_id == "jitter_ms" and (pt.value is not None and pt.value > 10.0):
                    is_recent_normal = False
                    break
                elif pt.metric_id == "icmp_inbound_rate" and (pt.value is not None and pt.value > 2.0):
                    is_recent_normal = False
                    break
                elif pt.metric_id == "link_state" and (pt.value is not None and pt.value < 1.0):
                    is_recent_normal = False
                    break

        if is_recent_normal:
            min_ts = min((pt.timestamp for pt in recent_points), default=current_time)
            has_10s_span = (current_time - min_ts) >= 9.5 and len(recent_points) >= 5
            if self._nominal_start_time is None or current_time < self._nominal_start_time:
                self._nominal_start_time = current_time
        else:
            self._nominal_start_time = None
            has_10s_span = False

        sustained_normality = (
            is_recent_normal and (
                has_10s_span
                or (self._nominal_start_time is not None and (current_time - self._nominal_start_time) >= 10.0)
            )
        )

        # 4. Synthesize Gate State
        if link_hard_down:
            state = GateState.ABSTAIN
            reasons.append("Physical link state hard down (carrier=0): hardware link failure invalidates sensor telemetry.")
            suppressed_metrics.extend(target_metrics)
        elif hard_sensor_failure:
            if is_live and node_operational and unhealthy_ratio < 0.85:
                # Other networks/interfaces are operational on the node: degrade rather than completely abstaining
                state = GateState.DEGRADED
                reasons.append("Peer probe sensor degraded, but node interfaces remain operational: preserving predictions in DEGRADED mode.")
            else:
                state = GateState.ABSTAIN
        elif sustained_normality:
            # Feature: After 10 seconds of normality, return from DEGRADED back to PREDICT
            state = GateState.PREDICT
            reasons = ["Normality sustained for >10s: model predictions restored to PREDICT."]
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
