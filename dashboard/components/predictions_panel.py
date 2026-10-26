"""Multi-horizon early warning prediction cards (5m, 15m, 30m)."""

import streamlit as st
from typing import Dict, Any, List


def render_predictions_panel(
    predictions: Dict[int, Dict[str, Any]],
    gate_state: str = "PREDICT",
) -> None:
    """Render early warning cards across 5m, 15m, and 30m horizons."""
    st.subheader("Multi-Horizon Predictive Early Warning")

    cols = st.columns(3)
    horizons = [5, 15, 30]

    for idx, h in enumerate(horizons):
        data = predictions.get(h, {})
        predicted_impact = data.get("predicted_impact", False)
        is_sustained = data.get("is_sustained", False)
        raw_score = data.get("raw_score", 0.0)
        lead_time = data.get("lead_time_min", 0.0)
        evidence = data.get("evidence", "")

        is_suppressed = (gate_state == "ABSTAIN")

        with cols[idx]:
            if is_suppressed:
                card_cls = "suppressed"
                status_text = "SUPPRESSED (GATE ABSTAIN)"
                status_color = "#94A3B8"
            elif predicted_impact:
                card_cls = "alert"
                status_text = "⚠️ PREDICTED SERVICE IMPACT"
                status_color = "#EF4444"
            else:
                card_cls = "nominal"
                status_text = "✓ NOMINAL (STABLE)"
                status_color = "#34D399"

            st.markdown(
                f"""
                <div class="prediction-box {card_cls}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 700; font-size: 1.1rem; color: #F8FAFC;">Horizon: +{h} min</span>
                        <span style="font-size: 0.75rem; color: #64748B;">Detector: EWMA/Residual</span>
                    </div>
                    <div style="color: {status_color}; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem;">
                        {status_text}
                    </div>
                    <div style="font-size: 0.8rem; color: #94A3B8;">
                        <div>Sustained Breach: <strong>{'YES' if is_sustained else 'NO'}</strong></div>
                        <div>Anomaly Score: <strong>{raw_score:.2f}</strong></div>
                        <div>Est. Lead Time: <strong>{f'{lead_time:.1f} min' if predicted_impact and not is_suppressed else '--'}</strong></div>
                    </div>
                    {f"<div style='margin-top: 0.5rem; font-size: 0.75rem; color: #CBD5E1; background: rgba(0,0,0,0.25); padding: 0.4rem; border-radius: 6px;'>{evidence}</div>" if evidence and not is_suppressed else ""}
                </div>
                """,
                unsafe_allow_html=True,
            )
