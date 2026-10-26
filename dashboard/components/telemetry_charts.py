"""Interactive Plotly telemetry time-series charts with dark theme."""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def render_telemetry_charts(df: pd.DataFrame, sla_latency_ms: float = 75.0) -> None:
    """Render interactive dual-panel charts for Latency/Loss and Throughput."""
    if df.empty:
        st.info("Awaiting telemetry stream...")
        return

    # Pivot dataframe for metrics
    # Format timestamps as relative minutes from earliest or local clock
    t0 = df["timestamp"].min()
    df_plot = df.copy()
    df_plot["rel_min"] = (df_plot["timestamp"] - t0) / 60.0

    # Split metrics
    pivoted = df_plot.pivot_table(index="rel_min", columns="metric_id", values="value", aggfunc="last").reset_index()

    fig = make_subplots(
        rows=2,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.08,
        subplot_titles=("Latency (RTT) & Packet Loss with SLA Threshold", "Network Throughput & Drops"),
        row_heights=[0.6, 0.4],
    )

    # 1. Latency Trace
    if "latency_ms" in pivoted.columns:
        fig.add_trace(
            go.Scatter(
                x=pivoted["rel_min"],
                y=pivoted["latency_ms"],
                mode="lines",
                name="Latency (ms)",
                line=dict(color="#60A5FA", width=2.5),
            ),
            row=1,
            col=1,
        )

        # SLA Threshold Line
        fig.add_hline(
            y=sla_latency_ms,
            line=dict(color="#EF4444", width=2, dash="dash"),
            annotation_text=f"SLA Breach ({sla_latency_ms}ms)",
            annotation_position="top left",
            annotation_font=dict(color="#F87171", size=11),
            row=1,
            col=1,
        )

    # 2. Packet Loss Trace (secondary y or overlay)
    if "packet_loss_pct" in pivoted.columns:
        fig.add_trace(
            go.Scatter(
                x=pivoted["rel_min"],
                y=pivoted["packet_loss_pct"],
                mode="lines",
                name="Loss (%)",
                line=dict(color="#F59E0B", width=2, dash="dot"),
                yaxis="y3",
            ),
            row=1,
            col=1,
        )

    # 3. Throughput Trace
    if "throughput_mbps" in pivoted.columns:
        fig.add_trace(
            go.Scatter(
                x=pivoted["rel_min"],
                y=pivoted["throughput_mbps"],
                mode="lines",
                fill="tozeroy",
                name="Throughput (Mbps)",
                line=dict(color="#A78BFA", width=2),
                fillcolor="rgba(167, 139, 250, 0.12)",
            ),
            row=2,
            col=1,
        )

    # Layout styling
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(15, 23, 42, 0.6)",
        plot_bgcolor="rgba(15, 23, 42, 0.4)",
        height=480,
        margin=dict(l=30, r=30, t=40, b=25),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        hovermode="x unified",
    )

    fig.update_xaxes(title_text="Simulation Time (minutes)", row=2, col=1, gridcolor="rgba(255, 255, 255, 0.06)")
    fig.update_xaxes(gridcolor="rgba(255, 255, 255, 0.06)", row=1, col=1)
    fig.update_yaxes(title_text="Latency (ms)", row=1, col=1, gridcolor="rgba(255, 255, 255, 0.06)")
    fig.update_yaxes(title_text="Throughput (Mbps)", row=2, col=1, gridcolor="rgba(255, 255, 255, 0.06)")

    st.plotly_chart(fig, use_container_width=True)
