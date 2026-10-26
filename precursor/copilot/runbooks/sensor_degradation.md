# Runbook: Telemetry Sensor Degradation & Gate Abstention
**Tags:** sensor, stale, missing, invalid, quality, gate, abstain
**Target Metrics:** quality, missing_ratio, invalid_ratio

## 1. Symptoms
- Reliability Gate transitioned to `ABSTAIN` or `DEGRADED`.
- High fraction of missing, stale, or outlier telemetry points.
- Observations arriving with delayed or irregular timestamps.

## 2. Possible Causes (Hypotheses)
- Telemetry collector agent process starved of CPU or crashed.
- Local system clock drift or NTP synchronization loss.
- High socket buffer drop on the telemetry collection pipe.
- Transient kernel resource exhaustion preventing `/proc` reads.

## 3. Diagnostic Commands
```bash
# Check telemetry collector process CPU and memory
ps aux | grep -E "collector|precursor"

# Check system time synchronization and NTP state
timedatectl status 2>/dev/null || chronyc tracking 2>/dev/null || ntpq -p 2>/dev/null

# Inspect system load averages and I/O wait
uptime
vmstat 1 5
```

## 4. Remediation Options
- Restart the local telemetry collector daemon.
- Force immediate NTP clock synchronization: `sudo systemctl restart systemd-timesyncd`.
- Verify collector socket permissions and ring buffer sizing.

## 5. Verification Steps
- Observe `good_ratio` returning above 0.95 in telemetry buffer quality stats.
- Confirm Reliability Gate transitions from `ABSTAIN` back to `PREDICT`.

## 6. Risks & Rollback
- Risk: None. Collector restarts do not affect data-plane forwarding.
