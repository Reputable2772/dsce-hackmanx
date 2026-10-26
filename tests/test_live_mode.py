"""Unit tests for PRECURSOR Live Network Mode, live collector, and REST endpoints."""

import time
from precursor.telemetry.schema import TelemetryPoint, MetricQuality
from precursor.telemetry.live_collector import LiveTelemetryCollector
from precursor.runner import PrecursorEngine


def test_live_collector_metrics():
    """Verify LiveTelemetryCollector generates full 6-metric telemetry batch."""
    collector = LiveTelemetryCollector(
        target_host="127.0.0.1",
        target_port=80,
        interface_id="eth0",
    )
    batch1 = collector.collect()
    assert batch1.source == "live"
    assert len(batch1.points) == 6

    metric_ids = {p.metric_id for p in batch1.points}
    expected_ids = {"latency_ms", "jitter_ms", "packet_loss_pct", "throughput_mbps", "link_state", "drops_in"}
    assert metric_ids == expected_ids

    # Second sweep computes jitter and throughput deltas
    time.sleep(0.05)
    batch2 = collector.collect()
    assert len(batch2.points) == 6
    jitter_point = next(p for p in batch2.points if p.metric_id == "jitter_ms")
    assert jitter_point.value is not None
    assert jitter_point.value >= 0.0


def test_engine_live_mode_toggle():
    """Verify PrecursorEngine toggles mode and step_simulation delegates to step_live."""
    engine = PrecursorEngine()
    assert engine.mode == "synthetic"

    # Switch to live mode
    engine.set_mode("live", target_host="127.0.0.1", target_port=80, interface_id="eth0")
    assert engine.mode == "live"
    assert engine.live_collector is not None

    snapshot = engine.step_simulation()
    assert snapshot.timestamp > 0
    assert "latency_ms" in snapshot.latest_telemetry
    assert "link_state" in snapshot.latest_telemetry

    # Switch back to synthetic
    engine.set_mode("synthetic")
    assert engine.mode == "synthetic"


def test_engine_custom_ingest():
    """Verify PrecursorEngine accepts external telemetry batches via ingest_points."""
    engine = PrecursorEngine()
    now = time.time()
    points = [
        TelemetryPoint(
            timestamp=now,
            metric_id="latency_ms",
            value=45.2,
            quality=MetricQuality.GOOD,
            source="custom_probe",
            interface_id="eth0",
        ),
        TelemetryPoint(
            timestamp=now,
            metric_id="link_state",
            value=1.0,
            quality=MetricQuality.GOOD,
            source="custom_probe",
            interface_id="eth0",
        ),
    ]
    snapshot = engine.ingest_points(points)
    assert snapshot.latest_telemetry.get("latency_ms") == 45.2
    assert snapshot.latest_telemetry.get("link_state") == 1.0
