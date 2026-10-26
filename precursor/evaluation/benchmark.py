"""Paired Evaluation Benchmark Runner comparing GATE ON vs GATE OFF."""

import os
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

from precursor.telemetry.schema import TelemetryPoint
from precursor.telemetry.buffer import TelemetryBuffer
from precursor.telemetry.synthetic import (
    SyntheticTelemetryGenerator,
    SyntheticScenarioConfig,
    ScenarioType,
    ScenarioGroundTruth,
)
from precursor.detectors.registry import DetectorRegistry
from precursor.gate.reliability_gate import ReliabilityGate
from precursor.gate.states import GateState
from precursor.evaluation.metrics import HorizonEvaluationMetrics, ScenarioComparisonResult


class PairedBenchmarkRunner:
    """
    Executes identical synthetic scenarios under both GATE ON and GATE OFF configurations.
    Applies strict scoring policy to quantify warning lead time, recall, false alarms, and abstention.
    """

    def __init__(self, step_interval_seconds: float = 5.0):
        self.step_interval_seconds = step_interval_seconds
        self.registry = DetectorRegistry()
        self.gate = ReliabilityGate()

    def run_scenario(
        self,
        scenario_type: ScenarioType,
        seed: int = 42,
        duration_seconds: float = 2400.0,  # 40 minutes standard benchmark duration
        horizons: Optional[List[int]] = None,
    ) -> ScenarioComparisonResult:
        if horizons is None:
            horizons = [5, 15, 30]

        config = SyntheticScenarioConfig(
            scenario_type=scenario_type,
            seed=seed,
            step_seconds=self.step_interval_seconds,
            total_duration_seconds=duration_seconds,
        )
        gen = SyntheticTelemetryGenerator(config)
        ground_truth = gen.ground_truth
        batches = gen.generate_all()

        # Storage for tracking detections
        # Per horizon: [early_warning_fired, earliest_alert_time, false_alarms, abstentions]
        stats_on = {h: {"early": False, "first_ts": None, "fa": 0, "abstain": 0} for h in horizons}
        stats_off = {h: {"early": False, "first_ts": None, "fa": 0, "abstain": 0} for h in horizons}

        sim_start = config.start_timestamp
        impact_start_ts = (
            (sim_start + ground_truth.impact_start_seconds)
            if ground_truth.impact_start_seconds is not None
            else None
        )

        buffer = TelemetryBuffer(max_points=20000, max_retention_seconds=duration_seconds)
        total_steps = len(batches)

        # Step-by-step causal simulation (strictly NO future data passed)
        for batch in batches:
            buffer.add_batch(batch.points)
            t_now = batch.timestamp

            # Evaluate detectors at t_now
            results_by_h = self.registry.evaluate_horizons(buffer, t_now, horizons=horizons)
            # Evaluate gate at t_now
            gate_decision = self.gate.evaluate(buffer, t_now)

            is_abstain = gate_decision.state == GateState.ABSTAIN

            for h in horizons:
                horizon_sec = h * 60.0
                results = results_by_h[h]
                has_prediction = any(r.predicted_impact and not r.is_immediate_fault for r in results)

                # --- GATE ON evaluation ---
                if is_abstain:
                    stats_on[h]["abstain"] += 1
                    # In GATE ON, prediction is withheld when gate abstains
                    gate_on_alert = False
                else:
                    gate_on_alert = has_prediction

                if gate_on_alert:
                    self._process_alert(t_now, impact_start_ts, horizon_sec, stats_on[h])

                # --- GATE OFF evaluation ---
                # Gate is completely bypassed: raw detector output is shown unconditionally
                if has_prediction:
                    self._process_alert(t_now, impact_start_ts, horizon_sec, stats_off[h])

        # Synthesize metrics for both modes
        total_hours = duration_seconds / 3600.0
        has_true_event = impact_start_ts is not None

        metrics_on: Dict[int, HorizonEvaluationMetrics] = {}
        metrics_off: Dict[int, HorizonEvaluationMetrics] = {}

        for h in horizons:
            # GATE ON
            lead_on = (
                (impact_start_ts - stats_on[h]["first_ts"]) / 60.0
                if (stats_on[h]["early"] and impact_start_ts and stats_on[h]["first_ts"])
                else 0.0
            )
            recall_on = 1.0 if (has_true_event and stats_on[h]["early"]) else (0.0 if has_true_event else 1.0)
            missed_on = 1 if (has_true_event and not stats_on[h]["early"]) else 0

            metrics_on[h] = HorizonEvaluationMetrics(
                horizon_minutes=h,
                gate_enabled=True,
                scenario_type=scenario_type.value,
                seed=seed,
                total_events=1 if has_true_event else 0,
                detected_early_warnings=1 if stats_on[h]["early"] else 0,
                event_recall=round(recall_on, 3),
                false_alarms_total=stats_on[h]["fa"],
                false_alarms_per_hour=round(stats_on[h]["fa"] / total_hours, 2),
                average_lead_time_minutes=round(lead_on, 2),
                missed_faults=missed_on,
                abstention_count=stats_on[h]["abstain"],
                abstention_rate=round(stats_on[h]["abstain"] / total_steps, 3),
            )

            # GATE OFF
            lead_off = (
                (impact_start_ts - stats_off[h]["first_ts"]) / 60.0
                if (stats_off[h]["early"] and impact_start_ts and stats_off[h]["first_ts"])
                else 0.0
            )
            recall_off = 1.0 if (has_true_event and stats_off[h]["early"]) else (0.0 if has_true_event else 1.0)
            missed_off = 1 if (has_true_event and not stats_off[h]["early"]) else 0

            metrics_off[h] = HorizonEvaluationMetrics(
                horizon_minutes=h,
                gate_enabled=False,
                scenario_type=scenario_type.value,
                seed=seed,
                total_events=1 if has_true_event else 0,
                detected_early_warnings=1 if stats_off[h]["early"] else 0,
                event_recall=round(recall_off, 3),
                false_alarms_total=stats_off[h]["fa"],
                false_alarms_per_hour=round(stats_off[h]["fa"] / total_hours, 2),
                average_lead_time_minutes=round(lead_off, 2),
                missed_faults=missed_off,
                abstention_count=0,
                abstention_rate=0.0,
            )

        return ScenarioComparisonResult(
            scenario_type=scenario_type.value,
            seed=seed,
            gate_on=metrics_on,
            gate_off=metrics_off,
            description=ground_truth.description,
        )

    def _process_alert(
        self,
        t_now: float,
        impact_start_ts: Optional[float],
        horizon_sec: float,
        stats: Dict[str, Any],
    ) -> None:
        if impact_start_ts is None:
            # No fault in this scenario -> alert is false alarm
            stats["fa"] += 1
            return

        # Pre-impact early warning window: [impact - horizon, impact]
        window_start = impact_start_ts - horizon_sec
        if window_start <= t_now < impact_start_ts:
            if not stats["early"]:
                stats["early"] = True
                stats["first_ts"] = t_now
        elif t_now < window_start:
            # Too early -> premature false alarm
            stats["fa"] += 1
        elif t_now >= impact_start_ts:
            # During/after impact -> current fault, not a prediction
            pass

    def run_all_scenarios(self, seed: int = 42) -> List[ScenarioComparisonResult]:
        """Run paired benchmark across all 8 standard scenarios."""
        results = []
        for st in ScenarioType:
            res = self.run_scenario(st, seed=seed)
            results.append(res)
        return results

    def to_dataframe(self, comparisons: List[ScenarioComparisonResult]) -> pd.DataFrame:
        """Convert results to pandas DataFrame for dashboard tabular presentation."""
        records = []
        for comp in comparisons:
            for h in [5, 15, 30]:
                on = comp.gate_on[h]
                off = comp.gate_off[h]
                records.append({
                    "scenario": comp.scenario_type,
                    "horizon_m": h,
                    "gate_mode": "GATE ON",
                    "recall": on.event_recall,
                    "false_alarms_hr": on.false_alarms_per_hour,
                    "lead_time_min": on.average_lead_time_minutes,
                    "missed_faults": on.missed_faults,
                    "abstention_rate": on.abstention_rate,
                })
                records.append({
                    "scenario": comp.scenario_type,
                    "horizon_m": h,
                    "gate_mode": "GATE OFF",
                    "recall": off.event_recall,
                    "false_alarms_hr": off.false_alarms_per_hour,
                    "lead_time_min": off.average_lead_time_minutes,
                    "missed_faults": off.missed_faults,
                    "abstention_rate": off.abstention_rate,
                })
        return pd.DataFrame(records)
