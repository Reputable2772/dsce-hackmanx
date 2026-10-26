"""KPI metric cards component for the top fold of the dashboard."""

import streamlit as st
from typing import Dict, Any


def render_kpi_cards(latest_metrics: Dict[str, Any], link_up: bool = True) -> None:
    """Render sleek KPI metric cards across a 6-column grid."""
    cols = st.columns(6)

    rtt = latest_metrics.get("latency_ms")
    jitter = latest_metrics.get("jitter_ms")
    loss = latest_metrics.get("packet_loss_pct")
    tput = latest_metrics.get("throughput_mbps")
    drops = latest_metrics.get("drops_in", 0)

    with cols[0]:
        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-title">Round-Trip Time</div>
                <div class="kpi-value">{f"{rtt:.1f}" if rtt is not None else "--"}<span class="kpi-unit">ms</span></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with cols[1]:
        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-title">Jitter</div>
                <div class="kpi-value">{f"{jitter:.1f}" if jitter is not None else "--"}<span class="kpi-unit">ms</span></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with cols[2]:
        loss_val = f"{loss:.2f}" if loss is not None else "--"
        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-title">Packet Loss</div>
                <div class="kpi-value">{loss_val}<span class="kpi-unit">%</span></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with cols[3]:
        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-title">Throughput</div>
                <div class="kpi-value">{f"{tput:.0f}" if tput is not None else "--"}<span class="kpi-unit">Mbps</span></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with cols[4]:
        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-title">RX Drops</div>
                <div class="kpi-value">{int(drops) if drops is not None else "--"}<span class="kpi-unit">pkts</span></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with cols[5]:
        link_str = "UP" if link_up else "DOWN"
        link_color = "#34D399" if link_up else "#EF4444"
        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-title">Physical Link</div>
                <div class="kpi-value" style="color: {link_color};">{link_str}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
