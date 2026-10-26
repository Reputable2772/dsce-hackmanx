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
        source: str = "synthetic",
    ) -> List[Incident]:
        """
        Group active alerts across all horizons into structured, deterministic Incidents.
        Prevents duplicate creation across polling cycles by maintaining stable IDs.
        """
        incidents: List[Incident] = []
        current_active_ids = set()

        # 1. Separate immediate faults vs future predictions
        immediate_alerts: List[DetectorResult] = []
        future_alerts_by_metric: Dict[str, List[DetectorResult]] = defaultdict(list)

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
            primary_metrics = sorted(list({a.metric_id for a in immediate_alerts}))
            inc_id = f"act_{interface_id}_{'-'.join(primary_metrics)}"
            current_active_ids.add(inc_id)
            existing = self.active_incidents.get(inc_id)
            first_seen = existing.first_seen if existing and existing.first_seen else current_time
            existing_status = existing.status if existing and existing.status in ("ACKNOWLEDGED", "RESOLVED") else "ACTIVE"

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
                detected_at=first_seen,
                first_seen=first_seen,
                last_seen=current_time,
                resolved_at=None,
                interface_id=interface_id,
                source=source,
                status=existing_status,
                evidence_summary=evidence,
            )
            self.active_incidents[inc_id] = inc
            incidents.append(inc)

        # 3. Process Future Predicted Events (subject to Reliability Gate)
        if future_alerts_by_metric:
            all_metrics = sorted(list(future_alerts_by_metric.keys()))
            min_horizon = min(
                res.horizon_minutes
                for m_alerts in future_alerts_by_metric.values()
                for res in m_alerts
            )
            inc_id = f"pred_{interface_id}_{min_horizon}m_{'-'.join(all_metrics)}"
            current_active_ids.add(inc_id)
            existing = self.active_incidents.get(inc_id)
            first_seen = existing.first_seen if existing and existing.first_seen else current_time
            existing_status = existing.status if existing and existing.status in ("ACKNOWLEDGED", "RESOLVED") else "ACTIVE"

            if gate_decision.state == GateState.ABSTAIN:
                status = "SUPPRESSED"
                severity = IncidentSeverity.INFO
                title = f"[SUPPRESSED] Predicted impact on {', '.join(all_metrics)} withheld due to gate invalidation"
            elif gate_decision.state == GateState.DEGRADED:
                status = existing_status
                severity = IncidentSeverity.WARNING
                title = f"EARLY WARNING (Lower Trust): Potential degradation within {min_horizon}m on {interface_id}"
            else:
                status = existing_status
                severity = IncidentSeverity.WARNING
                title = f"EARLY WARNING: High confidence service impact predicted in {min_horizon}m on {interface_id}"

            evidence = {}
            supporting = []
            for m, alerts in future_alerts_by_metric.items():
                evidence[m] = alerts[0].evidence
                supporting.extend([a.detector_name for a in alerts])

            inc = Incident(
                id=inc_id,
                title=title,
                is_active_fault=False,
                predicted_horizon_minutes=min_horizon,
                primary_metrics=all_metrics,
                supporting_signals=list(set(supporting)),
                gate_state=gate_decision.state,
                severity=severity,
                detected_at=first_seen,
                first_seen=first_seen,
                last_seen=current_time,
                resolved_at=None,
                interface_id=interface_id,
                source=source,
                status=status,
                evidence_summary=evidence,
            )
            self.active_incidents[inc_id] = inc
            incidents.append(inc)

        # 4. Check for resolved incidents (previously active but no longer in breach)
        for old_id, old_inc in list(self.active_incidents.items()):
            if old_id not in current_active_ids and old_inc.status != "RESOLVED":
                old_inc.status = "RESOLVED"
                old_inc.resolved_at = current_time
                incidents.append(old_inc)

        return incidents
