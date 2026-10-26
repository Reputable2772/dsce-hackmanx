# Runbook: Post-Fault Recovery & Verification
**Tags:** recovery, restored, clearing, normal, healthy, baseline
**Target Metrics:** latency_ms, packet_loss_pct, link_state, throughput_mbps

## 1. Symptoms
- Telemetry metrics returning to nominal baseline ranges.
- Packet loss decreasing back to 0.0%.
- Link state returned to UP (`link_state = 1`).

## 2. Verification Procedure
- Verify latency has remained stably below 30ms for at least 3 consecutive sampling windows (15s).
- Verify zero packet drops or CRC errors over the recovery observation window.
- Check that active incidents transition to `RESOLVED` and alert badges clear.

## 3. Diagnostic Commands
```bash
# Verify end-to-end latency and packet loss
ping -c 10 -W 1 <target_ip>

# Confirm zero drop increments over 10 seconds
cat /proc/net/dev | grep eth0
sleep 10
cat /proc/net/dev | grep eth0
```

## 4. Post-Incident Actions
- Record total incident duration and warning lead time in the incident post-mortem log.
- Confirm Reliability Gate returns to `PREDICT` with 100% sensor health.
- Clear temporary diagnostic captures.
