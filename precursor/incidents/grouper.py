"""Deterministic Spatio-Temporal Incident Grouper for PRECURSOR."""

from typing import List, Dict, Any, Optional
from collections import defaultdict

from precursor.detectors.base import DetectorResult
from precursor.gate.states import GateState, GateDecision
from precursor.incidents.schema import Incident, IncidentSeverity


class IncidentGrouper:
    """
    Groups individual metric detector outputs into deterministic incident summaries.
    Preserves underlying metric identities and strictly distinguishes active faults
    from predicted future events.
    """

    def __init__(self, correlation_window_seconds: float = 60.0):
        self.correlation_window_seconds = correlation_window_seconds
        self.active_incidents: Dict[str, Incident] = {}

    def group(
        self,
        detector_results_by_horizon: Dict[int, List[DetectorResult]],
        gate_decision: GateDecision,
        current_time: float,
        interface_id: str = "eth0",
    ) -> List[Incident]:
        """
        Group active alerts across all horizons into structured Incidents.
        """
        incidents: List[Incident] = []

        # 1. Separate immediate faults vs future predictions
        immediate_alerts: List[DetectorResult] = []
        future_alerts_by_metric: Dict[str, List[DetectorResult]] = defaultdict(list)

        # Check all results
        for horizon, results in detector_results_by_horizon.items():
            for res in results:
                if not res.predicted_impact:
                    continue
                if res.is_immediate_fault:
                    immediate_alerts.append(res)
                else:
                    future_alerts_by_metric[res.metric_id].append(res)

        # 2. Process Immediate Faults (ALWAYS ACTIVE IN ALL GATE STATES)
        if immediate_alerts:
            primary_metrics = list({a.metric_id for a in immediate_alerts})
            inc_id = f"act_{interface_id}_{'-'.join(primary_metrics)}_{int(current_time)}"
            evidence = {a.metric_id: a.evidence for a in immediate_alerts}

            title = f"CRITICAL: Immediate Link/Connectivity Failure on {interface_id}"
            inc = Incident(
                id=inc_id,
                title=title,
                is_active_fault=True,
                predicted_horizon_minutes=None,
                primary_metrics=primary_metrics,
                supporting_signals=[a.detector_name for a in immediate_alerts],
                gate_state=gate_decision.state,
                severity=IncidentSeverity.CRITICAL,
                detected_at=current_time,
                status="ACTIVE",
                evidence_summary=evidence,
            )
            incidents.append(inc)

        # 3. Process Future Predicted Events (subject to Reliability Gate)
        if future_alerts_by_metric:
            # Group correlated metrics (e.g. latency + packet loss + jitter)
            all_metrics = list(future_alerts_by_metric.keys())
            # Find earliest horizon predicting this event
            min_horizon = min(
                res.horizon_minutes
                for m_alerts in future_alerts_by_metric.values()
                for res in m_alerts
            )

            # Check gate policy
            if gate_decision.state == GateState.ABSTAIN:
                status = "SUPPRESSED"
                severity = IncidentSeverity.INFO
                title = f"[SUPPRESSED] Predicted impact on {', '.join(all_metrics)} withheld due to gate invalidation"
            elif gate_decision.state == GateState.DEGRADED:
                status = "ACTIVE"
                severity = IncidentSeverity.WARNING
                title = f"EARLY WARNING (Lower Trust): Potential degradation within {min_horizon}m on {interface_id}"
            else:
                status = "ACTIVE"
                severity = IncidentSeverity.WARNING
                title = f"EARLY WARNING: High confidence service impact predicted in {min_horizon}m on {interface_id}"

            # Aggregate evidence
            evidence = {}
            supporting = []
            for m, alerts in future_alerts_by_metric.items():
                evidence[m] = alerts[0].evidence
                supporting.extend([a.detector_name for a in alerts])

            inc_id = f"pred_{interface_id}_{min_horizon}m_{int(current_time)}"
            inc = Incident(
                id=inc_id,
                title=title,
                is_active_fault=False,
                predicted_horizon_minutes=min_horizon,
                primary_metrics=all_metrics,
                supporting_signals=list(set(supporting)),
                gate_state=gate_decision.state,
                severity=severity,
                detected_at=current_time,
                status=status,
                evidence_summary=evidence,
            )
            incidents.append(inc)

        return incidents
