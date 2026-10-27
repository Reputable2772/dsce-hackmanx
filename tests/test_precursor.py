"""Comprehensive test suite for PRECURSOR non-UI engine."""

import pytest

from precursor.telemetry.schema import TelemetryPoint, MetricQuality
from precursor.telemetry.buffer import TelemetryBuffer
from precursor.telemetry.synthetic import (
    SyntheticTelemetryGenerator,
    SyntheticScenarioConfig,
    ScenarioType,
)
from precursor.detectors.fixed_sla import FixedSLADetector
from precursor.detectors.immediate import ImmediateFaultDetector
from precursor.gate.states import GateState
from precursor.gate.reliability_gate import ReliabilityGate
from precursor.incidents.schema import IncidentSeverity
from precursor.incidents.grouper import IncidentGrouper
from precursor.copilot.claim_verifier import NumericalClaimVerifier, ClaimStatus
from precursor.evaluation.benchmark import PairedBenchmarkRunner


# -------------------------------------------------------------
# 1. Telemetry & Buffer Tests
# -------------------------------------------------------------
def test_synthetic_reproducibility():
    """Verify that identical seeds produce bit-for-bit identical telemetry."""
    cfg1 = SyntheticScenarioConfig(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    cfg2 = SyntheticScenarioConfig(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)

    gen1 = SyntheticTelemetryGenerator(cfg1)
    gen2 = SyntheticTelemetryGenerator(cfg2)

    b1 = gen1.generate_all()
    b2 = gen2.generate_all()

    assert len(b1) == len(b2)
    for p1, p2 in zip(b1[50].points, b2[50].points):
        assert p1.metric_id == p2.metric_id
        assert p1.value == p2.value
        assert p1.quality == p2.quality


def test_buffer_sliding_window_and_quality():
    """Verify buffer retention, sliding window query, and quality stats."""
    buf = TelemetryBuffer(max_points=1000, max_retention_seconds=300.0)
    for i in range(10):
        buf.add(TelemetryPoint(timestamp=1000.0 + i * 5, metric_id="rtt", value=20.0 + i, quality=MetricQuality.GOOD))

    # Add 2 missing points
    buf.add(TelemetryPoint(timestamp=1055.0, metric_id="rtt", value=None, quality=MetricQuality.MISSING))
    buf.add(TelemetryPoint(timestamp=1060.0, metric_id="rtt", value=None, quality=MetricQuality.MISSING))

    q = buf.quality_stats(window_seconds=100.0, current_time=1060.0)
    assert q["total_points"] == 12
    assert q["missing_ratio"] == pytest.approx(2 / 12, rel=1e-2)
    assert q["is_sensor_healthy"] is True  # 16.7% < 20% threshold


# -------------------------------------------------------------
# 2. Detector Tests
# -------------------------------------------------------------
def test_fixed_sla_detector_sustained_breach():
    buf = TelemetryBuffer()
    # 2 breaches (not sustained yet for sustained_samples=3)
    buf.add(TelemetryPoint(timestamp=100.0, metric_id="rtt", value=95.0))
    buf.add(TelemetryPoint(timestamp=105.0, metric_id="rtt", value=95.0))
    det = FixedSLADetector(metric_id="rtt", threshold=80.0, sustained_samples=3)
    res1 = det.evaluate(buf, 105.0)
    assert res1.is_sustained is False

    # 3rd breach -> sustained
    buf.add(TelemetryPoint(timestamp=110.0, metric_id="rtt", value=95.0))
    res2 = det.evaluate(buf, 110.0)
    assert res2.is_sustained is True
    assert res2.predicted_impact is True


def test_immediate_fault_detector():
    buf = TelemetryBuffer()
    buf.add(TelemetryPoint(timestamp=100.0, metric_id="link_state", value=1.0))
    det = ImmediateFaultDetector(metric_id="link_state", down_value=0.0)
    assert det.evaluate(buf, 100.0).predicted_impact is False

    # Link drops
    buf.add(TelemetryPoint(timestamp=105.0, metric_id="link_state", value=0.0))
    res = det.evaluate(buf, 105.0)
    assert res.predicted_impact is True
    assert res.is_immediate_fault is True


# -------------------------------------------------------------
# 3. Reliability Gate Tests (All 3 States)
# -------------------------------------------------------------
def test_reliability_gate_three_states():
    gate = ReliabilityGate()

    # 1. PREDICT: Normal baseline
    gen_norm = SyntheticTelemetryGenerator(SyntheticScenarioConfig(scenario_type=ScenarioType.NORMAL_BASELINE))
    buf_norm = TelemetryBuffer()
    for b in gen_norm.generate_all()[:60]: buf_norm.add_batch(b.points)
    dec_norm = gate.evaluate(buf_norm, buf_norm.get_latest_timestamp())
    assert dec_norm.state == GateState.PREDICT

    # 2. ABSTAIN: Sensor degradation
    gen_sensor = SyntheticTelemetryGenerator(SyntheticScenarioConfig(scenario_type=ScenarioType.SENSOR_DEGRADATION))
    buf_sensor = TelemetryBuffer()
    for b in gen_sensor.generate_all(): buf_sensor.add_batch(b.points)
    dec_sensor = gate.evaluate(buf_sensor, buf_sensor.get_latest_timestamp())
    assert dec_sensor.state == GateState.ABSTAIN
    assert len(dec_sensor.reasons) > 0

    # 3. Invariant: Immediate alerts remain active in all states
    assert dec_sensor.immediate_alerts_active is True

    # 4. Recovery: After 10 seconds of normality, gate recovers to PREDICT
    buf_rec = TelemetryBuffer()
    t_start = 2000.0
    for s in range(15):
        t_curr = t_start + s
        buf_rec.add_batch([
            TelemetryPoint(timestamp=t_curr, metric_id="latency_ms", value=15.0, quality=MetricQuality.GOOD),
            TelemetryPoint(timestamp=t_curr, metric_id="packet_loss_pct", value=0.0, quality=MetricQuality.GOOD),
            TelemetryPoint(timestamp=t_curr, metric_id="jitter_ms", value=1.0, quality=MetricQuality.GOOD),
            TelemetryPoint(timestamp=t_curr, metric_id="link_state", value=1.0, quality=MetricQuality.GOOD),
        ])
        gate.evaluate(buf_rec, t_curr)

    dec_recovered = gate.evaluate(buf_rec, t_start + 14.0)
    assert dec_recovered.state == GateState.PREDICT
    assert "Normality sustained for >10s" in dec_recovered.reasons[0]


# -------------------------------------------------------------
# 4. Incident Grouping Tests
# -------------------------------------------------------------
def test_incident_grouping_active_vs_predicted():
    grouper = IncidentGrouper()
    gate_decision = ReliabilityGate().evaluate(TelemetryBuffer(), 100.0)

    # Fake immediate alert and future prediction
    immediate_alert = FixedSLADetector(metric_id="link_state", threshold=0.5).evaluate(TelemetryBuffer(), 100.0)
    immediate_alert.is_immediate_fault = True
    immediate_alert.predicted_impact = True

    future_alert = FixedSLADetector(metric_id="latency_ms", threshold=80.0).evaluate(TelemetryBuffer(), 100.0)
    future_alert.is_immediate_fault = False
    future_alert.predicted_impact = True
    future_alert.horizon_minutes = 15

    results = {
        5: [immediate_alert],
        15: [future_alert],
    }

    incidents = grouper.group(results, gate_decision, current_time=100.0)
    assert len(incidents) == 2

    active = next(i for i in incidents if i.is_active_fault)
    assert active.severity == IncidentSeverity.CRITICAL
    assert active.predicted_horizon_minutes is None

    predicted = next(i for i in incidents if not i.is_active_fault)
    assert predicted.predicted_horizon_minutes == 15
    assert predicted.severity == IncidentSeverity.WARNING


# -------------------------------------------------------------
# 5. Numerical Claim Verifier Tests
# -------------------------------------------------------------
def test_claim_verifier():
    verifier = NumericalClaimVerifier(tolerance=0.10)
    snapshot = {
        "latency_ms": 120.0,
        "packet_loss_pct": 5.0,
        "throughput_mbps": 100.0,
    }

    text = """
    We observed latency of 122ms and packet loss rate of 12%.
    Also jitter was 4ms.
    """
    claims = verifier.verify_response(text, snapshot)
    statuses = {c.metric_id: c.status for c in claims}

    # 122ms vs 120ms -> diff ~1.6% <= 10% -> VERIFIED
    assert statuses.get("latency_ms") == ClaimStatus.VERIFIED

    # 12% vs 5% -> diff 140% > 10% -> CONTRADICTED
    assert statuses.get("packet_loss_pct") == ClaimStatus.CONTRADICTED

    # jitter not in snapshot -> UNVERIFIED
    assert statuses.get("jitter_ms") == ClaimStatus.UNVERIFIED


# -------------------------------------------------------------
# 6. Paired Evaluation Benchmark Tests
# -------------------------------------------------------------
def test_paired_benchmark_scoring():
    runner = PairedBenchmarkRunner(step_interval_seconds=10.0)
    res = runner.run_scenario(ScenarioType.GRADUAL_DEGRADATION, seed=42, duration_seconds=1800.0)

    # Recall must be between 0.0 and 1.0
    assert 0.0 <= res.gate_on[5].event_recall <= 1.0
    assert 0.0 <= res.gate_off[5].event_recall <= 1.0
    # Lead time must be positive for successful warning
    assert res.gate_on[5].average_lead_time_minutes > 0.0
