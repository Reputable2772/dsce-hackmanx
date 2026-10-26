"""Deterministic synthetic telemetry generator with 8 failure & degradation scenarios."""

from enum import Enum
from typing import List, Optional
import numpy as np
from pydantic import BaseModel

from precursor.telemetry.schema import TelemetryPoint, MetricQuality, MetricBatch


class ScenarioType(str, Enum):
    NORMAL_BASELINE = "normal_baseline"
    GRADUAL_DEGRADATION = "gradual_degradation"
    SUDDEN_FAILURE = "sudden_failure"
    TRAFFIC_SURGE = "traffic_surge"
    SLOW_DRIFT = "slow_drift"
    SENSOR_DEGRADATION = "sensor_degradation"
    OSCILLATING_INSTABILITY = "oscillating_instability"
    POST_FAULT_RECOVERY = "post_fault_recovery"


class SyntheticScenarioConfig(BaseModel):
    """Configuration for a deterministic synthetic simulation run."""
    scenario_type: ScenarioType
    seed: int = 42
    step_seconds: float = 5.0
    total_duration_seconds: float = 3600.0  # 1 hour simulation
    base_latency_ms: float = 22.0
    base_jitter_ms: float = 2.5
    base_packet_loss_pct: float = 0.05
    base_throughput_mbps: float = 120.0
    interface_id: str = "eth0"
    start_timestamp: float = 1730000000.0  # Deterministic reference epoch


class ScenarioGroundTruth(BaseModel):
    """Ground truth event boundaries for evaluation."""
    scenario_type: ScenarioType
    impact_start_seconds: Optional[float] = None
    impact_end_seconds: Optional[float] = None
    impact_metric: Optional[str] = None
    sla_breach_threshold: Optional[float] = None
    description: str = ""


class SyntheticTelemetryGenerator:
    """Generates continuous deterministic telemetry streams with decoupled simulation time."""

    def __init__(self, config: SyntheticScenarioConfig):
        self.config = config
        self.rng = np.random.default_rng(config.seed)
        self.current_time_offset: float = 0.0
        self.ground_truth = self._define_ground_truth()

    def _define_ground_truth(self) -> ScenarioGroundTruth:
        st = self.config.scenario_type
        if st == ScenarioType.NORMAL_BASELINE:
            return ScenarioGroundTruth(
                scenario_type=st,
                description="Healthy nominal operating state with standard jitter."
            )
        elif st == ScenarioType.GRADUAL_DEGRADATION:
            return ScenarioGroundTruth(
                scenario_type=st,
                impact_start_seconds=1200.0,  # SLA breach begins at 20 min (1200s)
                impact_end_seconds=2400.0,
                impact_metric="latency_ms",
                sla_breach_threshold=75.0,
                description="Memory leak / buffer bloat: latency creeps from 22ms to 160ms; SLA breach at t=1200s."
            )
        elif st == ScenarioType.SUDDEN_FAILURE:
            return ScenarioGroundTruth(
                scenario_type=st,
                impact_start_seconds=900.0,   # Cut at 15 min (900s)
                impact_end_seconds=3600.0,
                impact_metric="link_state",
                sla_breach_threshold=0.5,
                description="Physical fiber cut at t=900s: link down, 100% loss."
            )
        elif st == ScenarioType.TRAFFIC_SURGE:
            return ScenarioGroundTruth(
                scenario_type=st,
                impact_start_seconds=600.0,   # Surge 10m to 18m
                impact_end_seconds=1080.0,
                impact_metric="throughput_mbps",
                sla_breach_threshold=400.0,
                description="Benign high-volume backup job; throughput surges, transient latency bump, no service failure."
            )
        elif st == ScenarioType.SLOW_DRIFT:
            return ScenarioGroundTruth(
                scenario_type=st,
                impact_start_seconds=2700.0,  # Breaches SLA near 45 min
                impact_end_seconds=3600.0,
                impact_metric="latency_ms",
                sla_breach_threshold=65.0,
                description="Cooling failure causes hardware throttling; latency steadily drifts upward over 60 min."
            )
        elif st == ScenarioType.SENSOR_DEGRADATION:
            return ScenarioGroundTruth(
                scenario_type=st,
                impact_start_seconds=600.0,
                impact_end_seconds=3600.0,
                impact_metric="sensor_quality",
                description="Corrupted telemetry agent; 50% missing samples, stale timestamps, invalid outlier values."
            )
        elif st == ScenarioType.OSCILLATING_INSTABILITY:
            return ScenarioGroundTruth(
                scenario_type=st,
                impact_start_seconds=600.0,
                impact_end_seconds=3600.0,
                impact_metric="packet_loss_pct",
                sla_breach_threshold=10.0,
                description="BGP / route flap causing intermittent 45s blackouts every 3 minutes."
            )
        elif st == ScenarioType.POST_FAULT_RECOVERY:
            return ScenarioGroundTruth(
                scenario_type=st,
                impact_start_seconds=800.0,
                impact_end_seconds=1600.0,
                impact_metric="latency_ms",
                sla_breach_threshold=80.0,
                description="Congestion builds at t=800s, hard failure at t=1200s, rerouted & recovered at t=1600s."
            )
        return ScenarioGroundTruth(scenario_type=st, description="Generic scenario")

    def reset(self) -> None:
        """Reset simulation state to time 0."""
        self.rng = np.random.default_rng(self.config.seed)
        self.current_time_offset = 0.0

    def step(self, dt: Optional[float] = None) -> MetricBatch:
        """Advance simulation by dt seconds and yield the next MetricBatch."""
        step_dt = dt if dt is not None else self.config.step_seconds
        t_sim = self.current_time_offset
        self.current_time_offset += step_dt
        epoch_ts = self.config.start_timestamp + t_sim

        points = self._compute_metrics_at(t_sim, epoch_ts)
        return MetricBatch(timestamp=epoch_ts, source="synthetic", points=points)

    def generate_all(self) -> List[MetricBatch]:
        """Pre-generate all batches across the entire scenario duration."""
        self.reset()
        batches = []
        n_steps = int(self.config.total_duration_seconds / self.config.step_seconds)
        for _ in range(n_steps):
            batches.append(self.step())
        return batches

    def _compute_metrics_at(self, t: float, epoch_ts: float) -> List[TelemetryPoint]:
        st = self.config.scenario_type
        iface = self.config.interface_id

        # Nominal baselines + natural gaussian perturbations
        rtt = max(5.0, self.config.base_latency_ms + self.rng.normal(0, 1.2))
        jitter = max(0.2, self.config.base_jitter_ms + self.rng.normal(0, 0.4))
        loss = max(0.0, min(100.0, self.config.base_packet_loss_pct + max(0.0, self.rng.normal(0, 0.03))))
        tput = max(10.0, self.config.base_throughput_mbps + self.rng.normal(0, 4.0))
        link_state = 1.0  # 1.0 = UP, 0.0 = DOWN
        rx_drops = 0.0
        quality = MetricQuality.GOOD

        # Scenario specific dynamics
        if st == ScenarioType.NORMAL_BASELINE:
            pass

        elif st == ScenarioType.GRADUAL_DEGRADATION:
            # Latency begins gradual ramp at t=600s (10m), breaches SLA at t=1200s (20m)
            if t >= 600.0:
                progress = min(1.0, (t - 600.0) / 1200.0)  # ramps over 20 min
                rtt += progress * 140.0                     # climbs from 22ms up to 162ms
                jitter += progress * 18.0
                loss += progress * 12.0
                rx_drops += int(progress * 45)

        elif st == ScenarioType.SUDDEN_FAILURE:
            # Abrupt link failure at t=900s (15m)
            if t >= 900.0:
                link_state = 0.0
                loss = 100.0
                rtt = 0.0
                jitter = 0.0
                tput = 0.0
                rx_drops += 200.0

        elif st == ScenarioType.TRAFFIC_SURGE:
            # Benign load burst between 600s and 1080s
            if 600.0 <= t <= 1080.0:
                surge_prog = np.sin((t - 600.0) / 480.0 * np.pi)
                tput += surge_prog * 350.0  # surges up to 470 Mbps
                rtt += surge_prog * 22.0    # transient rise to ~44ms (safe under SLA)
                jitter += surge_prog * 4.0

        elif st == ScenarioType.SLOW_DRIFT:
            # Very slow linear drift over full hour
            drift_factor = t / 3600.0
            rtt += drift_factor * 55.0      # climbs to ~77ms by hour 1
            jitter += drift_factor * 6.0

        elif st == ScenarioType.SENSOR_DEGRADATION:
            # Corrupted sensor readings starting at t=600s
            if t >= 600.0:
                rand_val = self.rng.random()
                if rand_val < 0.35:
                    quality = MetricQuality.MISSING
                elif rand_val < 0.55:
                    quality = MetricQuality.STALE
                elif rand_val < 0.70:
                    quality = MetricQuality.INVALID
                    rtt = 9999.0  # nonsensical outlier

        elif st == ScenarioType.OSCILLATING_INSTABILITY:
            # Flaps every 180s for 40s duration starting at t=600s
            if t >= 600.0:
                cycle_pos = (t - 600.0) % 180.0
                if cycle_pos < 40.0:
                    link_state = 0.0
                    loss = 80.0 + self.rng.uniform(0, 20.0)
                    rtt = 150.0 + self.rng.uniform(0, 50.0)
                    rx_drops += 50.0

        elif st == ScenarioType.POST_FAULT_RECOVERY:
            # Degradation at 800s, fault at 1200s, recovery at 1600s
            if 800.0 <= t < 1200.0:
                prog = (t - 800.0) / 400.0
                rtt += prog * 100.0
                loss += prog * 15.0
            elif 1200.0 <= t < 1600.0:
                link_state = 0.0
                loss = 100.0
                rtt = 0.0
            elif t >= 1600.0:
                # Recovered back to baseline
                pass

        # Build TelemetryPoints
        points = [
            TelemetryPoint(
                timestamp=epoch_ts,
                metric_id="latency_ms",
                value=None if quality == MetricQuality.MISSING else round(float(rtt), 2),
                quality=quality,
                source="synthetic",
                interface_id=iface,
                labels={"scenario": st.value, "target": "gateway"},
            ),
            TelemetryPoint(
                timestamp=epoch_ts,
                metric_id="jitter_ms",
                value=None if quality == MetricQuality.MISSING else round(float(jitter), 2),
                quality=quality,
                source="synthetic",
                interface_id=iface,
                labels={"scenario": st.value, "target": "gateway"},
            ),
            TelemetryPoint(
                timestamp=epoch_ts,
                metric_id="packet_loss_pct",
                value=None if quality == MetricQuality.MISSING else round(float(loss), 2),
                quality=quality,
                source="synthetic",
                interface_id=iface,
                labels={"scenario": st.value, "target": "gateway"},
            ),
            TelemetryPoint(
                timestamp=epoch_ts,
                metric_id="throughput_mbps",
                value=None if quality == MetricQuality.MISSING else round(float(tput), 2),
                quality=quality,
                source="synthetic",
                interface_id=iface,
                labels={"scenario": st.value},
            ),
            TelemetryPoint(
                timestamp=epoch_ts,
                metric_id="link_state",
                value=float(link_state),
                quality=MetricQuality.GOOD,
                source="synthetic",
                interface_id=iface,
                labels={"scenario": st.value},
            ),
            TelemetryPoint(
                timestamp=epoch_ts,
                metric_id="drops_in",
                value=float(rx_drops),
                quality=quality,
                source="synthetic",
                interface_id=iface,
                labels={"scenario": st.value},
            ),
        ]
        return points
