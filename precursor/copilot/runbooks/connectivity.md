# Runbook: Network Connectivity & Link Failures
**Tags:** connectivity, link_state, interface, link_down, carrier, offline
**Target Metrics:** link_state, packet_loss_pct

## 1. Symptoms
- Complete loss of packet flow or link_state = 0 (DOWN).
- Immediate packet drop rate reaching 100%.
- Interface carrier signal lost.

## 2. Possible Causes (Hypotheses)
- Physical cable disconnect, optical transceiver fault, or SFP failure.
- Remote switchport disabled (administrative down) or port security violation.
- Linux network driver crash or PCIe bus error.
- vSwitch / TUN / TAP device deletion or virtualization bridge failure.

## 3. Diagnostic Commands
```bash
# Check interface operational state and link carrier
ip -s link show dev eth0

# Inspect kernel dmesg for link flaps or NIC errors
dmesg -T | grep -E "eth0|link|carrier|NIC" | tail -n 25

# Query ethtool for PHY / duplex status
ethtool eth0 2>/dev/null || echo "ethtool not available or virtual interface"

# Verify default route and ARP table
ip route show
ip neigh show
```

## 4. Remediation Options
- Re-enable the interface administratively: `sudo ip link set dev eth0 up`.
- Flap the interface if link auto-negotiation hung: `sudo ip link set dev eth0 down && sleep 2 && sudo ip link set dev eth0 up`.
- Switch traffic to secondary bonded/backup interface if configured.

## 5. Verification Steps
- Verify carrier state returns to UP: `cat /sys/class/net/eth0/carrier` (should output 1).
- Send 5 ICMP echo probes to default gateway: `ping -c 5 -W 2 <gateway_ip>`.
- Confirm `packet_loss_pct` falls to 0.0%.

## 6. Risks & Rollback
- Risk: Toggling interfaces may drop active TCP sessions or disrupt bonded pairs.
- Rollback: Re-enable previous interface state immediately: `sudo ip link set dev eth0 up`.
