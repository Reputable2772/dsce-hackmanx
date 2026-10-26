"""End-to-End Vertical Slice Integration Tests for PRECURSOR.

Verifies:
1. Normal operation (NORMAL_BASELINE).
2. Developing degradation with pre-impact warnings (GRADUAL_DEGRADATION).
3. Hard reliability condition causing ABSTAIN (SENSOR_DEGRADATION).
4. Immediate rule-based alert on physical link failure (SUDDEN_FAILURE) active in all gate states.
5. Copilot guidance with grounded runbooks and numerical claim verification.
6. Streamlit dashboard headless rendering via AppTest.
"""

import os
from streamlit.testing.v1 import AppTest

from precursor.runner import PrecursorEngine
from precursor.telemetry.synthetic import ScenarioType
from precursor.gate.states import GateState


def test_vertical_slice_normal_baseline():
    """Verify normal steady-state operation."""
    engine = PrecursorEngine(scenario_type=ScenarioType.NORMAL_BASELINE, seed=42)
    snapshot = engine.fast_forward(200.0)

    # 1. Gate must be PREDICT with 1.0 sensor health
    assert snapshot.gate_decision.state == GateState.PREDICT
    assert snapshot.gate_decision.sensor_health_score == 1.0
    assert snapshot.gate_decision.immediate_alerts_active is True

    # 2. No active physical faults
    active_faults = [i for i in snapshot.incidents if i.is_active_fault]
    assert len(active_faults) == 0


def test_vertical_slice_developing_degradation():
    """Verify pre-impact early warning on developing degradation."""
    engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    # Fast forward into degradation ramp (ramp starts at t=600s, SLA breach at t=1200s)
    snapshot = engine.fast_forward(800.0)

    # Early warning must be detected in 5m horizon
    h5_results = snapshot.detector_results.get(5, [])
    assert any(r.predicted_impact for r in h5_results)

    # Incident grouper creates early warning (not active fault)
    early_warnings = [i for i in snapshot.incidents if not i.is_active_fault]
    assert len(early_warnings) > 0
    assert early_warnings[0].predicted_horizon_minutes in (5, 15, 30)

    # Gate allows predictions (PREDICT or DEGRADED)
    assert snapshot.gate_decision.state in (GateState.PREDICT, GateState.DEGRADED)
    assert snapshot.gate_decision.immediate_alerts_active is True


def test_vertical_slice_hard_reliability_abstain():
    """Verify hard reliability condition triggers ABSTAIN while keeping immediate alerts active."""
    engine = PrecursorEngine(scenario_type=ScenarioType.SENSOR_DEGRADATION, seed=42)
    # Fast forward past corruption onset to fill lookback window (starts at t=600s, full window by t=1200s)
    snapshot = engine.fast_forward(1200.0)

    # Reliability Gate must transition to ABSTAIN
    assert snapshot.gate_decision.state == GateState.ABSTAIN
    assert len(snapshot.gate_decision.reasons) > 0

    # Invariant: Immediate alerts must remain active
    assert snapshot.gate_decision.immediate_alerts_active is True


def test_vertical_slice_sudden_failure_immediate_alert():
    """Verify sudden physical cut triggers zero-latency immediate alert."""
    engine = PrecursorEngine(scenario_type=ScenarioType.SUDDEN_FAILURE, seed=42)
    # Failure onset is at t = 900s
    snapshot = engine.fast_forward(920.0)

    # Immediate fault detector must fire
    h5_results = snapshot.detector_results.get(5, [])
    immediate_faults = [r for r in h5_results if r.is_immediate_fault]
    assert len(immediate_faults) > 0

    # Incident grouper marks as active physical fault
    active_incidents = [i for i in snapshot.incidents if i.is_active_fault]
    assert len(active_incidents) > 0
    assert active_incidents[0].is_active_fault is True
    assert active_incidents[0].predicted_horizon_minutes is None


def test_vertical_slice_copilot_and_claim_verification():
    """Verify Copilot guidance and numerical claim verifier."""
    engine = PrecursorEngine(scenario_type=ScenarioType.GRADUAL_DEGRADATION, seed=42)
    snapshot = engine.fast_forward(800.0)

    # In user-triggered mode, Copilot produces response when requested for an incident
    if snapshot.incidents:
        explanation = engine.explain_incident(snapshot.incidents[0].id)
        assert explanation is not None
        assert len(explanation["summary"]) > 0
        assert len(explanation["hypotheses"]) > 0
        assert len(explanation["diagnostic_commands"]) > 0
        # Claims must be assessed with valid status enum
        for claim in explanation.get("claims", []):
            status = claim.get("status") if isinstance(claim, dict) else getattr(claim, "status", None)
            claim_val = status.value if hasattr(status, "value") else str(status)
            assert claim_val in ("VERIFIED", "CONTRADICTED", "UNVERIFIED")


def test_streamlit_dashboard_end_to_end_rendering():
    """Verify Streamlit dashboard executes all tabs and buttons cleanly via AppTest."""
    app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dashboard", "app.py"))
    at = AppTest.from_file(app_path)
    at.run(timeout=35)
    assert not at.exception, f"Dashboard exception on load: {at.exception}"

    # Advance step +5s
    step_btn = [b for b in at.button if "Step" in b.label][0]
    step_btn.click().run(timeout=25)
    assert not at.exception, f"Dashboard exception on step: {at.exception}"
    assert at.session_state["sim_steps"] == 26
