"""Offline Ollama Copilot diagnosis and Numerical Claim Verifier component."""

import streamlit as st
from typing import Dict, Any, List


def render_copilot_panel(
    copilot_data: Dict[str, Any],
    runbook_title: Optional[str] = None,
    runbook_content: Optional[str] = None,
) -> None:
    """Render the AI Copilot guidance drawer and claim verification table."""
    st.subheader("🤖 Offline Network Copilot (Local Ollama)")

    summary = copilot_data.get("summary", "No active incidents detected. Network operating within nominal thresholds.")
    hypotheses = copilot_data.get("hypotheses", [])
    commands = copilot_data.get("diagnostic_commands", [])
    verification_steps = copilot_data.get("verification_steps", [])
    risks = copilot_data.get("risks_and_rollback", [])
    claims = copilot_data.get("claims", [])

    # Summary Card
    st.markdown(
        f"""
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
            <div style="font-size: 0.8rem; text-transform: uppercase; color: #60A5FA; font-weight: 700; margin-bottom: 0.4rem;">
                Grounded Incident Assessment
            </div>
            <div style="font-size: 0.95rem; line-height: 1.5; color: #E2E8F0;">
                {summary}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### 🔍 Hypothetical Root Causes")
        if hypotheses:
            for h in hypotheses:
                st.markdown(f"- {h}")
        else:
            st.caption("No anomalous root causes detected.")

        st.markdown("#### 🛡️ Risks & Rollback Considerations")
        if risks:
            for r in risks:
                st.markdown(f"- <span style='color: #FCA5A5;'>{r}</span>", unsafe_allow_html=True)
        else:
            st.caption("No remediation risk flags.")

    with col2:
        st.markdown("#### 💻 Diagnostic Verification Commands")
        if commands:
            for cmd in commands:
                st.code(cmd, language="bash")
        else:
            st.caption("No diagnostic actions required.")

    # Numerical Claim Verifier Table
    st.markdown("---")
    st.markdown("### 🔬 Numerical Claim Verifier (Hallucination Guard)")
    st.caption("Cross-references quantitative LLM assertions against verified telemetry ground truth.")

    if claims:
        # Table format
        table_rows = []
        for c in claims:
            status = c.get("status", "UNVERIFIED")
            badge_cls = {
                "VERIFIED": "claim-verified",
                "CONTRADICTED": "claim-contradicted",
                "UNVERIFIED": "claim-unverified",
            }.get(status, "claim-unverified")

            claim_text = c.get("claim_text", "")
            claimed_val = c.get("claimed_value", "--")
            actual_val = f"{c.get('actual_value', '--'):.1f}" if c.get("actual_value") is not None else "--"
            explanation = c.get("explanation", "")

            table_rows.append(
                f"""
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                    <td style="padding: 0.6rem; font-size: 0.85rem;">{claim_text}</td>
                    <td style="padding: 0.6rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">{claimed_val}</td>
                    <td style="padding: 0.6rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #60A5FA;">{actual_val}</td>
                    <td style="padding: 0.6rem;"><span class="{badge_cls}">{status}</span></td>
                    <td style="padding: 0.6rem; font-size: 0.8rem; color: #94A3B8;">{explanation}</td>
                </tr>
                """
            )

        st.markdown(
            f"""
            <table style="width: 100%; border-collapse: collapse; text-align: left; margin-top: 0.5rem;">
                <thead>
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.12); color: #94A3B8; font-size: 0.75rem; text-transform: uppercase;">
                        <th style="padding: 0.6rem;">LLM Claim Statement</th>
                        <th style="padding: 0.6rem;">Claimed</th>
                        <th style="padding: 0.6rem;">Telemetry Value</th>
                        <th style="padding: 0.6rem;">Verification Status</th>
                        <th style="padding: 0.6rem;">Evidence Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(table_rows)}
                </tbody>
            </table>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.info("No quantitative claims identified in current copilot response window.")

    # Runbook Expander
    if runbook_content:
        with st.expander(f"📖 Curated Runbook: {runbook_title or 'Network Troubleshooting'}", expanded=False):
            st.markdown(runbook_content)
