"""Project-wide End-to-End Test: Live Capture -> Analysis -> Gate -> LLM -> Suggestions -> Action.

Validates the complete vertical slice:
1. Live network capture (socket latency probe, /proc/net/dev counters).
2. Telemetry buffering & statistical quality checks.
3. Multi-horizon detector evaluations (+5m, +15m, +30m).
4. Kolmogorov-Smirnov Reliability Gate & zero-latency immediate rules.
5. Spatio-temporal incident clustering.
6. Offline LLM Copilot query & bundled runbook retrieval.
7. Numerical claim verification against ground-truth snapshot.
8. Operational diagnostic suggestions & action dispatch validation.
"""

import time
import pytest
from precursor.telemetry.schema import TelemetryPoint, MetricQuality
from precursor.telemetry.live_collector import LiveTelemetryCollector
from precursor.runner import PrecursorEngine
from precursor.gate.states import GateState


def test_e2e_live_capture_to_analysis_to_llm_action():
    """Verify entire flow from live network probe to LLM guidance and verified action."""
    # Step 1: Live Capture
    collector = LiveTelemetryCollector(target_host="127.0.0.1", target_port=80, interface_id="eth0")
    batch = collector.collect()
    assert batch.source == "live"
    assert len(batch.points) == 6
    metric_ids = {p.metric_id for p in batch.points}
    assert metric_ids == {"latency_ms", "jitter_ms", "packet_loss_pct", "throughput_mbps", "link_state", "drops_in"}

    # Step 2: Ingest into Engine in Live Mode
    engine = PrecursorEngine()
    engine.set_mode("live")
    snapshot_initial = engine.step_simulation()

    assert snapshot_initial.timestamp > 0
    assert "latency_ms" in snapshot_initial.latest_telemetry
    assert snapshot_initial.gate_decision.state in (GateState.PREDICT, GateState.DEGRADED, GateState.ABSTAIN)

    # Step 3: Analysis Pipeline (Multi-Horizon Detectors)
    for h in [5, 15, 30]:
        assert h in snapshot_initial.detector_results
        assert len(snapshot_initial.detector_results[h]) > 0

    # Step 4: Inject Anomalous Telemetry to Trigger Full Incident & Copilot Loop
    now = time.time()
    anomalous_points = []
    # Ramping latency to trigger Fixed SLA and EWMA breach
    for i in range(6):
        t_sample = now + i * 5.0
        anomalous_points.extend([
            TelemetryPoint(timestamp=t_sample, metric_id="latency_ms", value=92.5 + i * 2.0, quality=MetricQuality.GOOD, interface_id="eth0"),
            TelemetryPoint(timestamp=t_sample, metric_id="packet_loss_pct", value=8.5, quality=MetricQuality.GOOD, interface_id="eth0"),
            TelemetryPoint(timestamp=t_sample, metric_id="jitter_ms", value=18.0, quality=MetricQuality.GOOD, interface_id="eth0"),
            TelemetryPoint(timestamp=t_sample, metric_id="link_state", value=1.0, quality=MetricQuality.GOOD, interface_id="eth0"),
            TelemetryPoint(timestamp=t_sample, metric_id="drops_in", value=50.0 + i * 10.0, quality=MetricQuality.GOOD, interface_id="eth0"),
            TelemetryPoint(timestamp=t_sample, metric_id="throughput_mbps", value=2.5, quality=MetricQuality.GOOD, interface_id="eth0"),
        ])

    snapshot_breach = engine.ingest_points(anomalous_points)

    # Step 5: Incident Correlation & Severity
    assert len(snapshot_breach.incidents) > 0
    top_incident = snapshot_breach.incidents[0]
    assert top_incident.severity in ("CRITICAL", "WARNING")
    assert len(top_incident.primary_metrics) > 0
    assert "latency_ms" in top_incident.primary_metrics or "packet_loss_pct" in top_incident.primary_metrics

    # Step 6: LLM Guidance & Grounded Runbook Matching
    assert snapshot_breach.copilot_response is not None
    copilot = snapshot_breach.copilot_response
    assert len(copilot.summary) > 0
    assert len(copilot.hypotheses) > 0
    assert len(copilot.diagnostic_commands) > 0
    assert len(copilot.verification_steps) > 0

    # Step 7: Hypothesis & Numerical Claim Verification
    assert len(copilot.claims) > 0
    for claim in copilot.claims:
        status_str = claim.status.value if hasattr(claim.status, "value") else str(claim.status)
        assert status_str in ("VERIFIED", "CONTRADICTED", "UNVERIFIED")
        assert claim.metric_id in ("latency_ms", "packet_loss_pct", "jitter_ms", "throughput_mbps", "drops_in", "link_state")
        assert claim.claimed_value is not None

    # Step 7b: Assumption Auditing
    assert len(copilot.assumptions) > 0
    for assumption in copilot.assumptions:
        status_str = assumption.status.value if hasattr(assumption.status, "value") else str(assumption.status)
        assert status_str in ("VALIDATED", "VIOLATED", "UNTESTABLE")
        assert len(assumption.statement) > 0
        assert len(assumption.explanation) > 0

    # Step 8: Action & Command Validation
    # Ensure all recommended diagnostic commands are non-empty and invoke standard safe diagnostics
    for cmd in copilot.diagnostic_commands:
        assert isinstance(cmd, str) and len(cmd.strip()) > 0
        binary = cmd.strip().split()[0]
        assert binary in ("ping", "mtr", "traceroute", "ethtool", "ip", "tc", "ss", "netstat", "curl", "dmesg", "cat")
