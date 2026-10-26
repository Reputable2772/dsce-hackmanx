# Runbook: Traffic Congestion and Bandwidth Saturation
**Tags:** throughput_mbps, bandwidth, saturation, surge, congestion, rate_limit
**Target Metrics:** throughput_mbps, latency_ms

## 1. Symptoms
- Throughput spiking near physical link capacity.
- Accompanying rise in latency and interface drops.
- TCP window throttling observed.

## 2. Possible Causes (Hypotheses)
- Uncontrolled backup job, file replication, or large database dump.
- Distributed denial of service (DDoS) or rogue data exfiltration.
- Misconfigured application traffic generator.

## 3. Diagnostic Commands
```bash
# Monitor top bandwidth consuming sockets
ss -t -i

# Inspect iptables / nftables traffic statistics
sudo iptables -nvL -t filter 2>/dev/null || echo "Run as root for iptables"

# Check top network-heavy processes
pidstat -d 1 5 2>/dev/null || top -b -n 1 | head -n 20
```

## 4. Remediation Options
- Rate limit heavy non-essential flows via `tc` or firewall rules.
- Enable ECN (Explicit Congestion Notification): `sudo sysctl -w net.ipv4.tcp_ecn=1`.
- Reschedule large transfers to off-peak hours.

## 5. Verification Steps
- Confirm `throughput_mbps` stabilizes within safe operating margins (< 80% capacity).
- Verify latency recovers to baseline values.

## 6. Risks & Rollback
- Risk: Rate limiting may degrade throughput of legitimate applications.
- Rollback: Flush traffic control rate limits: `sudo tc qdisc del dev eth0 root`.
