# PRECURSOR — Features Status & Technical Implementation Details

**Generated:** 2026-10-26  
**System Status:** Production Ready & Verified (24/24 Tests Passing)  
**Target Repository:** `Reputable2772/dsce-hackmanx`

---

## 0. Look-Ahead Predictive Horizons: What 5m, 15m, and 30m Mean

In [`DetectorRegistry`](./precursor/detectors/registry.py#L12-L64), `horizons = [5, 15, 30]` represent **forward-looking predictive lead times** ($t_{\text{target}} = t_{\text{current}} + h \cdot 60\text{ seconds}$), **not** historical logging windows:

* ❌ **It does NOT mean "logging from 5 minutes before current time"**: Lookback history is governed independently by `lookback_seconds` (e.g. 300s for Fixed SLA, 600s for EWMA, 900s for Forecast Residual).
* ❌ **It does NOT mean "5 minutes after the first incident"**: Incidents have not yet occurred when early warning forecasts are generated.
* ✅ **It DOES mean "Predictive Look-Ahead Lead Time"**: At time $t_{\text{current}}$, each detector evaluates current trends to predict whether an SLA violation or statistical failure will occur **5 minutes, 15 minutes, or 30 minutes in the future**.
  - **+5m Horizon**: Immediate short-term impending breach (high urgency).
  - **+15m Horizon**: Medium-term trajectory breach (proactive maintenance window).
  - **+30m Horizon**: Long-term gradual degradation / bufferbloat accumulation (capacity/routing alert).

---

## 1. How the Statistics & Other Detectors are Implemented

All detectors inherit from [`BaseDetector`](./precursor/detectors/base.py#L22-L48) and are registered in [`DetectorRegistry`](./precursor/detectors/registry.py#L12-L64).

### A. Fixed SLA Threshold Detector ([`fixed_sla.py`](./precursor/detectors/fixed_sla.py))
* **Objective**: Enforces defined operational Service Level Agreements (`latency_ms > 80.0`, `packet_loss_pct > 5.0%`, `jitter_ms > 15.0`, `drops_in > 20.0`).
* **Sustained Breach Window**: Evaluates the last $N$ valid samples ($N = \text{sustained\_samples}$, default `3`). The metric must remain $\ge \text{threshold}$ across all $N$ observations. Single-sample spikes/jitter are suppressed.
* **Trend Projection**: If not currently in breach, it fits a degree-1 linear polynomial (OLS) $\hat{x}(\Delta t) = m \cdot \Delta t + c$ over the lookback history. If $m > 0$ and the forward projected value $\hat{x}(t + h \cdot 60) \ge \text{threshold}$, it flags `predicted_impact = True` for that specific horizon.

### B. Adaptive EWMA Detector ([`ewma.py`](./precursor/detectors/ewma.py))
* **Objective**: Self-adjusting anomaly detection that detects drift without static limits.
* **Formulation**:
  $$\mu_0 = x_0, \quad \mu_t = \alpha \cdot x_t + (1 - \alpha) \cdot \mu_{t-1} \quad (\alpha = 0.2)$$
  $$\text{residuals}_t = x_t - \mu_t, \quad \sigma_t = \text{std}(\text{residuals}) \ge 10^{-4}$$
  $$\text{Upper Limit}_t = \mu_t + k \cdot \sigma_t \quad (k = 3.0, \text{3-sigma rule})$$
  $$Z_t = \frac{x_t - \mu_t}{\sigma_t}$$
* **Trajectory Extrapolation**: Fits an OLS slope on the last 5 EWMA values. If the projected EWMA at $t + h \cdot 60$ exceeds $\text{Upper Limit}$ or projected $Z \ge 3.0$, it triggers `predicted_impact = True`.

### C. Forecast-Residual Detector ([`forecast_residual.py`](./precursor/detectors/forecast_residual.py))
* **Objective**: Lightweight 1-step linear regression residual scoring to detect abrupt trend changes.
* **Formulation**:
  - Calibrates baseline $\mu_{\text{base}}, \sigma_{\text{base}}$ over the first $60\%$ of observations in the lookback window ($900$s).
  - Fits linear regression $\hat{y}_t = m \cdot t + c$ over the window.
  - Normalized Residual: $R_{\text{norm}} = \frac{|y_{\text{latest}} - \hat{y}_{\text{latest}}|}{\max(\text{RMSE}, 10^{-3})}$, where $\text{RMSE} = \sqrt{\frac{1}{n}\sum (y_i - \hat{y}_i)^2}$.
  - Triggers if $R_{\text{norm}} > 2.5$ or if the forward projection $\hat{y}_{t + h \cdot 60}$ drifts $> 3\sigma$ from $\mu_{\text{base}}$.

### D. Immediate Fault Detector ([`immediate.py`](./precursor/detectors/immediate.py))
* **Objective**: Hard physical failure detection (`link_state == 0.0` or `packet_loss_pct >= 99%`) operating with zero latency ($15$s tail buffer).
* **Safety Invariant**: Flags `is_immediate_fault = True`, which bypasses any gate suppression across all states.

---

## 2. How the Reliability Gates are Implemented

Implemented in [`precursor/gate/reliability_gate.py`](./precursor/gate/reliability_gate.py) and [`precursor/gate/states.py`](./precursor/gate/states.py).

### The Tri-State Machine
1. **`PREDICT`**: Normal telemetry. All predictive models emit proactive alerts.
2. **`DEGRADED`**: Sensor degradation ($20\%\text{--}50\%$), detectable Kolmogorov-Smirnov distribution drift, or residual variance expansion. Predictions continue with confidence penalties.
3. **`ABSTAIN`**: Hard sensor failure ($> 50\%$ invalid/stale/missing). Predictive warnings are suppressed to eliminate alert fatigue.
* **Safety Invariant**: `immediate_alerts_active = True` in all three states. Physical faults are never silenced.

### The 3 Statistical Reliability Checks
1. **Sensor Quality & Health Check**:
   $$\text{unhealthy\_ratio} = \text{missing\_ratio} + \text{invalid\_ratio} + \text{stale\_ratio}$$
   - $\text{unhealthy\_ratio} \ge 0.50 \implies \mathbf{ABSTAIN}$.
   - $\text{unhealthy\_ratio} \ge 0.20 \implies \mathbf{DEGRADED}$.
2. **Distribution Shift / Drift Check (Two-Sample Kolmogorov-Smirnov Test)**:
   - Uses `scipy.stats.ks_2samp` to compare empirical CDFs between baseline window ($[0, 1200\text{s}]$) and recent window ($[t - 600\text{s}, t]$) for `latency_ms` and `throughput_mbps`.
   - Kolmogorov-Smirnov test statistic:
     $$D = \sup_x |F_{\text{recent}}(x) - F_{\text{base}}(x)|$$
   - If $D > 0.65$ and $p < 0.01 \implies \mathbf{DEGRADED}$.
3. **Forecast Residual Variance Expansion Ratio**:
   - Measures noise explosion by dividing late-half window variance by early-half window variance:
     $$\text{expansion} = \frac{\text{Var}(\text{recent\_observations})}{\text{Var}(\text{early\_observations})}$$
   - If $\text{expansion} > 3.5 \implies \mathbf{DEGRADED}$.

---

## 3. Unit Tests Architecture & Coverage

24 total tests pass cleanly in the Nix flake environment:

1. **Core Unit Suite** ([`tests/test_precursor.py`](./tests/test_precursor.py) — 8 tests):
   - Ring buffer insertion, timestamp slicing, NaN filtering.
   - Quality profiling (Good, Stale, Invalid, Missing).
   - Fixed SLA sustained window & trend checks.
   - EWMA dynamic $\pm 3\sigma$ adaptation.
   - Forecast-Residual OLS normalization.
   - Immediate zero-latency fault detection.
   - Gate sensor failure transitions (`ABSTAIN`).
   - Gate Kolmogorov-Smirnov drift transitions (`DEGRADED`).
2. **Storage & Archival Suite** ([`tests/test_storage_export.py`](./tests/test_storage_export.py) — 6 tests):
   - UTC ISO 8601 formatting and reversible parsing.
   - CSV export schema and 100% round-trip fidelity.
   - JSON structured nested run archive serialization.
   - Local filesystem [`RunStorageManager`](./precursor/storage/run_manager.py) persistence.
   - Scenario reproducibility across identical seeds.
3. **Live Telemetry Suite** ([`tests/test_live_mode.py`](./tests/test_live_mode.py) — 3 tests):
   - Live socket latency connect probe, jitter delta, and `/proc/net/dev` interface counters.
   - `PrecursorEngine.set_mode("live")` and live pipeline processing.
   - REST API endpoints (`GET/POST /api/mode`, `POST /api/telemetry/ingest`).
4. **Integration Suite** ([`tests/test_integration.py`](./tests/test_integration.py) — 6 tests):
   - Multi-horizon incident correlation.
   - Counterfactual paired evaluation engine.
   - REST API engine stepping and fast-forwarding.

---

## 4. Project-Wide End-to-End Test (Full Flow)

Automated in [`tests/test_e2e_flow.py`](./tests/test_e2e_flow.py):

* **Stage 1: Live Capture**: Queries real Linux sockets and `/proc/net/dev` via [`LiveTelemetryCollector`](./precursor/telemetry/live_collector.py). Verifies `batch.source == "live"` and all 6 metrics (`latency_ms`, `jitter_ms`, `packet_loss_pct`, `throughput_mbps`, `link_state`, `drops_in`).
* **Stage 2: Telemetry Ingestion**: Ingests batch into [`PrecursorEngine`](./precursor/runner.py) in live mode, verifying ring buffer insertion and quality profiling.
* **Stage 3: Multi-Horizon Statistical Analysis**: Runs all 11 detectors across $+5$m, $+15$m, and $+30$m predictive horizons.
* **Stage 4: Reliability Gate Evaluation**: Evaluates sensor quality, KS drift, and residual variance, asserting valid state with `immediate_alerts_active = True`.
* **Stage 5: Incident Correlation**: Clusters anomalies into unified incidents with primary metric attribution and severity calculation (`CRITICAL`/`WARNING`).
* **Stage 6: Copilot LLM & Runbook Matching**: Matches incident against 9 offline network runbooks and generates structured prompt for local Ollama.
* **Stage 7: Hypothesis & Numerical Claim Verification**: Extracts all assertions from LLM hypothesis and audits them against ground-truth snapshot readings.
* **Stage 8: Diagnostic Action Dispatch**: Validates that all suggested bash commands are non-empty, actionable, and adhere to safe Linux diagnostic tools (`ping`, `mtr`, `traceroute`, `ethtool`, `ip`, `tc`, `ss`, `curl`, `dmesg`).

---

## 5. How the LLM's Hypothesis is Verified Currently

Implemented in [`precursor/copilot/claim_verifier.py`](./precursor/copilot/claim_verifier.py):

1. **Regex Extraction**: Scans LLM text for assertions across all telemetry dimensions:
   - Latency: `(?:latency|rtt|delay)[^.\n]*?(\d+(?:\.\d+)?)\s*(?:ms|milliseconds)`
   - Packet Loss: `(?:packet\s*loss|loss\s*rate|drop\s*rate)[^.\n]*?(\d+(?:\.\d+)?)\s*%`
   - Jitter: `(?:jitter)[^.\n]*?(\d+(?:\.\d+)?)\s*ms`
   - Throughput: `(?:throughput|bandwidth|traffic|load)[^.\n]*?(\d+(?:\.\d+)?)\s*(?:mbps|mbit/s)`
   - Packet Drops: `(\d+(?:\.\d+)?)\s*(?:drops|packets?\s*dropped|discards)`
2. **Snapshot Cross-Referencing**: Pairs extracted metric ID and claimed value with the current ground truth from `latest_telemetry`.
3. **Tolerance Check ($\pm 10\%$)**:
   $$\text{Relative Error} = \frac{|\text{Claimed Value} - \text{Actual Value}|}{\max(|\text{Actual Value}|, 10^{-4})}$$
   - **`VERIFIED`**: If $\text{Relative Error} \le 0.10$.
   - **`CONTRADICTED`**: If $\text{Relative Error} > 0.10$.
   - **`UNVERIFIED`**: If metric is missing or ambiguous.
4. **Presentation**: Displayed on frontend (Tab 2: Copilot & Claims) as color-coded badges with exact percentage discrepancies.
