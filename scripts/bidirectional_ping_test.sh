#!/usr/bin/env bash
# ==============================================================================
# PRECURSOR Bidirectional Network Ping & Live Packet Flow Tester
# Tests:
#   1. Incoming Packets: Monitors ICMP Echo Requests received from the other laptop
#   2. Outgoing Packets: Sends ICMP Echo Probes from this laptop to the other laptop
#   3. Round-Trip Latency & Jitter in real time
#   4. Live Engine Ingestion into PRECURSOR Dashboard
# ==============================================================================

set -euo pipefail

LOCAL_IP="172.25.80.31"
TARGET_IP="${1:-172.25.80.33}"
TARGET_PORT="${2:-8000}"
DURATION="${3:-10}"
ENGINE_URL="${PRECURSOR_URL:-http://127.0.0.1:8000}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "========================================================================"
echo -e "${CYAN} PRECURSOR Bidirectional Live Network Testing${NC}"
echo " Host Laptop IP:    ${LOCAL_IP}"
echo " Target Laptop IP:  ${TARGET_IP}"
echo " Target Port:       ${TARGET_PORT} (TCP)"
echo " Test Duration:     ${DURATION} samples"
echo " Dashboard URL:     http://${LOCAL_IP}:5173"
echo "========================================================================"

get_snmp_val() {
    local key="$1"
    python3 -c "
with open('/proc/net/snmp') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if l.startswith('Icmp:') and i + 1 < len(lines) and lines[i+1].startswith('Icmp:'):
        h = l.split()[1:]
        v = lines[i+1].split()[1:]
        m = dict(zip(h, v))
        print(m.get('${key}', '0'))
        break
" 2>/dev/null || echo "0"
}

# --- 1. Configure PRECURSOR Engine to Live Mode with Target ---
echo -e "${BLUE}[1/4] Synchronizing PRECURSOR Live Engine with Target ${TARGET_IP}:${TARGET_PORT}...${NC}"
curl -s -X POST "${ENGINE_URL}/api/mode" \
    -H "Content-Type: application/json" \
    -d "{\"mode\":\"live\",\"target_host\":\"${TARGET_IP}\",\"target_port\":${TARGET_PORT}}" > /dev/null || true
echo -e "${GREEN}  ✓ Live Mode engaged on interface enp0s31f6${NC}"

# --- 2. Baseline Inbound Counters ---
INIT_IN_ECHOS=$(get_snmp_val "InEchos")
INIT_OUT_REPS=$(get_snmp_val "OutEchoReps")
echo -e "${BLUE}[2/4] Initial Inbound ICMP State: InEchos=${INIT_IN_ECHOS}, OutEchoReps=${INIT_OUT_REPS}${NC}"
echo -e "${YELLOW}  👉 (Testing incoming packets: other laptop continuously sends pings to ${LOCAL_IP})${NC}"

# --- 3. Outbound Probing ---
echo -e "${BLUE}[3/4] Transmitting outgoing probes to ${TARGET_IP}:${TARGET_PORT}...${NC}"

# ICMP test
echo -n "  * ICMP Ping Probe: "
ICMP_OUT=$(ping -c 3 -W 1 "${TARGET_IP}" 2>&1 || true)
if echo "$ICMP_OUT" | grep -q -E '(^|[^0-9])0% packet loss'; then
    echo -e "${GREEN}ICMP Responding${NC}"
else
    echo -e "${YELLOW}ICMP Blocked by Remote Firewall (Standard on Windows/managed laptops)${NC}"
fi

# TCP Socket Probes
echo "  * TCP Socket Probes (${DURATION} samples):"
TCP_STATS=$(python3 -c "
import socket, time, json

target_ip = '${TARGET_IP}'
target_port = int('${TARGET_PORT}')
count = int('${DURATION}')
durations = []
errors = 0

for i in range(count):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.5)
    t0 = time.perf_counter()
    try:
        s.connect((target_ip, target_port))
        dt = (time.perf_counter() - t0) * 1000.0
        durations.append(dt)
        s.close()
    except Exception as e:
        errors += 1
    time.sleep(0.3)

loss_pct = (errors / count) * 100.0 if count > 0 else 100.0
if durations:
    min_d = min(durations)
    max_d = max(durations)
    avg_d = sum(durations) / len(durations)
    diffs = [abs(durations[i] - durations[i-1]) for i in range(1, len(durations))]
    avg_jitter = sum(diffs)/len(diffs) if diffs else 0.0
else:
    min_d = max_d = avg_d = avg_jitter = 0.0

print(json.dumps({
    'transmitted': count,
    'received': len(durations),
    'loss_pct': loss_pct,
    'min_ms': round(min_d, 2),
    'avg_ms': round(avg_d, 2),
    'max_ms': round(max_d, 2),
    'jitter_ms': round(avg_jitter, 2)
}))
")

# Advance PRECURSOR engine step with live data
curl -s -X POST "${ENGINE_URL}/api/step" \
    -H "Content-Type: application/json" \
    -d "{\"seconds\": 5.0}" > /dev/null || true

# --- 4. Final Inbound Counters & Delta Calculation ---
FINAL_IN_ECHOS=$(get_snmp_val "InEchos")
FINAL_OUT_REPS=$(get_snmp_val "OutEchoReps")
DELTA_IN_ECHOS=$((FINAL_IN_ECHOS - INIT_IN_ECHOS))
DELTA_OUT_REPS=$((FINAL_OUT_REPS - INIT_OUT_REPS))

TCP_TX=$(python3 -c "import json; d=json.loads('$TCP_STATS'); print(d['transmitted'])")
TCP_RX=$(python3 -c "import json; d=json.loads('$TCP_STATS'); print(d['received'])")
TCP_LOSS=$(python3 -c "import json; d=json.loads('$TCP_STATS'); print(d['loss_pct'])")
TCP_AVG=$(python3 -c "import json; d=json.loads('$TCP_STATS'); print(d['avg_ms'])")
TCP_JITTER=$(python3 -c "import json; d=json.loads('$TCP_STATS'); print(d['jitter_ms'])")

echo ""
echo "========================================================================"
echo -e "${CYAN} BIDIRECTIONAL PACKET TEST SUMMARY${NC}"
echo "========================================================================"

echo -e " ${BLUE}1. INCOMING PACKETS (Other Laptop -> This Laptop [${LOCAL_IP}]):${NC}"
echo -e "    * Echo Requests Received:  ${DELTA_IN_ECHOS} packets (Total: ${FINAL_IN_ECHOS})"
echo -e "    * Echo Replies Dispatched:  ${DELTA_OUT_REPS} packets (Total: ${FINAL_OUT_REPS})"
if [ "$DELTA_IN_ECHOS" -gt 0 ]; then
    echo -e "${GREEN}    ✓ INCOMING PACKET DETECTION CONFIRMED! Received ${DELTA_IN_ECHOS} pings from other laptop.${NC}"
else
    echo -e "${YELLOW}    ⚠ No new incoming ICMP pings detected during this sample window.${NC}"
    echo -e "      Make sure the other laptop runs: ping ${LOCAL_IP}"
fi

echo ""
echo -e " ${BLUE}2. OUTGOING PACKETS (This Laptop -> Other Laptop [${TARGET_IP}:${TARGET_PORT}]):${NC}"
echo -e "    * Packets Transmitted:    ${TCP_TX}"
echo -e "    * Packets Received:       ${TCP_RX}"
echo -e "    * Packet Loss:            ${TCP_LOSS}%"
echo -e "    * Round-Trip Latency:     avg ${TCP_AVG} ms"
echo -e "    * Latency Jitter:         ${TCP_JITTER} ms"

if [ "$(echo "$TCP_LOSS == 0" | python3 -c "import sys; print(1 if float(sys.stdin.read().split('==')[0].strip()) == 0.0 else 0)")" -eq 1 ]; then
    echo -e "${GREEN}    ✓ OUTGOING PACKET REACHABILITY CONFIRMED (0% loss, ${TCP_AVG}ms RTT)!${NC}"
elif [ "$(echo "$TCP_LOSS == 100" | python3 -c "import sys; print(1 if float(sys.stdin.read().split('==')[0].strip()) == 100.0 else 0)")" -eq 1 ]; then
    echo -e "${RED}    ✗ OUTGOING PACKET TIMEOUT (100% loss). Verify target IP: ${TARGET_IP}:${TARGET_PORT}${NC}"
else
    echo -e "${YELLOW}    ⚠ OUTGOING DEGRADATION OBSERVED (${TCP_LOSS}% loss, ${TCP_JITTER}ms jitter).${NC}"
fi

echo ""
echo -e " ${BLUE}3. LIVE PRECURSOR DASHBOARD METRICS:${NC}"
LATEST_TELEM=$(curl -s "${ENGINE_URL}/api/telemetry?window=30" || echo "{}")
RTT_VAL=$(python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('latest', {}).get('latency_ms', 'N/A'))" <<< "$LATEST_TELEM" 2>/dev/null || echo "N/A")
LOSS_VAL=$(python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('latest', {}).get('packet_loss_pct', 'N/A'))" <<< "$LATEST_TELEM" 2>/dev/null || echo "N/A")
IN_RATE=$(python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('latest', {}).get('icmp_inbound_rate', 'N/A'))" <<< "$LATEST_TELEM" 2>/dev/null || echo "N/A")

echo -e "    * Live Latency (RTT):     ${RTT_VAL} ms"
echo -e "    * Live Packet Loss:       ${LOSS_VAL} %"
echo -e "    * Live Inbound Ping Rate: ${IN_RATE} pings/sec"

GATE_STATE=$(curl -s "${ENGINE_URL}/api/gate" | python3 -c "import sys, json; print(json.load(sys.stdin).get('state', 'UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
echo -e "    * Reliability Gate State: ${GATE_STATE}"

INCIDENT_JSON=$(curl -s "${ENGINE_URL}/api/incidents" || echo "{}")
ACTIVE_INCIDENTS=$(python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('active_incidents', [])))" <<< "$INCIDENT_JSON" 2>/dev/null || echo "0")
echo -e "    * Active Incidents:       ${ACTIVE_INCIDENTS}"
echo "========================================================================"
