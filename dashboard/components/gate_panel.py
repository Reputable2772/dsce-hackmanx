"""Reliability Gate state panel showing PREDICT, DEGRADED, and ABSTAIN factors."""

import streamlit as st
from typing import Dict, Any, List


def render_gate_panel(
    gate_state: str,
    reasons: List[str],
    sensor_health_score: float = 0.98,
    drift_score: float = 0.05,
    residual_error_score: float = 0.04,
    immediate_alerts_active: bool = True,
) -> None:
    """Render the Reliability Gate diagnostic panel."""
    st.subheader("Reliability Gate Evaluation")

    state_badge_cls = {
        "PREDICT": "gate-predict",
        "DEGRADED": "gate-degraded",
        "ABSTAIN": "gate-abstain",
    }.get(gate_state, "gate-predict")

    state_icon = {
        "PREDICT": "●",
        "DEGRADED": "▲",
        "ABSTAIN": "■",
    }.get(gate_state, "●")

    st.markdown(
        f"""
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <div>
                <span class="gate-badge {state_badge_cls}">{state_icon} GATE STATE: {gate_state}</span>
            </div>
            <div style="font-size: 0.85rem; color: #94A3B8;">
                Multi-Factor Confidence Assessment
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # 3 Progress indicators
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"**Sensor Health:** `{sensor_health_score*100:.1f}%`")
        st.progress(max(0.0, min(1.0, sensor_health_score)))
    with col2:
        st.markdown(f"**Distribution Drift:** `{drift_score:.2f}`")
        st.progress(max(0.0, min(1.0, drift_score)))
    with col3:
        st.markdown(f"**Residual Anomaly:** `{residual_error_score:.2f}`")
        st.progress(max(0.0, min(1.0, residual_error_score)))

    # Reasons list
    if reasons:
        st.markdown("<div style='margin-top: 0.75rem; font-weight: 600; font-size: 0.85rem; color: #CBD5E1;'>Gate Trigger Reasons:</div>", unsafe_allow_html=True)
        for r in reasons:
            st.markdown(f"- <span style='color: #F87171; font-size: 0.85rem;'>{r}</span>", unsafe_allow_html=True)

    # Safety Rule Invariant Banner
    if immediate_alerts_active:
        st.markdown(
            """
            <div class="safety-banner" style="margin-top: 1rem;">
                <span>🛡️</span>
                <span><strong>Safety Invariant:</strong> Immediate failure rules (Link Cut, Interface Down) bypass suppression and alert in ALL gate states.</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
