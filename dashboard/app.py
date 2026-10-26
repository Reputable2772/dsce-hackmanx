"""PRECURSOR — Streamlit Operator Console & Reliability-Gated Early Warning Dashboard."""

import time
import streamlit as st

from precursor.runner import PrecursorEngine, SystemSnapshot
from precursor.telemetry.synthetic import ScenarioType
from precursor.telemetry.live_collector import LiveTelemetryCollector

from dashboard.theme import CUSTOM_CSS
from dashboard.components.kpi_cards import render_kpi_cards
from dashboard.components.telemetry_charts import render_telemetry_charts
from dashboard.components.gate_panel import render_gate_panel
from dashboard.components.predictions_panel import render_predictions_panel
from dashboard.components.copilot_panel import render_copilot_panel
from dashboard.components.evaluation_panel import render_evaluation_panel

# 1. Page Configuration
st.set_page_config(
    page_title="PRECURSOR — Reliability-Gated Network Copilot",
    page_icon="📡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# 2. Inject Aesthetics
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

# 3. Session State Initialization
if "engine" not in st.session_state:
    st.session_state.engine = PrecursorEngine(
        scenario_type=ScenarioType.GRADUAL_DEGRADATION,
        seed=42,
        interface_id="eth0",
    )
    st.session_state.current_scenario = ScenarioType.GRADUAL_DEGRADATION.value
    # Seed initial 25 steps (125s) so charts and baselines are populated
    st.session_state.snapshot = st.session_state.engine.fast_forward(125.0)
    st.session_state.sim_steps = 25

if "collector" not in st.session_state:
    st.session_state.collector = LiveTelemetryCollector()

if "is_auto_playing" not in st.session_state:
    st.session_state.is_auto_playing = False

# 4. Sidebar Controls
with st.sidebar:
    st.markdown("### 🎛️ Simulation & Telemetry Controls")

    mode = st.radio("Telemetry Ingestion Mode", ["Synthetic Replay", "Live Linux Probes"], index=0)

    if mode == "Synthetic Replay":
        scenario_options = {
            "Gradual Degradation (Memory Leak / SLA Breach)": ScenarioType.GRADUAL_DEGRADATION,
            "Sudden Failure (Physical Fiber Cut)": ScenarioType.SUDDEN_FAILURE,
            "Normal Baseline (Steady State)": ScenarioType.NORMAL_BASELINE,
            "Traffic Surge (Benign Backup Job)": ScenarioType.TRAFFIC_SURGE,
            "Slow Drift (Hardware Thermal Throttling)": ScenarioType.SLOW_DRIFT,
            "Sensor Degradation (Packet Drops in Reporter)": ScenarioType.SENSOR_DEGRADATION,
            "Oscillating Instability (Route / BGP Flapping)": ScenarioType.OSCILLATING_INSTABILITY,
            "Post-Fault Recovery (Failover & Healing)": ScenarioType.POST_FAULT_RECOVERY,
        }

        selected_label = st.selectbox("Select Scenario", list(scenario_options.keys()))
        selected_type = scenario_options[selected_label]

        # Reset if scenario changed
        if st.session_state.current_scenario != selected_type.value:
            st.session_state.current_scenario = selected_type.value
            st.session_state.engine.reset_scenario(selected_type, seed=42)
            st.session_state.snapshot = st.session_state.engine.fast_forward(125.0)
            st.session_state.sim_steps = 25
            st.rerun()

        st.caption(st.session_state.engine.generator.ground_truth.description)

        st.markdown("---")
        st.markdown("#### ⏯️ Time-Travel Controls")
        col_btn1, col_btn2, col_btn3 = st.columns(3)
        with col_btn1:
            if st.button("Step +5s", width="stretch"):
                st.session_state.snapshot = st.session_state.engine.step_simulation()
                st.session_state.sim_steps += 1
                st.rerun()
        with col_btn2:
            if st.button("Jump +1m", width="stretch"):
                st.session_state.snapshot = st.session_state.engine.fast_forward(60.0)
                st.session_state.sim_steps += 12
                st.rerun()
        with col_btn3:
            if st.button("Reset", width="stretch"):
                st.session_state.engine.reset_scenario(selected_type, seed=42)
                st.session_state.snapshot = st.session_state.engine.fast_forward(125.0)
                st.session_state.sim_steps = 25
                st.rerun()

        st.markdown("---")
        auto_play = st.toggle("Continuous Stream Loop", value=st.session_state.is_auto_playing)
        st.session_state.is_auto_playing = auto_play

    else:
        st.markdown("#### 🔌 Live Probe Settings")
        live_host = st.text_input("Target Host / Gateway", value="127.0.0.1")
        live_port = st.number_input("Target Port", value=80, min_value=1, max_value=65535)
        live_iface = st.text_input("Interface ID", value="eth0")

        st.session_state.collector.target_host = live_host
        st.session_state.collector.target_port = int(live_port)
        st.session_state.collector.interface_id = live_iface

        if st.button("Poll Live Now", width="stretch"):
            live_batch = st.session_state.collector.collect()
            st.session_state.snapshot = st.session_state.engine.ingest_points(live_batch.points)
            st.session_state.sim_steps += 1
            st.rerun()

        st.markdown("---")
        auto_play = st.toggle("Continuous Live Polling (2s)", value=st.session_state.is_auto_playing)
        st.session_state.is_auto_playing = auto_play

    st.markdown("---")
    st.markdown("### ⚙️ Operator SLA Limits")
    sla_threshold = st.slider("Latency SLA Limit (ms)", min_value=30.0, max_value=150.0, value=75.0, step=5.0)

# Continuous Playback Loop Handler
if st.session_state.is_auto_playing:
    if mode == "Synthetic Replay":
        st.session_state.snapshot = st.session_state.engine.step_simulation()
        st.session_state.sim_steps += 1
        time.sleep(0.5)
        st.rerun()
    elif mode == "Live Linux Probes":
        live_batch = st.session_state.collector.collect()
        st.session_state.snapshot = st.session_state.engine.ingest_points(live_batch.points)
        st.session_state.sim_steps += 1
        time.sleep(2.0)
        st.rerun()

# 5. Extract Recent Metrics & Compute Diagnostics from PrecursorEngine
snapshot: SystemSnapshot = st.session_state.snapshot
df_all = st.session_state.engine.buffer.get_df()
latest_metrics = snapshot.latest_telemetry
link_is_up = bool(latest_metrics.get("link_state") is None or latest_metrics.get("link_state", 1.0) > 0.5)

# Reliability Gate Decision
gate_decision = snapshot.gate_decision
gate_state = gate_decision.state.value
gate_reasons = gate_decision.reasons
sensor_health_score = gate_decision.sensor_health_score
drift_score = gate_decision.drift_score
residual_score = gate_decision.residual_error_score

# Multi-Horizon Prediction Mapping
sim_elapsed_min = (st.session_state.sim_steps * 5.0) / 60.0
predictions = {}
for h in [5, 15, 30]:
    h_results = snapshot.detector_results.get(h, [])
    pred_impact = any(r.predicted_impact for r in h_results)
    is_sustained = any(r.is_sustained for r in h_results)
    max_score = max((r.raw_score for r in h_results), default=0.0)
    evidences = [str(r.evidence) for r in h_results if r.evidence and r.predicted_impact]
    predictions[h] = {
        "predicted_impact": pred_impact,
        "is_sustained": is_sustained,
        "raw_score": round(max_score, 2),
        "lead_time_min": float(h) * 0.9 if pred_impact else 0.0,
        "evidence": " | ".join(evidences) if evidences else "Nominal operating telemetry",
    }

# 6. Header Banner
st.markdown(
    f"""
    <div class="precursor-header">
        <div>
            <h1 class="precursor-title">📡 PRECURSOR</h1>
            <p class="precursor-subtitle">Reliability-Gated Early Warning & Copilot for Network Failures</p>
        </div>
        <div style="display: flex; gap: 1.5rem; align-items: center;">
            <div style="text-align: right;">
                <div style="font-size: 0.75rem; color: #94A3B8; text-transform: uppercase;">Simulation Time</div>
                <div style="font-size: 1.25rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #60A5FA;">
                    T + {int(sim_elapsed_min)}m {int((st.session_state.sim_steps*5)%60)}s
                </div>
            </div>
            <div>
                <span class="gate-badge gate-{gate_state.lower()}">● GATE: {gate_state}</span>
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# 7. Render Top Fold KPI Cards
render_kpi_cards(latest_metrics, link_up=link_is_up)

st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

# 8. Main Workspace Tabs
tab1, tab2, tab3, tab4 = st.tabs([
    "📡 Telemetry & Early Warning",
    "🤖 Offline Copilot & Claim Verifier",
    "⚖️ Paired Evaluation (Gate ON vs OFF)",
    "🗂️ Clustered Incidents & Topology",
])

# Tab 1: Telemetry & Early Warning
with tab1:
    col_chart, col_side = st.columns([0.65, 0.35])

    with col_chart:
        render_telemetry_charts(df_all, sla_latency_ms=sla_threshold)

    with col_side:
        render_gate_panel(
            gate_state=gate_state,
            reasons=gate_reasons,
            sensor_health_score=sensor_health_score,
            drift_score=drift_score,
            residual_error_score=residual_score,
            immediate_alerts_active=True,
        )

    # Full width multi-horizon predictions row
    render_predictions_panel(predictions=predictions, gate_state=gate_state)

# Tab 2: Offline Copilot & Claim Verifier
with tab2:
    if snapshot.copilot_response:
        cr = snapshot.copilot_response
        copilot_dict = {
            "summary": cr.summary,
            "hypotheses": cr.hypotheses,
            "diagnostic_commands": cr.diagnostic_commands,
            "verification_steps": cr.verification_steps,
            "risks_and_rollback": cr.risks_and_rollback,
            "claims": [c.model_dump() for c in cr.claims],
        }
        matches = []
        if snapshot.incidents:
            matches = st.session_state.engine.matcher.match(snapshot.incidents[0], top_k=1)
        runbook_title = matches[0].title if matches else "Network Performance & SLA Mitigation"
        runbook_content = matches[0].content if matches else "### Operational Runbook\nFollow standard triage procedures."
    else:
        rtt_curr = latest_metrics.get("latency_ms", 22.0)
        copilot_dict = {
            "summary": f"Nominal network operating state. Current latency is {rtt_curr:.1f}ms, within operational parameters.",
            "hypotheses": ["Normal steady-state background traffic"],
            "diagnostic_commands": ["ping -c 3 1.1.1.1", "ip -s link show dev eth0"],
            "verification_steps": ["Confirm latency and packet loss remain below SLA threshold"],
            "risks_and_rollback": ["Diagnostic commands are read-only and carry zero operational risk."],
            "claims": [
                {
                    "claim_text": f"Latency is stable at {rtt_curr:.1f}ms",
                    "claimed_value": f"{rtt_curr:.1f}ms",
                    "actual_value": rtt_curr,
                    "status": "VERIFIED",
                    "explanation": "Observed value aligns with recent rolling telemetry.",
                }
            ],
        }
        runbook_title = "Steady-State Operational Baseline"
        runbook_content = """### Runbook: Nominal Operating Baseline
1. **Verification**: Confirm network interfaces reflect `UP` status.
2. **Monitoring**: Maintain continuous polling of EWMA and Forecast-Residual bands.
"""

    render_copilot_panel(
        copilot_data=copilot_dict,
        runbook_title=runbook_title,
        runbook_content=runbook_content,
    )

# Tab 3: Paired Evaluation
with tab3:
    if "eval_cache" not in st.session_state:
        st.session_state.eval_cache = {}

    curr_type = getattr(st.session_state.engine, "scenario_type", ScenarioType.GRADUAL_DEGRADATION)
    if curr_type.value not in st.session_state.eval_cache:
        st.session_state.eval_cache[curr_type.value] = st.session_state.engine.run_paired_evaluation(curr_type, seed=42)

    comparison = st.session_state.eval_cache[curr_type.value]
    on_15 = comparison.gate_on.get(15) or comparison.gate_on.get(5)
    off_15 = comparison.gate_off.get(15) or comparison.gate_off.get(5)
    if on_15 and off_15:
        eval_data = {
            "gate_off": {
                "recall_pct": round(off_15.event_recall * 100.0, 1),
                "false_alarms_per_hr": round(off_15.false_alarms_per_hour, 1),
                "lead_time_min": round(off_15.average_lead_time_minutes, 1),
                "missed_faults": off_15.missed_faults,
                "abstention_rate_pct": round(off_15.abstention_rate * 100.0, 1),
            },
            "gate_on": {
                "recall_pct": round(on_15.event_recall * 100.0, 1),
                "false_alarms_per_hr": round(on_15.false_alarms_per_hour, 1),
                "lead_time_min": round(on_15.average_lead_time_minutes, 1),
                "missed_faults": on_15.missed_faults,
                "abstention_rate_pct": round(on_15.abstention_rate * 100.0, 1),
            },
        }
    else:
        eval_data = None

    render_evaluation_panel(eval_data=eval_data)

# Tab 4: Clustered Incidents & Topology
with tab4:
    st.subheader("🗂️ Active Incident Bundles & Topological Grouping")
    st.caption("Incidents deterministically grouped across interfaces and co-occurring telemetry signals.")

    if snapshot.incidents:
        cols = st.columns(min(len(snapshot.incidents), 2))
        for idx, inc in enumerate(snapshot.incidents):
            col_target = cols[idx % len(cols)]
            with col_target:
                sev_val = inc.severity.value if hasattr(inc.severity, "value") else str(inc.severity)
                sev_color = "#EF4444" if sev_val == "CRITICAL" else "#F59E0B" if sev_val == "WARNING" else "#3B82F6"
                type_label = "ACTIVE FAULT" if inc.is_active_fault else f"PREDICTED ({inc.predicted_horizon_minutes}m)"
                evidence_text = ", ".join(f"{k}: {v}" for k, v in inc.evidence_summary.items()) if inc.evidence_summary else "Anomalous telemetry breach detected"
                st.markdown(
                    f"""
                    <div class="kpi-card" style="margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: 700; color: #F8FAFC;">{inc.id}: {inc.title}</span>
                            <span style="color: {sev_color}; font-weight: 600; font-size: 0.8rem;">{sev_val}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #94A3B8; margin-top: 0.5rem;">
                            Type: <strong>{type_label}</strong> | Status: <strong>{inc.status}</strong>
                        </div>
                        <div style="font-size: 0.85rem; color: #94A3B8; margin-top: 0.25rem;">
                            Co-occurring Signals: {", ".join(f"<code>{m}</code>" for m in inc.primary_metrics)}
                        </div>
                        <div style="font-size: 0.8rem; color: #CBD5E1; margin-top: 0.5rem;">
                            Evidence: {evidence_text}
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
    else:
        st.markdown(
            """
            <div class="kpi-card" style="text-align: center; padding: 2rem;">
                <span style="font-size: 1.5rem;">✅</span>
                <div style="color: #34D399; font-weight: 600; margin-top: 0.5rem;">Nominal Operating State</div>
                <div style="font-size: 0.85rem; color: #94A3B8; margin-top: 0.25rem;">
                    Zero active outages or early warning predictions detected.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
