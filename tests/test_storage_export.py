"""Tests for PRECURSOR Telemetry Storage, JSON Run Archives, and CSV Export.

Verifies:
1. UTC timestamp formatting and round-trip conversion.
2. Metadata preservation: units, node_id, interface_id, quality flags, labels.
3. CSV export schema and 100% round-trip fidelity.
4. JSON structured run archive preservation of nested timelines (faults, gate, predictions, incidents, copilot, evaluation).
5. Local filesystem persistence (RunStorageManager) without external databases.
6. Scenario run reproducibility across identical seeds.
"""

import os
import json
import tempfile
import pytest

from precursor.telemetry.schema import TelemetryPoint, MetricQuality
from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType
from precursor.storage import (
    export_telemetry_to_csv,
    import_telemetry_from_csv,
    export_run_to_json,
    import_run_from_json,
    RunStorageManager,
    CSV_FIELDNAMES,
    format_utc_iso,
    parse_utc_iso,
)


def test_utc_timestamp_formatting():
    """Verify UTC ISO 8601 formatting and reversible parsing."""
    epoch = 1730000000.125
    iso_str = format_utc_iso(epoch)
    assert iso_str.endswith("Z")
    assert "T" in iso_str

    parsed_epoch = parse_utc_iso(iso_str)
    assert abs(parsed_epoch - epoch) < 0.001


def test_csv_export_schema_and_headers():
    """Verify CSV export contains documented columns and valid format."""
    points = [
        TelemetryPoint(
            timestamp=1730000000.0,
            metric_id="latency_ms",
            value=24.5,
            unit="ms",
            quality=MetricQuality.GOOD,
            node_id="gateway-01",
            interface_id="eth0",
            labels={"scenario": "normal", "probe": "ping"},
        ),
        TelemetryPoint(
            timestamp=1730000005.0,
            metric_id="packet_loss_pct",
            value=None,
            unit="%",
            quality=MetricQuality.MISSING,
            node_id="gateway-01",
            interface_id="eth0",
            labels={"scenario": "normal"},
        ),
    ]

    csv_text = export_telemetry_to_csv(points)
    lines = csv_text.strip().split("\n")
    header = lines[0].split(",")
    assert header == CSV_FIELDNAMES

    # Check row 1
    assert "gateway-01" in lines[1]
    assert "eth0" in lines[1]
    assert "latency_ms" in lines[1]
    assert "24.5" in lines[1]
    assert "ms" in lines[1]
    assert "good" in lines[1]

    # Check row 2 (missing value represented as empty string)
    assert "packet_loss_pct" in lines[2]
    assert "missing" in lines[2]


def test_csv_roundtrip_fidelity():
    """Verify exporting to CSV and importing back preserves all attributes."""
    original_points = [
        TelemetryPoint(
            timestamp=1730000010.0,
            metric_id="throughput_mbps",
            value=450.25,
            unit="Mbps",
            quality=MetricQuality.GOOD,
            node_id="core-router",
            interface_id="eth1",
            labels={"region": "us-east", "env": "prod"},
        ),
        TelemetryPoint(
            timestamp=1730000015.0,
            metric_id="latency_ms",
            value=9999.0,
            unit="ms",
            quality=MetricQuality.INVALID,
            node_id="core-router",
            interface_id="eth1",
            labels={"anomaly": "sensor_error"},
        ),
    ]

    csv_text = export_telemetry_to_csv(original_points)
    reloaded_points = import_telemetry_from_csv(csv_text)

    assert len(reloaded_points) == len(original_points)
    for orig, reloaded in zip(original_points, reloaded_points):
        assert abs(orig.timestamp - reloaded.timestamp) < 0.001
        assert orig.metric_id == reloaded.metric_id
        assert orig.value == reloaded.value
        assert orig.unit == reloaded.unit
        assert orig.quality == reloaded.quality
        assert orig.node_id == reloaded.node_id
        assert orig.interface_id == reloaded.interface_id
        assert orig.labels == reloaded.labels


def test_json_run_archive_nested_structure():
    """Verify full execution run produces structured nested JSON archive."""
    engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    # Fast forward 10 steps (50s)
    for _ in range(10):
        engine.step_simulation()

    archive = engine.build_run_archive()

    # 1. Metadata checks
    assert archive.metadata.scenario_type == ScenarioType.GRADUAL_DEGRADATION.value
    assert archive.metadata.seed == 42
    assert archive.metadata.total_steps == 10
    assert archive.metadata.duration_seconds > 0

    # 2. Fault events
    assert len(archive.fault_events) > 0
    assert archive.fault_events[0].impact_start_seconds == 1200.0

    # 3. Telemetry points preserved
    assert len(archive.telemetry_points) > 0
    assert archive.telemetry_points[0].metric_id in ("latency_ms", "jitter_ms", "packet_loss_pct", "throughput_mbps", "link_state", "drops_in")

    # 4. Gate decision timeline
    assert len(archive.gate_decisions) == 10

    # 5. Serialization and deserialization
    json_text = export_run_to_json(archive)
    reloaded_archive = import_run_from_json(json_text)

    assert reloaded_archive.metadata.run_id == archive.metadata.run_id
    assert len(reloaded_archive.telemetry_points) == len(archive.telemetry_points)
    assert len(reloaded_archive.gate_decisions) == len(archive.gate_decisions)


def test_local_filesystem_persistence(tmp_path):
    """Verify RunStorageManager writes JSON archives and CSV files locally."""
    storage = RunStorageManager(runs_dir=tmp_path / "runs", exports_dir=tmp_path / "exports")

    engine = PrecursorEngine(scenario_type=ScenarioType.SUDDEN_FAILURE, seed=42)
    for _ in range(5):
        engine.step_simulation()

    archive = engine.build_run_archive()
    result = storage.save_run(archive, export_csv=True)

    assert "json_path" in result
    assert "csv_path" in result
    assert os.path.exists(result["json_path"])
    assert os.path.exists(result["csv_path"])

    # Verify listing
    saved_runs = storage.list_saved_runs()
    assert len(saved_runs) == 1
    assert saved_runs[0]["run_id"] == archive.metadata.run_id

    # Verify loading
    loaded = storage.load_run(archive.metadata.run_id)
    assert loaded is not None
    assert loaded.metadata.scenario_type == ScenarioType.SUDDEN_FAILURE.value

    # Verify deletion
    assert storage.delete_run(archive.metadata.run_id) is True
    assert len(storage.list_saved_runs()) == 0


def test_scenario_reproducibility():
    """Verify that identical scenario and seed produce identical exported telemetry."""
    engine1 = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=99)
    engine2 = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=99)

    for _ in range(15):
        engine1.step_simulation()
        engine2.step_simulation()

    csv1 = engine1.export_telemetry_csv()
    csv2 = engine2.export_telemetry_csv()

    assert csv1 == csv2
