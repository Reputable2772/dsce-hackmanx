# Runbook: Routing Anomaly & BGP Flaps
**Tags:** routing, bgp, route_flap, blackhole, gateway, unreachable
**Target Metrics:** packet_loss_pct, latency_ms

## 1. Symptoms
- Sudden intermittent packet drops every few minutes.
- Latency jumping abruptly as routes oscillate between primary and secondary paths.
- "Network unreachable" or "Destination Host Unreachable" ICMP errors.

## 2. Possible Causes (Hypotheses)
- BGP session flapping due to keepalive timeout or MTU mismatch.
- Upstream transit route oscillation (route flap damping).
- Default gateway MAC address flapping in ARP/ND tables (IP collision or VRRP flap).

## 3. Diagnostic Commands
```bash
# Check current kernel routing table
ip route show

# Verify next-hop reachability and ARP entry
ip neigh show | grep -E "REACHABLE|STALE|FAILED"

# Trace route path changes
traceroute -n 8.8.8.8
```

## 4. Remediation Options
- Refresh ARP/neighbor cache: `sudo ip neigh flush dev eth0`.
- Fix default route if pointed to invalid next hop: `sudo ip route replace default via <correct_gw> dev eth0`.
- Check MTU along the path to avoid fragmentation drops: `ping -c 2 -M do -s 1472 <gateway>`.

## 5. Verification Steps
- Confirm routing table is stable with single preferred next hop.
- Send continuous ping to verify 0% packet loss over 60 seconds.

## 6. Risks & Rollback
- Risk: Route table edits can isolate the server if next-hop IP is wrong.
- Rollback: Re-apply known static default route.
