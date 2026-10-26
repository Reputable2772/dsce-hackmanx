"""Numerical Claim Verifier for PRECURSOR Copilot responses."""

import re
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ClaimStatus(str, Enum):
    VERIFIED = "VERIFIED"           # Claim within ±10% of observed telemetry
    CONTRADICTED = "CONTRADICTED"   # Claim deviates > 10% from observed telemetry
    UNVERIFIED = "UNVERIFIED"       # Metric not present in telemetry snapshot or ambiguous


class ClaimVerification(BaseModel):
    """Result of verifying a single numerical claim from copilot text against ground truth."""
    claim_text: str = Field(..., description="Original extracted claim phrase from LLM output")
    metric_id: str = Field(..., description="Matched telemetry metric identifier")
    claimed_value: float = Field(..., description="Numeric value asserted by LLM")
    actual_value: Optional[float] = Field(None, description="Actual telemetry value in snapshot")
    status: ClaimStatus = Field(..., description="VERIFIED, CONTRADICTED, or UNVERIFIED")
    explanation: str = Field(..., description="Evidence and discrepancy analysis")


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
