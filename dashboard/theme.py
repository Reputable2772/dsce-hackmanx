"""Aesthetic dark-mode theme, CSS tokens, and layout styles for PRECURSOR."""

CUSTOM_CSS = """
<style>
/* PRECURSOR Modern Dark Aesthetic */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', sans-serif;
}

code, pre, .stCodeBlock {
    font-family: 'JetBrains Mono', monospace !important;
}

/* Background gradient */
.stApp {
    background: radial-gradient(circle at 15% 15%, rgba(17, 24, 39, 1) 0%, rgba(10, 15, 29, 1) 100%);
    color: #F3F4F6;
}

/* Header Banner */
.precursor-header {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 1.25rem 1.75rem;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.precursor-title {
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
}

.precursor-subtitle {
    font-size: 0.85rem;
    color: #94A3B8;
    margin: 0;
    font-weight: 500;
}

/* KPI Metric Cards */
.kpi-card {
    background: rgba(30, 41, 59, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
}
.kpi-card:hover {
    border-color: rgba(96, 165, 250, 0.3);
    transform: translateY(-2px);
}
.kpi-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94A3B8;
    font-weight: 600;
    margin-bottom: 0.25rem;
}
.kpi-value {
    font-size: 1.65rem;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: #F8FAFC;
}
.kpi-unit {
    font-size: 0.85rem;
    color: #64748B;
    font-weight: 400;
    margin-left: 0.25rem;
}

/* Gate State Badges */
.gate-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
}
.gate-predict {
    background: rgba(16, 185, 129, 0.15);
    color: #34D399;
    border: 1px solid rgba(16, 185, 129, 0.35);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}
.gate-degraded {
    background: rgba(245, 158, 11, 0.15);
    color: #FBBF24;
    border: 1px solid rgba(245, 158, 11, 0.35);
    box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
}
.gate-abstain {
    background: rgba(239, 68, 68, 0.15);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.35);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
}

/* Prediction Cards */
.prediction-box {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1.1rem;
    margin-bottom: 0.75rem;
}
.prediction-box.alert {
    border-left: 4px solid #EF4444;
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%);
}
.prediction-box.nominal {
    border-left: 4px solid #10B981;
}
.prediction-box.suppressed {
    border-left: 4px solid #64748B;
    opacity: 0.75;
}

/* Verification Claim Status Tags */
.claim-verified {
    background: rgba(16, 185, 129, 0.2);
    color: #10B981;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.75rem;
    border: 1px solid rgba(16, 185, 129, 0.4);
}
.claim-contradicted {
    background: rgba(239, 68, 68, 0.2);
    color: #EF4444;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.75rem;
    border: 1px solid rgba(239, 68, 68, 0.4);
}
.claim-unverified {
    background: rgba(148, 163, 184, 0.2);
    color: #94A3B8;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.3);
}

/* Safety Rule Banner */
.safety-banner {
    background: rgba(220, 38, 38, 0.12);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    font-size: 0.82rem;
    color: #FCA5A5;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
"""
