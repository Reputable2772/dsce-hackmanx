"""Unit and property tests for Copilot logical entailment and hypothesis verification."""

import pytest
from precursor.copilot.claim_verifier import (
    NumericalClaimVerifier,
    AssumptionVerification,
    AssumptionStatus,
    HypothesisVerification,
    HypothesisStatus,
)
from precursor.copilot.llm_client import (
    OllamaCopilot,
    CopilotHypothesisItem,
    CopilotAssumptionItem,
    CopilotStrictJSON,
    CopilotResponse,
)
from precursor.incidents.schema import Incident, IncidentSeverity
from precursor.gate.states import GateState


def test_hypothesis_entailment_all_validated():
    """Verify that when all supporting assumptions hold true (A1 & A2), hypothesis is VALIDATED."""
    verifier = NumericalClaimVerifier()

    # Telemetry where link is up (1.0) and packet loss is nominal (0.5% <= 5.0%)
    telem = {"link_state": 1.0, "packet_loss_pct": 0.5, "latency_ms": 65.0}

    assumptions = [
        {"id": "A1", "statement": "Link active", "metric_id": "link_state", "operator": "==", "expected_value": 1.0},
        {"id": "A2", "statement": "Loss under 5%", "metric_id": "packet_loss_pct", "operator": "<=", "expected_value": 5.0},
    ]
    audited_assumptions = verifier.verify_assumptions(assumptions, telem)
    assert len(audited_assumptions) == 2
    assert all(a.status == AssumptionStatus.VALIDATED for a in audited_assumptions)

    hypotheses = [
        CopilotHypothesisItem(
            id="H1",
            statement="Interface bufferbloat (Hypothesis)",
            confidence=0.8,
            supporting_assumptions=["A1", "A2"],
            rationale="Queuing under active link",
        )
    ]

    verified = verifier.verify_hypotheses(hypotheses, audited_assumptions)
    assert len(verified) == 1
    vh = verified[0]
    assert vh.id == "H1"
    assert vh.status == HypothesisStatus.VALIDATED
    assert vh.confidence > 0.8  # confidence boosted
    assert vh.validated_assumptions == ["A1", "A2"]
    assert len(vh.violated_assumptions) == 0
    assert "VALIDATED" in vh.entailment_explanation


def test_hypothesis_entailment_refuted_on_violation():
    """Verify that if ANY supporting assumption is violated, the hypothesis is logically REFUTED."""
    verifier = NumericalClaimVerifier()

    # Telemetry where packet loss spiked to 12.0% (violating A2 <= 5.0%)
    telem = {"link_state": 1.0, "packet_loss_pct": 12.0}

    assumptions = [
        {"id": "A1", "statement": "Link active", "metric_id": "link_state", "operator": "==", "expected_value": 1.0},
        {"id": "A2", "statement": "Loss under 5%", "metric_id": "packet_loss_pct", "operator": "<=", "expected_value": 5.0},
    ]
    audited_assumptions = verifier.verify_assumptions(assumptions, telem)
    assert audited_assumptions[0].status == AssumptionStatus.VALIDATED
    assert audited_assumptions[1].status == AssumptionStatus.VIOLATED

    hypotheses = [
        CopilotHypothesisItem(
            id="H1",
            statement="Interface bufferbloat (Hypothesis)",
            confidence=0.88,
            supporting_assumptions=["A1", "A2"],
            rationale="Queuing under active link",
        )
    ]

    verified = verifier.verify_hypotheses(hypotheses, audited_assumptions)
    assert len(verified) == 1
    vh = verified[0]
    assert vh.id == "H1"
    assert vh.status == HypothesisStatus.REFUTED
    assert vh.confidence == 0.0  # demoted to zero
    assert "A2" in vh.violated_assumptions
    assert "REFUTED" in vh.entailment_explanation


def test_hypothesis_entailment_unverified():
    """Verify that hypotheses without assumptions or with missing metrics are UNVERIFIED."""
    verifier = NumericalClaimVerifier()
    telem = {"latency_ms": 50.0}

    assumptions = [
        {"id": "A1", "statement": "Metric not present", "metric_id": "missing_metric", "operator": "==", "expected_value": 1.0}
    ]
    audited_assumptions = verifier.verify_assumptions(assumptions, telem)
    assert audited_assumptions[0].status == AssumptionStatus.UNTESTABLE

    hypotheses = [
        CopilotHypothesisItem(
            id="H1",
            statement="Unknown anomaly",
            confidence=0.7,
            supporting_assumptions=["A1"],
        ),
        CopilotHypothesisItem(
            id="H2",
            statement="Unlinked hypothesis",
            confidence=0.7,
            supporting_assumptions=[],
        ),
    ]

    verified = verifier.verify_hypotheses(hypotheses, audited_assumptions)
    assert len(verified) == 2
    assert verified[0].status == HypothesisStatus.UNVERIFIED
    assert verified[1].status == HypothesisStatus.UNVERIFIED


def test_copilot_instant_overview_returns_verified_hypotheses():
    """Verify OllamaCopilot.generate_instant_overview produces verified_hypotheses in strict CopilotResponse."""
    copilot = OllamaCopilot()
    incident = Incident(
        id="inc-test-01",
        title="Physical Ping Spike",
        severity=IncidentSeverity.WARNING,
        detected_at=100.0,
        start_time=100.0,
        last_updated=105.0,
        predicted_horizon_minutes=5,
        gate_state=GateState.DEGRADED,
        primary_metrics=["latency_ms"],
        is_active_fault=True,
    )
    telem = {"latency_ms": 82.5, "link_state": 1.0, "packet_loss_pct": 0.0}

    resp = copilot.generate_instant_overview(incident, telem, [])
    assert isinstance(resp, CopilotResponse)
    assert len(resp.verified_hypotheses) > 0

    # H1 in fallback requires A1 (link_state==1.0) and A2 (packet_loss_pct<=5.0)
    h1 = next(h for h in resp.verified_hypotheses if h.id == "H1")
    assert h1.status == HypothesisStatus.VALIDATED
    assert h1.supporting_assumptions == ["A1", "A2"]
    assert "VALIDATED" in h1.entailment_explanation
