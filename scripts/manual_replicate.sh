#!/usr/bin/env bash
# ==============================================================================
# PRECURSOR — Manual End-to-End Replication Script
# Replicates the complete pipeline flow: Live Capture / Synthetic Telemetry ->
# Detectors (+5m, +15m, +30m) -> Reliability Gate -> Spatio-Temporal Incidents ->
# Strict JSON Copilot -> Claim & Assumption Verification -> Hardware Diagnostics.
# ==============================================================================

set -euo pipefail

# ANSI Colors
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
MAGENTA="\033[35m"
DIM="\033[2m"
RESET="\033[0m"

# Default configuration
MODE="synthetic"
SCENARIO="gradual_degradation"
TARGET_HOST="1.1.1.1"
SERVER_URL="http://127.0.0.1:8000"

print_header() {
    echo -e "${BOLD}${CYAN}"
    echo "=============================================================================="
    echo "  PRECURSOR — MANUAL PIPELINE REPLICATION WORKFLOW"
    echo "=============================================================================="
    echo -e "${RESET}"
}

usage() {
    echo -e "${BOLD}Usage:${RESET} $0 [options]"
    echo ""
    echo "Options:"
    echo "  --mode <synthetic|live>    Operation mode (default: synthetic)"
    echo "  --scenario <type>          Synthetic scenario: gradual_degradation | sudden_failure | flapping_link"
    echo "  --target <host>            Target host for real hardware live probes (default: 1.1.1.1)"
    echo "  --server <url>             Backend REST API URL (default: http://127.0.0.1:8000)"
    echo "  --help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --mode synthetic --scenario gradual_degradation"
    echo "  $0 --mode live --target 1.1.1.1"
    exit 0
}

# Parse flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode)
            MODE="$2"
            shift 2
            ;;
        --scenario)
            SCENARIO="$2"
            shift 2
            ;;
        --target)
            TARGET_HOST="$2"
            shift 2
            ;;
        --server)
            SERVER_URL="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${RESET}"
            usage
            ;;
    esac
done

print_header

# ------------------------------------------------------------------------------
# 1. Check Server Availability
# ------------------------------------------------------------------------------
echo -e "${BOLD}[Stage 1] Checking PRECURSOR REST API Server...${RESET}"
if ! curl -s --max-time 2 "$SERVER_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: PRECURSOR server is not reachable at $SERVER_URL${RESET}"
    echo -e "Please start the backend server in another terminal:"
    echo -e "  ${YELLOW}nix develop --command bash -c \"source .venv/bin/activate && python precursor/server.py\"${RESET}"
    exit 1
fi

HEALTH_JSON=$(curl -s "$SERVER_URL/health")
CURRENT_MODE=$(echo "$HEALTH_JSON" | jq -r '.mode')
SIM_TIME=$(echo "$HEALTH_JSON" | jq -r '.simulation_time // .timestamp')
echo -e "  Server status: ${GREEN}ONLINE${RESET} (Active Mode: ${BOLD}$CURRENT_MODE${RESET}, Time: ${DIM}$SIM_TIME${RESET})"
echo ""

# ------------------------------------------------------------------------------
# 2. Execution Mode Selection
# ------------------------------------------------------------------------------
if [[ "$MODE" == "synthetic" ]]; then
    echo -e "${BOLD}[Stage 2] Configuring Synthetic Scenario: ${YELLOW}$SCENARIO${RESET}..."
    curl -s -X POST "$SERVER_URL/api/reset" \
        -H "Content-Type: application/json" \
        -d "{\"scenario\": \"$SCENARIO\", \"seed\": 42}" | jq -r '"  Scenario reset: \(.scenario_type // "OK"), Initial steps: \(.steps // 25)"'

    echo -e "${BOLD}[Stage 3] Fast-forwarding simulation (+60.0s timeline advance)...${RESET}"
    curl -s -X POST "$SERVER_URL/api/fast_forward" \
        -H "Content-Type: application/json" \
        -d '{"seconds": 60.0}' > /dev/null
    echo -e "  Timeline advanced +60 seconds to trigger anomaly corridor."

elif [[ "$MODE" == "live" ]]; then
    echo -e "${BOLD}[Stage 2] Configuring Live Network Hardware Mode (Target: ${YELLOW}$TARGET_HOST${RESET})...${RESET}"
    
    # Auto-detect default interface
    IFACE=$(ip route show default 2>/dev/null | awk '{print $5}' | head -n 1 || echo "eth0")
    echo -e "  Detected active interface: ${CYAN}${IFACE}${RESET}"

    # Switch engine mode via REST
    curl -s -X POST "$SERVER_URL/api/mode" \
        -H "Content-Type: application/json" \
        -d "{\"mode\": \"live\", \"target_host\": \"$TARGET_HOST\"}" | jq -r '"  Engine mode set to: \(.mode)"'

    echo -e "${BOLD}[Stage 3] Generating real network packets on hardware via ICMP probe...${RESET}"
    echo -e "  Running: ${DIM}ping -c 3 -W 1 $TARGET_HOST${RESET}"
    ping -c 3 -W 1 "$TARGET_HOST" || true

    echo -e "${BOLD}[Stage 4] Polling live hardware metrics (TCP connect RTT + /proc/net/dev)...${RESET}"
    curl -s -X POST "$SERVER_URL/api/step" > /dev/null
fi

echo ""

# ------------------------------------------------------------------------------
# 3. Inspect Latest Telemetry & Multi-Horizon Detection
# ------------------------------------------------------------------------------
echo -e "${BOLD}[Stage 4] Fetching Pipeline Snapshot & Multi-Horizon Predictions...${RESET}"
SNAPSHOT=$(curl -s "$SERVER_URL/api/snapshot")

echo -e "\n${BOLD}${MAGENTA}--- ACTIVE TELEMETRY SNAPSHOT ---${RESET}"
echo "$SNAPSHOT" | jq -r '
  .latest_telemetry | to_entries[] | 
  "  • " + (.key | rpad(20)) + ": " + (if .value != null then (.value | tostring) else "N/A" end)
' 2>/dev/null || echo "$SNAPSHOT" | jq '.latest_telemetry'

echo -e "\n${BOLD}${MAGENTA}--- RELIABILITY GATE DECISION ---${RESET}"
echo "$SNAPSHOT" | jq -r '
  .gate_decision |
  "  State:                 " + .state + "\n" +
  "  Sensor Health Score:   " + (.sensor_health_score | tostring) + "\n" +
  "  Distribution Drift KS: " + (.drift_score | tostring) + "\n" +
  "  Residual Variance Exp: " + (.residual_error_score | tostring) + "\n" +
  "  Immediate Alerts:      " + (.immediate_alerts_active | tostring) + "\n" +
  "  Reasons:               " + (.reasons | join("; "))
'

echo -e "\n${BOLD}${MAGENTA}--- MULTI-HORIZON DETECTOR RESULTS ---${RESET}"
echo -e "  ${BOLD}Horizon   Detector           Metric             Score      Threshold   Predicted Impact${RESET}"
echo -e "  -----------------------------------------------------------------------------------"
echo "$SNAPSHOT" | jq -r '
  .detector_results | to_entries[] | .key as $h | .value[] |
  "  +" + ($h + "m") + "       " + (.detector_name | rpad(18)) + " " + (.metric_id | rpad(18)) + " " + (.raw_score | tostring | rpad(10)) + " " + (.threshold | tostring | rpad(11)) + " " + (if .predicted_impact then "\u001b[31mALERT\u001b[0m" else "\u001b[32mNOMINAL\u001b[0m" end)
' 2>/dev/null || echo "$SNAPSHOT" | jq '.detector_results'

# ------------------------------------------------------------------------------
# 4. Inspect Incidents & Strict JSON Copilot Output
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}${MAGENTA}--- ACTIVE INCIDENTS ---${RESET}"
INC_COUNT=$(echo "$SNAPSHOT" | jq '.incidents | length')
if [[ "$INC_COUNT" -eq 0 ]]; then
    echo -e "  No active critical incidents at this snapshot."
else
    echo "$SNAPSHOT" | jq -r '
      .incidents[] |
      "  [" + .severity + "] " + .id + " — " + .title + " (Horizon: +" + (.predicted_horizon_minutes | tostring) + "m)"
    '
fi

echo -e "\n${BOLD}${MAGENTA}--- STRICT JSON COPILOT GUIDANCE & AUDITING ---${RESET}"
COPILOT_EXISTS=$(echo "$SNAPSHOT" | jq '.copilot_response != null')

if [[ "$COPILOT_EXISTS" == "true" ]]; then
    echo -e "${BOLD}Summary:${RESET}"
    echo "$SNAPSHOT" | jq -r '  "  " + .copilot_response.summary'

    echo -e "\n${BOLD}Hypotheses:${RESET}"
    echo "$SNAPSHOT" | jq -r '
      .copilot_response.hypotheses[] | "  [Hypothesis] " + .
    '

    echo -e "\n${BOLD}Operational Assumptions Auditing:${RESET}"
    echo "$SNAPSHOT" | jq -r '
      if (.copilot_response.assumptions | length) > 0 then
        .copilot_response.assumptions[] |
        (if .status == "VALIDATED" then "  \u001b[32m[VALIDATED]\u001b[0m   "
         elif .status == "VIOLATED" then "  \u001b[31m[VIOLATED]\u001b[0m    "
         else "  \u001b[33m[UNTESTABLE]\u001b[0m  " end) +
        .statement + " (" + .explanation + ")"
      else
        "  (No explicit assumptions declared)"
      end
    '

    echo -e "\n${BOLD}Numerical Claims Auditing (+/-10% Tolerance vs Ground Truth):${RESET}"
    echo "$SNAPSHOT" | jq -r '
      if (.copilot_response.claims | length) > 0 then
        .copilot_response.claims[] |
        (if .status == "VERIFIED" then "  \u001b[32m[VERIFIED]\u001b[0m     "
         elif .status == "CONTRADICTED" then "  \u001b[31m[CONTRADICTED]\u001b[0m "
         else "  \u001b[33m[UNVERIFIED]\u001b[0m   " end) +
        .metric_id + " = " + (.claimed_value | tostring) + " — " + .explanation
      else
        "  (No numerical claims extracted)"
      end
    '

    echo -e "\n${BOLD}Recommended Diagnostic Actions (Copyable Bash Commands):${RESET}"
    echo "$SNAPSHOT" | jq -r '
      .copilot_response.diagnostic_commands[] | "  $ " + .
    '
fi

# ------------------------------------------------------------------------------
# 5. Direct Hardware Execution Verification (Live Mode)
# ------------------------------------------------------------------------------
if [[ "$MODE" == "live" ]]; then
    echo -e "\n${BOLD}${CYAN}[Stage 5] Executing Live Hardware Diagnostic Probe...${RESET}"
    IFACE=$(ip route show default 2>/dev/null | awk '{print $5}' | head -n 1 || echo "eth0")
    echo -e "  Executing: ${DIM}ip -s link show dev $IFACE${RESET}"
    ip -s link show dev "$IFACE" | head -n 8 | sed 's/^/  /' || true
fi

# ------------------------------------------------------------------------------
# 6. Persistent Incident DB & Dynamic System Discovery Verification
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}${CYAN}[Stage 6] Verifying Persistent Incident DB & Discovered Topology Graph...${RESET}"

INCIDENTS_RESP=$(curl -s "$SERVER_URL/api/incidents/history?limit=3")
INC_TOTAL=$(echo "$INCIDENTS_RESP" | jq -r '.total // 0')
echo -e "  Incident Database (data/precursor.db): ${BOLD}$INC_TOTAL recorded incidents${RESET}"

if [[ "$INC_TOTAL" -gt 0 ]]; then
    TOP_INC_ID=$(echo "$INCIDENTS_RESP" | jq -r '.incidents[0].id')
    TOP_INC_TITLE=$(echo "$INCIDENTS_RESP" | jq -r '.incidents[0].title')
    TOP_INC_SEV=$(echo "$INCIDENTS_RESP" | jq -r '.incidents[0].severity')
    TOP_INC_PKTS=$(echo "$INCIDENTS_RESP" | jq -r '.incidents[0].packet_samples_count')
    echo -e "  Latest Stored Incident: ${BOLD}$TOP_INC_ID${RESET} [$TOP_INC_SEV] \"$TOP_INC_TITLE\" ($TOP_INC_PKTS packet samples stored)"

    # Query granular packet trace
    PACKET_RESP=$(curl -s "$SERVER_URL/api/incidents/$TOP_INC_ID/packets?limit=2")
    echo -e "  Sample Granular Packet Trace from SQLite:"
    echo "$PACKET_RESP" | jq -r '
      .packets[] | "    -> [" + .timestamp_iso + "] " + .protocol + " " + .source + ":" + (.source_port|tostring) + " -> " + .destination + ":" + (.destination_port|tostring) + " | " + .metric_id + "=" + (.value|tostring) + " (" + .quality + ")"
    '
fi

# Query dynamic topology graph
TOPOLOGY_RESP=$(curl -s "$SERVER_URL/api/topology/systems")
NODE_COUNT=$(echo "$TOPOLOGY_RESP" | jq -r '.nodes | length')
LINK_COUNT=$(echo "$TOPOLOGY_RESP" | jq -r '.links | length')
echo -e "\n  Dynamic Discovered Topology Graph (GET /api/topology/systems):"
echo -e "  Discovered Nodes ($NODE_COUNT):"
echo "$TOPOLOGY_RESP" | jq -r '
  .nodes[] | "    * [" + .type + "] " + .name + " (" + .id + ") status: " + .status
'
echo -e "  Topological Links ($LINK_COUNT):"
echo "$TOPOLOGY_RESP" | jq -r '
  .links[] | "    <-> " + .sourceId + " <---> " + .targetId + " (" + .status + ", latency: " + (.latencyMs|tostring) + "ms)"
'

echo -e "\n${BOLD}${GREEN}✔ Manual replication run completed successfully!${RESET}"
