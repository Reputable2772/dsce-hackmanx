# Runbook: Elevated Latency and Jitter Degradation
**Tags:** latency_ms, jitter_ms, rtt, lag, delay, bufferbloat, queue
**Target Metrics:** latency_ms, jitter_ms

## 1. Symptoms
- Round-trip time (RTT) climbing above nominal SLA (e.g. > 80ms).
- Jitter variance expanding beyond baseline thresholds.
- Increased TCP acknowledgment delays and slow HTTP transfer times.

## 2. Possible Causes (Hypotheses)
- Bufferbloat: excessive packet queuing in intermediate routers or egress interface FIFO buffers.
- Sub-optimal BGP routing path or asymmetric routing shift to a higher-latency transit path.
- Local CPU starvation on software routing / packet filtering nodes causing processing delays.
- Wi-Fi / wireless link interference or radio retransmissions.

## 3. Diagnostic Commands
```bash
# Measure per-hop RTT and locate latency inflection point
mtr -n -c 10 --report-wide 1.1.1.1 || traceroute -n 1.1.1.1

# Check queue discipline status and buffer backpressure
tc -s qdisc show dev eth0

# Check socket buffer exhaustion and TCP retransmits
ss -s
cat /proc/net/netstat | grep -E "TCPDelay|TCPAck"
```

## 4. Remediation Options
- Apply Active Queue Management (fq_codel or CAKE) to mitigate bufferbloat: `sudo tc qdisc replace dev eth0 root fq_codel`.
- If routing path shifted, trigger routing convergence or adjust local route metrics.
- Prioritize real-time traffic using DSCP / traffic shaping rules.

## 5. Verification Steps
- Continuously monitor RTT over 30 seconds: `ping -c 10 -i 0.5 <target>`.
- Confirm `latency_ms` stabilizes back under 30ms and `jitter_ms` under 3.0ms.

## 6. Risks & Rollback
- Risk: Changing `tc` queuing disciplines can temporarily drop inflight packets.
- Rollback: Revert to default pfifo_fast discipline: `sudo tc qdisc replace dev eth0 root pfifo_fast`.
