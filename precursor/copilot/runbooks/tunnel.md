# Runbook: Tunnel Failures (WireGuard / IPsec / GRE / TUN)
**Tags:** tunnel, tun0, wg0, ipsec, gre, vpn, encapsulation
**Target Metrics:** link_state, packet_loss_pct, latency_ms

## 1. Symptoms
- Tunnel interface operational status down (`is_up = False`).
- Encapsulated packets dropped or failing handshake.
- MTU blackholing on large TCP payloads.

## 2. Possible Causes (Hypotheses)
- WireGuard or IPsec keepalive timeout due to NAT table expiration.
- Tunnel endpoint IP address changed or DNS lookup failure.
- Pre-shared key or cryptographic association expired / re-key failure.
- MTU clamping issue causing Path MTU Discovery failure.

## 3. Diagnostic Commands
```bash
# Check status of tunnel devices
ip link show type wireguard || ip link show type gre || ip link show dev tun0

# Inspect wireguard peer handshake status
sudo wg show 2>/dev/null || echo "WireGuard CLI not found or unprivileged"

# Verify tunnel endpoint ping reachability
ping -c 3 <tunnel_endpoint_ip>
```

## 4. Remediation Options
- Re-initiate tunnel handshake / restart tunnel interface: `sudo systemctl restart wg-quick@wg0`.
- Clamp MSS to avoid PMTU drops: `sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu`.

## 5. Verification Steps
- Verify recent handshake timestamp (< 120s ago).
- Send ICMP echo probe across the tunnel internal IP.

## 6. Risks & Rollback
- Risk: Tunnel restart drops existing overlay connections.
- Rollback: Re-enable the previous tunnel service configuration.
