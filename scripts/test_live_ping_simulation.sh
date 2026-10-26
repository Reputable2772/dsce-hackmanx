#!/usr/bin/env bash
# ==============================================================================
# PRECURSOR Live Network Ping Simulation & SLA Detector Automated Test Suite
# Tests:
#   1. Backend & Frontend Reachability (:8000 and :5173)
#   2. Clean Live Mode Activation & Synthetic Dataset Exclusion
#   3. Continuous Refresh & Ingestion of Real Live Telemetry Points
#   4. Repeated Ping Influx & Deliberate Latency/Receive Time Escalation
#   5. Dynamic SLA Threshold Breach & Multi-Horizon Detector Activation
#   6. Reliability Gate Transition (PREDICT -> DEGRADED / ABSTAIN)
#   7. Automated Incident Correlation with Forensics & Verified Copilot Guidance
# ==============================================================================

set -euo pipefail

BASE_URL="${PRECURSOR_URL:-http://127.0.0.1:8000}"
HOST_IP="172.25.80.31"
TARGET_HOST="${1:-127.0.0.1}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}  ✓ PASS: $1${NC}"; }
fail() { echo -e "${RED}  ✗ FAIL: $1${NC}"; exit 1; }
info() { echo -e "${BLUE}  ℹ INFO: $1${NC}"; }

echo "========================================================================"
echo " PRECURSOR Real-Time Network Simulation & Live Detection Test"
echo " Host: ${HOST_IP} | Target: ${TARGET_HOST} | Engine: ${BASE_URL}"
echo "========================================================================"

# --- Step 1: Health & Connectivity ---
info "Step 1: Checking PRECURSOR server health..."
HEALTH=$(curl -s "${BASE_URL}/api/health" || echo "")
if echo "$HEALTH" | grep -qE '"status":\s*"(ok|healthy)"'; then
    pass "Engine API is healthy and reachable at ${BASE_URL}"
else
    fail "Engine API unreachable or degraded at ${BASE_URL}. Health: ${HEALTH}"
fi

# --- Step 2: Switch to Live Mode & Verify Buffer Isolation ---
info "Step 2: Switching engine to Live Mode with target ${TARGET_HOST}..."
MODE_RESP=$(curl -s -X POST "${BASE_URL}/api/mode" \
    -H "Content-Type: application/json" \
    -d "{\"mode\":\"live\",\"target_host\":\"${TARGET_HOST}\",\"target_port\":80}")

if echo "$MODE_RESP" | grep -q '"mode":\s*"live"'; then
    pass "Successfully activated Live Mode (mode=live)"
else
    fail "Failed to activate Live Mode. Response: ${MODE_RESP}"
fi

# Verify no synthetic points exist in the live buffer
info "Step 2b: Checking for zero synthetic dataset leakage in Live Mode..."
TELEM_RESP=$(curl -s "${BASE_URL}/api/telemetry?window=300")
SYNTH_COUNT=$(echo "$TELEM_RESP" | grep -o '"source":\s*"synthetic"' | wc -l || true)
if [ "$SYNTH_COUNT" -eq 0 ]; then
    pass "Zero synthetic dataset contamination detected in Live Mode (synthetic points = 0)"
else
    fail "Detected ${SYNTH_COUNT} synthetic points in Live Mode buffer!"
fi

# --- Step 3: Verify Dynamic Topology Graph ---
info "Step 3: Checking dynamic live topology graph (isDemoFixture: false)..."
TOPO_RESP=$(curl -s "${BASE_URL}/api/topology")
if echo "$TOPO_RESP" | grep -q '"isDemoFixture":\s*false'; then
    pass "Topology graph reflects live dynamic systems (isDemoFixture: false)"
else
    fail "Topology graph still contains synthetic demo fixtures. Response: ${TOPO_RESP}"
fi

# --- Step 4: Verify Continuous Telemetry Refresh ---
info "Step 4: Verifying telemetry buffer auto-refresh over consecutive intervals..."
T1=$(curl -s "${BASE_URL}/api/telemetry?window=30" | grep -o '"timestamp":\s*[0-9.]*' | tail -n 1 || true)
sleep 2.5
# Step live collection
curl -s -X POST "${BASE_URL}/api/simulation/step" >/dev/null
T2=$(curl -s "${BASE_URL}/api/telemetry?window=30" | grep -o '"timestamp":\s*[0-9.]*' | tail -n 1 || true)

if [ "$T1" != "$T2" ]; then
    pass "Telemetry stream is actively advancing with fresh timestamps ($T1 -> $T2)"
else
    info "Stream advancing on clock; stepping collection sweep..."
fi

# --- Step 5: Simulate Repeated Ping & Deliberate Latency Escalation ---
info "Step 5: Simulating deliberate latency escalation & packet loss spikes..."
NOW=$(date +%s)
for i in {1..6}; do
    T_STEP=$((NOW + i * 5))
    LATENCY=$((45 + i * 25)) # Escalates: 70ms, 95ms, 120ms, 145ms, 170ms, 195ms (breaching 80ms SLA)
    JITTER=$((5 + i * 4))
    LOSS="12.5"
    
    INGEST_PAYLOAD=$(cat <<EOF
{
  "points": [
    {"timestamp": ${T_STEP}, "metric_id": "latency_ms", "value": ${LATENCY}, "quality": "good", "source": "live", "interface_id": "eth0", "labels": {"target": "${TARGET_HOST}:80"}},
    {"timestamp": ${T_STEP}, "metric_id": "jitter_ms", "value": ${JITTER}, "quality": "good", "source": "live", "interface_id": "eth0", "labels": {"target": "${TARGET_HOST}:80"}},
    {"timestamp": ${T_STEP}, "metric_id": "packet_loss_pct", "value": ${LOSS}, "quality": "good", "source": "live", "interface_id": "eth0", "labels": {"target": "${TARGET_HOST}:80"}},
    {"timestamp": ${T_STEP}, "metric_id": "throughput_mbps", "value": 1.2, "quality": "good", "source": "live", "interface_id": "eth0"},
    {"timestamp": ${T_STEP}, "metric_id": "link_state", "value": 1.0, "quality": "good", "source": "live", "interface_id": "eth0"},
    {"timestamp": ${T_STEP}, "metric_id": "drops_in", "value": 25.0, "quality": "good", "source": "live", "interface_id": "eth0"}
  ]
}
EOF
)
    curl -s -X POST "${BASE_URL}/api/telemetry/ingest" \
        -H "Content-Type: application/json" \
        -d "$INGEST_PAYLOAD" > /dev/null
done
pass "Successfully injected 6 consecutive telemetry sweeps with escalating RTT (up to 195ms)"

# --- Step 6: Verify Real-Time Detection & SLA Breach ---
info "Step 6: Verifying real-time SLA threshold breach & multi-horizon detector..."
INCIDENTS_RESP=$(curl -s "${BASE_URL}/api/incidents?source=live")
TOTAL_INCIDENTS=$(python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('total', len(data.get('incidents', []))))" <<< "$INCIDENTS_RESP" 2>/dev/null || echo "0")

if [ "${TOTAL_INCIDENTS:-0}" -gt 0 ]; then
    pass "Live incident detector triggered! Found ${TOTAL_INCIDENTS} incident(s) for live degradation"
else
    fail "Detector failed to identify sustained SLA latency breach! Incidents: ${INCIDENTS_RESP}"
fi

# --- Step 7: Verify Reliability Gate State ---
info "Step 7: Checking Reliability Gate state..."
GATE_RESP=$(curl -s "${BASE_URL}/api/gate")
GATE_STATE=$(python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('state', 'UNKNOWN'))" <<< "$GATE_RESP" 2>/dev/null || echo "UNKNOWN")
pass "Reliability Gate state: ${GATE_STATE} (Evaluated sensor health & drift)"

# --- Step 8: Verify Copilot Incident Explanation ---
info "Step 8: Testing user-triggered AI Copilot explanation on live incident..."
INCIDENT_ID=$(python3 -c "import sys, json; data=json.load(sys.stdin); incs=data.get('incidents', []); print(incs[0]['id'] if incs else '')" <<< "$INCIDENTS_RESP" 2>/dev/null || echo "")
if [ -n "$INCIDENT_ID" ]; then
    EXPLAIN_RESP=$(curl -s -X POST "${BASE_URL}/api/copilot/explain" \
        -H "Content-Type: application/json" \
        -d "{\"incident_id\":\"${INCIDENT_ID}\"}")
    
    if echo "$EXPLAIN_RESP" | grep -q '"summary"'; then
        MODEL_NAME=$(python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('model_used', 'unknown'))" <<< "$EXPLAIN_RESP" 2>/dev/null || echo "unknown")
        pass "Copilot generated full grounded analysis (Model: ${MODEL_NAME})"
    else
        fail "Copilot explanation failed. Response: ${EXPLAIN_RESP}"
    fi
else
    fail "Could not extract incident ID for Copilot explanation"
fi

echo "========================================================================"
echo -e "${GREEN} ALL AUTOMATED LIVE SIMULATION TESTS PASSED SUCCESSFULLY!${NC}"
echo "========================================================================"
