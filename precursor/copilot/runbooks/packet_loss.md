# Runbook: Packet Loss & Interface Drops
**Tags:** packet_loss_pct, drops_in, rx_drops, tx_drops, dropped, discards
**Target Metrics:** packet_loss_pct, drops_in

## 1. Symptoms
- Elevated packet loss percentage (> 5%).
- Increments in `/proc/net/dev` RX/TX drop counters.
- Retransmission storm on active TCP sockets.

## 2. Possible Causes (Hypotheses)
- NIC ring buffer overrun during sudden traffic bursts.
- Kernel network stack memory exhaustion (netdev_max_backlog or socket rmem).
- Bad ethernet cabling or physical layer bit errors (CRC errors).
- Upstream police/shaping rate exceeded.

## 3. Diagnostic Commands
```bash
# Check detailed interface packet drop and error counters
ip -s link show dev eth0

# Check ethtool ring buffer size and RX/TX drops
ethtool -S eth0 2>/dev/null | grep -E "drop|discard|err" | head -n 20

# Check kernel network backlog drops
cat /proc/net/softnet_stat
```

## 4. Remediation Options
- Increase NIC hardware ring buffer size: `sudo ethtool -G eth0 rx 4096 tx 4096`.
- Increase kernel receive backlog: `sudo sysctl -w net.core.netdev_max_backlog=5000`.
- Increase TCP memory buffers: `sudo sysctl -w net.core.rmem_max=16777216`.

## 5. Verification Steps
- Verify loss rate drops to 0%: `ping -c 20 -f <target_ip>`.
- Monitor drop counters for 60 seconds to ensure no further increments.

## 6. Risks & Rollback
- Risk: Excessive memory allocations for buffers reduce available system RAM.
- Rollback: Restore default sysctl settings: `sudo sysctl -w net.core.netdev_max_backlog=1000`.
