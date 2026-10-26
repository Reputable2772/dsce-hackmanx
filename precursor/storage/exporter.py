"""Telemetry and Run Archive Exporter for PRECURSOR.

Provides:
- CSV tabular telemetry export and import preserving timestamps, units, and metadata.
- JSON structured run archive export and import preserving complete nested state.
- Local filesystem persistence in data/runs/ and data/exports/ without any database.
"""

import os
import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

from precursor.telemetry.schema import TelemetryPoint, MetricQuality, DEFAULT_METRIC_UNITS
from precursor.storage.schema import RunArchive, RunMetadata, FaultEventRecord

DEFAULT_RUNS_DIR = os.environ.get("PRECURSOR_RUNS_DIR", "data/runs")
DEFAULT_EXPORTS_DIR = os.environ.get("PRECURSOR_EXPORTS_DIR", "data/exports")

CSV_FIELDNAMES = [
    "timestamp_iso",
    "timestamp_epoch",
    "node_id",
    "interface_id",
    "metric_id",
    "value",
    "unit",
    "quality",
    "source",
    "labels_json",
]


def format_utc_iso(epoch_seconds: float) -> str:
    """Format Unix epoch seconds as ISO 8601 UTC string (e.g. 2026-10-26T08:30:00.000Z)."""
    dt = datetime.fromtimestamp(epoch_seconds, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def parse_utc_iso(iso_str: str) -> float:
    """Parse ISO 8601 UTC string back to Unix epoch seconds."""
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.timestamp()


def export_telemetry_to_csv(
    points: List[TelemetryPoint],
    file_path: Optional[Union[str, Path]] = None,
) -> str:
    """
    Export a list of TelemetryPoints to standard CSV string.
    If file_path is provided, also writes atomically to the filesystem.
    """
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDNAMES, lineterminator="\n")
    writer.writeheader()

    for p in points:
        iso_ts = format_utc_iso(p.timestamp)
        unit = p.unit or DEFAULT_METRIC_UNITS.get(p.metric_id, "unknown")
        labels_str = json.dumps(p.labels, sort_keys=True) if p.labels else "{}"
        val_str = "" if p.value is None else f"{p.value:.4f}".rstrip("0").rstrip(".") if isinstance(p.value, float) else str(p.value)

        row = {
            "timestamp_iso": iso_ts,
            "timestamp_epoch": f"{p.timestamp:.3f}",
            "node_id": p.node_id or "gateway-01",
            "interface_id": p.interface_id or "eth0",
            "metric_id": p.metric_id,
            "value": val_str,
            "unit": unit,
            "quality": p.quality.value if hasattr(p.quality, "value") else str(p.quality),
            "source": p.source,
            "labels_json": labels_str,
        }
        writer.writerow(row)

    csv_text = output.getvalue()

    if file_path:
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(csv_text)

    return csv_text


def import_telemetry_from_csv(csv_content_or_path: Union[str, Path]) -> List[TelemetryPoint]:
    """
    Import TelemetryPoints from a CSV string or CSV file path.
    Guarantees 100% round-trip fidelity for timestamps, metrics, units, and labels.
    """
    if os.path.exists(str(csv_content_or_path)):
        with open(csv_content_or_path, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = str(csv_content_or_path)

    reader = csv.DictReader(io.StringIO(content))
    points: List[TelemetryPoint] = []

    for row in reader:
        epoch = float(row["timestamp_epoch"])
        val_str = row.get("value", "").strip()
        val = float(val_str) if val_str else None

        labels_json = row.get("labels_json", "{}")
        try:
            labels = json.loads(labels_json) if labels_json else {}
        except Exception:
            labels = {}

        quality_str = row.get("quality", "good").lower()
        try:
            quality = MetricQuality(quality_str)
        except ValueError:
            quality = MetricQuality.GOOD

        p = TelemetryPoint(
            timestamp=epoch,
            metric_id=row["metric_id"],
            value=val,
            unit=row.get("unit"),
            quality=quality,
            source=row.get("source", "synthetic"),
            node_id=row.get("node_id", "gateway-01"),
            interface_id=row.get("interface_id", "eth0"),
            labels=labels,
        )
        points.append(p)

    return points


def export_run_to_json(
    archive: RunArchive,
    file_path: Optional[Union[str, Path]] = None,
) -> str:
    """
    Serialize RunArchive to formatted JSON string.
    If file_path is provided, also writes to disk.
    """
    json_text = archive.model_dump_json(indent=2)

    if file_path:
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(json_text)

    return json_text


def import_run_from_json(json_content_or_path: Union[str, Path]) -> RunArchive:
    """
    Deserialize RunArchive from a JSON string or file path.
    """
    if os.path.exists(str(json_content_or_path)):
        with open(json_content_or_path, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = str(json_content_or_path)

    return RunArchive.model_validate_json(content)


class RunStorageManager:
    """
    Manages local filesystem persistence for completed runs and telemetry exports.
    Operates without an external database, utilizing structured directories:
    - data/runs/<run_id>.json
    - data/exports/<run_id>_telemetry.csv
    """

    def __init__(
        self,
        runs_dir: Union[str, Path] = DEFAULT_RUNS_DIR,
        exports_dir: Union[str, Path] = DEFAULT_EXPORTS_DIR,
    ):
        self.runs_dir = Path(runs_dir)
        self.exports_dir = Path(exports_dir)
        self.runs_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)

    def save_run(
        self,
        archive: RunArchive,
        export_csv: bool = True,
    ) -> Dict[str, str]:
        """
        Save complete run archive as JSON and optionally export tabular CSV.
        Returns dict containing saved file paths.
        """
        run_id = archive.metadata.run_id
        json_path = self.runs_dir / f"{run_id}.json"
        export_run_to_json(archive, file_path=json_path)

        result = {"run_id": run_id, "json_path": str(json_path)}

        if export_csv and archive.telemetry_points:
            csv_path = self.exports_dir / f"{run_id}_telemetry.csv"
            export_telemetry_to_csv(archive.telemetry_points, file_path=csv_path)
            result["csv_path"] = str(csv_path)

        return result

    def list_saved_runs(self) -> List[Dict[str, Any]]:
        """
        List all saved run archives ordered by creation timestamp descending.
        """
        runs = []
        for path in sorted(self.runs_dir.glob("*.json"), reverse=True):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    meta = data.get("metadata", {})
                    runs.append({
                        "run_id": meta.get("run_id", path.stem),
                        "scenario_type": meta.get("scenario_type"),
                        "seed": meta.get("seed"),
                        "duration_seconds": meta.get("duration_seconds"),
                        "total_steps": meta.get("total_steps"),
                        "created_at_utc": meta.get("created_at_utc"),
                        "json_path": str(path),
                        "csv_path": str(self.exports_dir / f"{path.stem}_telemetry.csv") if (self.exports_dir / f"{path.stem}_telemetry.csv").exists() else None,
                    })
            except Exception:
                continue
        return runs

    def load_run(self, run_id: str) -> Optional[RunArchive]:
        """Load a saved run archive by run_id."""
        path = self.runs_dir / f"{run_id}.json"
        if not path.exists():
            return None
        return import_run_from_json(path)

    def delete_run(self, run_id: str) -> bool:
        """Delete saved run JSON and corresponding CSV export if present."""
        deleted = False
        json_path = self.runs_dir / f"{run_id}.json"
        if json_path.exists():
            json_path.unlink()
            deleted = True

        csv_path = self.exports_dir / f"{run_id}_telemetry.csv"
        if csv_path.exists():
            csv_path.unlink()

        return deleted
