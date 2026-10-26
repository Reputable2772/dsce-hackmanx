"""Numerical Claim Verifier for PRECURSOR Copilot responses."""

import re
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ClaimStatus(str, Enum):
    VERIFIED = "VERIFIED"           # Claim within ±10% of observed telemetry
    CONTRADICTED = "CONTRADICTED"   # Claim deviates > 10% from observed telemetry
    UNVERIFIED = "UNVERIFIED"       # Metric not present in telemetry snapshot or ambiguous


class AssumptionStatus(str, Enum):
    VALIDATED = "VALIDATED"         # Assumption holds true against observed telemetry
    VIOLATED = "VIOLATED"           # Assumption is contradicted by observed telemetry
    UNTESTABLE = "UNTESTABLE"       # Metric not present in snapshot or qualitative assumption


class HypothesisStatus(str, Enum):
    VALIDATED = "VALIDATED"         # All prerequisite assumptions evaluated to VALIDATED
    REFUTED = "REFUTED"             # At least one prerequisite assumption was VIOLATED
    UNVERIFIED = "UNVERIFIED"       # Prerequisite assumptions are missing, empty, or untestable


class ClaimVerification(BaseModel):
    """Result of verifying a single numerical claim from copilot text against ground truth."""
    claim_text: str = Field(..., description="Original extracted claim phrase from LLM output")
    metric_id: str = Field(..., description="Matched telemetry metric identifier")
    claimed_value: float = Field(..., description="Numeric value asserted by LLM")
    actual_value: Optional[float] = Field(None, description="Actual telemetry value in snapshot")
    status: ClaimStatus = Field(..., description="VERIFIED, CONTRADICTED, or UNVERIFIED")
    explanation: str = Field(..., description="Evidence and discrepancy analysis")


class AssumptionVerification(BaseModel):
    """Result of auditing an operational assumption made by the Copilot."""
    id: str = Field("A", description="Assumption identifier e.g. A1, A2")
    statement: str = Field(..., description="Natural language statement of the assumption")
    metric_id: Optional[str] = Field(None, description="Matched telemetry metric identifier if quantitative")
    operator: Optional[str] = Field(None, description="Comparison operator: '<', '<=', '>', '>=', '==', '!='")
    expected_value: Optional[float] = Field(None, description="Expected threshold or state")
    actual_value: Optional[float] = Field(None, description="Actual observed value in telemetry snapshot")
    status: AssumptionStatus = Field(..., description="VALIDATED, VIOLATED, or UNTESTABLE")
    explanation: str = Field(..., description="Evidence and rationale for validation status")


class HypothesisVerification(BaseModel):
    """Result of mathematically and logically auditing a Copilot root-cause hypothesis against its supporting assumptions."""
    id: str = Field(..., description="Hypothesis identifier (e.g. H1, H2)")
    statement: str = Field(..., description="Root cause hypothesis text")
    status: HypothesisStatus = Field(..., description="VALIDATED, REFUTED, or UNVERIFIED")
    confidence: float = Field(..., description="Entailment-adjusted confidence (0.0 if REFUTED, boosted if VALIDATED)")
    supporting_assumptions: List[str] = Field(default_factory=list, description="IDs of assumptions required for this hypothesis")
    validated_assumptions: List[str] = Field(default_factory=list, description="IDs of assumptions confirmed VALIDATED")
    violated_assumptions: List[str] = Field(default_factory=list, description="IDs of assumptions found VIOLATED")
    rationale: str = Field("", description="Hypothesis rationale")
    entailment_explanation: str = Field(..., description="Formal logic entailment breakdown")


class NumericalClaimVerifier:
    """
    Extracts numerical assertions and metric statements from LLM text and validates them
    against the ground truth telemetry snapshot.
    """

    def __init__(self, tolerance: float = 0.10):
        self.tolerance = tolerance  # 10% tolerance

    def verify_response(
        self,
        llm_text: str,
        telemetry_snapshot: Dict[str, Optional[float]],
    ) -> List[ClaimVerification]:
        """
        Extract numerical claims from llm_text and evaluate them against telemetry_snapshot.
        """
        claims: List[ClaimVerification] = []

        # Metric detection regexes
        patterns = [
            # Latency (ms)
            (
                r"(?:latency|rtt|delay)[^.\n]*?(\d+(?:\.\d+)?)\s*(?:ms|milliseconds)",
                "latency_ms",
                "ms",
            ),
            (
                r"(\d+(?:\.\d+)?)\s*ms\s*(?:latency|rtt)",
                "latency_ms",
                "ms",
            ),
            # Packet loss (%)
            (
                r"(?:packet\s*loss|loss\s*rate|drop\s*rate)[^.\n]*?(\d+(?:\.\d+)?)\s*%",
                "packet_loss_pct",
                "%",
            ),
            (
                r"(\d+(?:\.\d+)?)\s*%\s*(?:packet\s*loss|loss)",
                "packet_loss_pct",
                "%",
            ),
            # Jitter (ms)
            (
                r"(?:jitter)[^.\n]*?(\d+(?:\.\d+)?)\s*ms",
                "jitter_ms",
                "ms",
            ),
            # Throughput (Mbps)
            (
                r"(?:throughput|bandwidth|traffic|load)[^.\n]*?(\d+(?:\.\d+)?)\s*(?:mbps|mbit/s)",
                "throughput_mbps",
                "Mbps",
            ),
            # Packet Drops
            (
                r"(\d+(?:\.\d+)?)\s*(?:drops|packets?\s*dropped|discards)",
                "drops_in",
                "drops",
            ),
        ]

        seen_keys = set()

        for pattern, metric_id, unit in patterns:
            for match in re.finditer(pattern, llm_text, re.IGNORECASE):
                val_str = match.group(1)
                try:
                    claimed_val = float(val_str)
                except ValueError:
                    continue

                full_sentence = match.group(0).strip()
                key = (metric_id, claimed_val)
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                # Check against telemetry
                actual_val = telemetry_snapshot.get(metric_id)

                if actual_val is None:
                    claims.append(
                        ClaimVerification(
                            claim_text=full_sentence,
                            metric_id=metric_id,
                            claimed_value=claimed_val,
                            actual_value=None,
                            status=ClaimStatus.UNVERIFIED,
                            explanation=f"Metric '{metric_id}' not found in active telemetry snapshot.",
                        )
                    )
                else:
                    ref = max(abs(actual_val), 1e-4)
                    rel_err = abs(claimed_val - actual_val) / ref

                    if rel_err <= self.tolerance:
                        status = ClaimStatus.VERIFIED
                        explanation = (
                            f"Verified: Claimed {claimed_val}{unit} matches observed {actual_val}{unit} "
                            f"(diff {round(rel_err * 100, 1)}% <= {int(self.tolerance * 100)}%)."
                        )
                    else:
                        status = ClaimStatus.CONTRADICTED
                        explanation = (
                            f"Contradicted: Claimed {claimed_val}{unit} differs significantly from observed {actual_val}{unit} "
                            f"(diff {round(rel_err * 100, 1)}% > {int(self.tolerance * 100)}%)."
                        )

                    claims.append(
                        ClaimVerification(
                            claim_text=full_sentence,
                            metric_id=metric_id,
                            claimed_value=claimed_val,
                            actual_value=round(actual_val, 2),
                            status=status,
                            explanation=explanation,
                        )
                    )

        return claims

    def verify_structured_claims(
        self,
        structured_claims: List[Dict[str, Any]],
        telemetry_snapshot: Dict[str, Optional[float]],
    ) -> List[ClaimVerification]:
        """Verify explicit structured numerical claims parsed from strict JSON."""
        claims: List[ClaimVerification] = []
        for item in structured_claims:
            metric_id = item.get("metric_id", "")
            try:
                claimed_val = float(item.get("asserted_value", item.get("claimed_value", 0.0)))
            except (ValueError, TypeError):
                continue
            unit = item.get("unit", "")
            context = item.get("context", f"Claimed {metric_id} = {claimed_val}")

            actual_val = telemetry_snapshot.get(metric_id)
            if actual_val is None:
                claims.append(
                    ClaimVerification(
                        claim_text=context,
                        metric_id=metric_id,
                        claimed_value=claimed_val,
                        actual_value=None,
                        status=ClaimStatus.UNVERIFIED,
                        explanation=f"Metric '{metric_id}' not found in active telemetry snapshot.",
                    )
                )
            else:
                ref = max(abs(actual_val), 1e-4)
                rel_err = abs(claimed_val - actual_val) / ref
                if rel_err <= self.tolerance:
                    status = ClaimStatus.VERIFIED
                    explanation = (
                        f"Verified: Claimed {claimed_val}{unit} matches observed {actual_val}{unit} "
                        f"(diff {round(rel_err * 100, 1)}% <= {int(self.tolerance * 100)}%)."
                    )
                else:
                    status = ClaimStatus.CONTRADICTED
                    explanation = (
                        f"Contradicted: Claimed {claimed_val}{unit} differs from observed {actual_val}{unit} "
                        f"(diff {round(rel_err * 100, 1)}% > {int(self.tolerance * 100)}%)."
                    )
                claims.append(
                    ClaimVerification(
                        claim_text=context,
                        metric_id=metric_id,
                        claimed_value=claimed_val,
                        actual_value=round(actual_val, 2),
                        status=status,
                        explanation=explanation,
                    )
                )
        return claims

    def verify_assumptions(
        self,
        assumptions: List[Dict[str, Any]],
        telemetry_snapshot: Dict[str, Optional[float]],
    ) -> List[AssumptionVerification]:
        """Audit operational assumptions made by LLM against ground-truth snapshot."""
        results: List[AssumptionVerification] = []
        for idx, item in enumerate(assumptions):
            a_id = item.get("id") or f"A{idx + 1}"
            statement = item.get("statement", "")
            metric_id = item.get("metric_id")
            op = item.get("operator")
            exp_val = item.get("expected_value")

            if not metric_id or metric_id not in telemetry_snapshot or telemetry_snapshot[metric_id] is None:
                results.append(
                    AssumptionVerification(
                        id=a_id,
                        statement=statement,
                        metric_id=metric_id,
                        operator=op,
                        expected_value=exp_val,
                        actual_value=telemetry_snapshot.get(metric_id) if metric_id else None,
                        status=AssumptionStatus.UNTESTABLE,
                        explanation=f"Assumption cannot be verified: metric '{metric_id}' is not in active telemetry snapshot." if metric_id else "Qualitative assumption without specific metric condition.",
                    )
                )
                continue

            actual_val = float(telemetry_snapshot[metric_id])
            if exp_val is None or not op:
                results.append(
                    AssumptionVerification(
                        id=a_id,
                        statement=statement,
                        metric_id=metric_id,
                        operator=op,
                        expected_value=exp_val,
                        actual_value=actual_val,
                        status=AssumptionStatus.VALIDATED,
                        explanation=f"Metric '{metric_id}' is actively monitored (current: {actual_val}).",
                    )
                )
                continue

            # Evaluate operator
            try:
                exp_float = float(exp_val)
            except (ValueError, TypeError):
                exp_float = 0.0

            is_valid = False
            if op == "<":
                is_valid = actual_val < exp_float
            elif op in ("<=", "=<"):
                is_valid = actual_val <= exp_float
            elif op == ">":
                is_valid = actual_val > exp_float
            elif op in (">=", "=>"):
                is_valid = actual_val >= exp_float
            elif op in ("==", "="):
                is_valid = abs(actual_val - exp_float) < 1e-3
            elif op in ("!=", "<>"):
                is_valid = abs(actual_val - exp_float) >= 1e-3
            else:
                is_valid = False

            status = AssumptionStatus.VALIDATED if is_valid else AssumptionStatus.VIOLATED
            verb = "holds true" if is_valid else "is violated"
            explanation = (
                f"Assumption {verb}: observed {metric_id}={actual_val} vs expected condition ({op} {exp_float})."
            )
            results.append(
                AssumptionVerification(
                    id=a_id,
                    statement=statement,
                    metric_id=metric_id,
                    operator=op,
                    expected_value=round(exp_float, 2),
                    actual_value=round(actual_val, 2),
                    status=status,
                    explanation=explanation,
                )
            )
        return results

    def verify_hypotheses(
        self,
        hypotheses: List[Any],
        audited_assumptions: List[AssumptionVerification],
    ) -> List[HypothesisVerification]:
        """
        Evaluate logical entailment for each hypothesis based on its supporting assumptions.
        Formal Rule:
        - If ALL supporting assumptions are VALIDATED (count > 0) -> Hypothesis is VALIDATED.
        - If ANY supporting assumption is VIOLATED -> Hypothesis is REFUTED.
        - If any assumption is UNTESTABLE (and none violated) or list is empty -> Hypothesis is UNVERIFIED.
        """
        results: List[HypothesisVerification] = []
        assumptions_map = {a.id.strip().upper(): a for a in audited_assumptions if getattr(a, "id", None)}

        for h in hypotheses:
            h_id = getattr(h, "id", None) or (h.get("id") if isinstance(h, dict) else "H")
            statement = getattr(h, "statement", None) or (h.get("statement") if isinstance(h, dict) else str(h))
            confidence = float(getattr(h, "confidence", 0.8) if hasattr(h, "confidence") else (h.get("confidence", 0.8) if isinstance(h, dict) else 0.8))
            rationale = getattr(h, "rationale", "") if hasattr(h, "rationale") else (h.get("rationale", "") if isinstance(h, dict) else "")

            supporting = getattr(h, "supporting_assumptions", None)
            if supporting is None and isinstance(h, dict):
                supporting = h.get("supporting_assumptions", [])
            supporting_ids = list(supporting) if supporting else []

            validated_ids = []
            violated_ids = []
            untestable_ids = []
            missing_ids = []

            for s_id in supporting_ids:
                clean_id = str(s_id).strip().upper()
                if clean_id in assumptions_map:
                    a_audited = assumptions_map[clean_id]
                    if a_audited.status == AssumptionStatus.VALIDATED:
                        validated_ids.append(s_id)
                    elif a_audited.status == AssumptionStatus.VIOLATED:
                        violated_ids.append(s_id)
                    else:
                        untestable_ids.append(s_id)
                else:
                    missing_ids.append(s_id)

            if violated_ids:
                # If ANY prerequisite assumption is violated, the hypothesis is logically refuted
                status = HypothesisStatus.REFUTED
                adj_conf = 0.0
                entailment_explanation = (
                    f"REFUTED: Prerequisite assumption(s) {violated_ids} contradicted by observed physical telemetry."
                )
            elif not supporting_ids:
                status = HypothesisStatus.UNVERIFIED
                adj_conf = round(confidence * 0.75, 2)
                entailment_explanation = "UNVERIFIED: Hypothesis does not declare supporting premise assumptions."
            elif missing_ids or untestable_ids:
                status = HypothesisStatus.UNVERIFIED
                adj_conf = round(confidence * 0.85, 2)
                entailment_explanation = (
                    f"UNVERIFIED: Supporting premise(s) {missing_ids + untestable_ids} are missing from telemetry snapshot."
                )
            elif len(validated_ids) == len(supporting_ids) and len(supporting_ids) > 0:
                # If ALL supporting assumptions hold true, the hypothesis is logically validated
                status = HypothesisStatus.VALIDATED
                adj_conf = min(1.0, round(confidence * 1.15, 2))
                entailment_explanation = (
                    f"VALIDATED: All supporting premises {validated_ids} hold true in physical telemetry (logical entailment confirmed)."
                )
            else:
                status = HypothesisStatus.UNVERIFIED
                adj_conf = round(confidence * 0.8, 2)
                entailment_explanation = "UNVERIFIED: Insufficient premise evidence."

            results.append(
                HypothesisVerification(
                    id=h_id,
                    statement=statement,
                    status=status,
                    confidence=adj_conf,
                    supporting_assumptions=supporting_ids,
                    validated_assumptions=validated_ids,
                    violated_assumptions=violated_ids,
                    rationale=rationale,
                    entailment_explanation=entailment_explanation,
                )
            )
        return results

