# PRECURSOR — Windows Real-Time Physical Network Testing Guide

This guide provides the exact native Windows commands (**Command Prompt** and **PowerShell**) to execute live physical network tests against the PRECURSOR server (`172.25.80.31`).

> [!NOTE]
> All tests below operate on the **physical network layer** in real-time mode (`mode: live`). No synthetic software scenarios are used.

---

## Network Endpoints

- **PRECURSOR Server IP (Linux Host)**: `172.25.80.31`
- **Dashboard Web UI**: `http://172.25.80.31:5173`
- **Backend REST API**: `http://172.25.80.31:8000`

---

## Prerequisite: Allow Inbound ICMP on Windows

By default, Windows Firewall silently drops incoming ICMP Echo Requests from other network hosts. To allow PRECURSOR's active probe to measure true physical round-trip latency and 0% loss:

Open **PowerShell as Administrator** on the Windows machine and run:
```powershell
netsh advfirewall firewall add rule name="Allow ICMPv4-In" protocol=icmpv4:8,any dir=in action=allow
```

*Verification: PRECURSOR immediately receives ICMP echo replies, measuring physical RTT (`~0.5ms - 1.5ms`) and 0% packet loss.*

---

## Test 1: Normal Pings Don't Hit an Alert (Nominal Baseline)

**Objective**: Verify that healthy, nominal network traffic does **not** trigger false alarms, audible chimes, or top banner alerts.

### Command (Command Prompt or PowerShell):
```cmd
ping -n 10 172.25.80.31
```

### Expected Behavior on Dashboard (`http://172.25.80.31:5173`):
- **Live Latency**: `~0.5ms - 1.5ms` (well below the 50ms SLA threshold).
- **Packet Loss**: `0.0%`.
- **Reliability Gate**: Stays in **`PREDICT`** (Green).
- **Alert Status**: **No alarm sound, no desktop notification, and no Breach Alert Banner**.
- **Topology**: The Windows machine is displayed as an active connected peer.

---

## Test 2: "Too Much Pings" (Physical NIC Flood & Packet Surge)

**Objective**: Surge the physical network interface with high-frequency packet flow and observe real-time packet rate spikes and queue growth on the new **Packet Flow (pkts/s)** graph.

> [!TIP]
> **Why 65,000-byte frames time out after the first burst:**
> A 65,000-byte payload exceeds standard Ethernet MTU (1500 bytes) and is fragmented by Windows into **44 separate IP fragments** per ping. Under sustained flood, fragment reassembly buffers saturate, causing Windows `ping` to print `Request timed out.`
> For clean, continuous, wire-speed packet floods without fragmentation timeouts, use **`-l 1400`** (which fits cleanly into MTU 1500).

### Recommended Continuous Wire-Speed Flood (Command Prompt):
Sends continuous 1400-byte frames with zero fragmentation timeouts:
```cmd
ping -t -l 1400 172.25.80.31
```
*(Press `Ctrl + C` to stop).*

### Maximum Fragment Burst (Command Prompt):
Sends maximum-payload 65,000-byte fragmented bursts (test reassembly buffer saturation):
```cmd
ping -n 5 -l 65000 172.25.80.31
```

### Multi-Stream High-Rate Flood (Launch 4 simultaneous streams):
In Windows Command Prompt:
```cmd
start cmd /k "ping -t -l 1400 172.25.80.31"
start cmd /k "ping -t -l 1400 172.25.80.31"
start cmd /k "ping -t -l 1400 172.25.80.31"
start cmd /k "ping -t -l 1400 172.25.80.31"
```

### Expected Behavior on Dashboard (`http://172.25.80.31:5173/telemetry`):
- Switch to the **Packet Flow (pkts/s)** tab on the Telemetry page:
  - **Inbound Packets (RX)** curve instantly surges above nominal baseline.
  - Live packet arrival rate is visible with emerald/cyan gradient in real time.
- Node List displays **Inbound Ping / Spam Source** badge with live packet counters.
- When packet flood exceeds buffer capacity, `drops_in` increments and queue alerts trigger.

---

## Test 3: "No Pings at All" (Physical Packet Loss / Blackhole Simulation)

**Objective**: Simulate an abrupt physical link drop or firewall blackhole to verify immediate breach alerting.

### 1. Trigger the Outage:
In **Administrator PowerShell** on Windows, disable the ICMP reply rule:
```powershell
netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=no
```
*(Alternative: Temporarily disable the network adapter: `Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false`)*

### Expected Behavior on Dashboard:
- Live probes from PRECURSOR to `172.25.80.33` immediately time out.
- Real-time packet loss climbs to **100%**.
- Reliability Gate trips from `PREDICT` to **`DEGRADED`** or **`ABSTAIN`**.
- **Audible breach alarm sounds**, OS desktop notification triggers, and the top red/amber **Breach Alert Banner** expands with diagnostic commands and Copilot runbooks.

### 2. Restore Normal State:
In **Administrator PowerShell** on Windows, restore ICMP and network connectivity:
```powershell
netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes
Enable-NetAdapter -Name "*" -Confirm:$false
```
*(Probes succeed again, loss returns to 0%, and the alert banner disappears silently without playing false recovery alarms).*

---

## Test 4: Real-Time Jitter & Variable Latency

**Objective**: Generate variable queuing delays and jitter across the physical LAN with live terminal feedback.

### Command (PowerShell):
Alternates randomized payload buffers (64 bytes to 1400 bytes) and randomized sleep intervals (10ms to 200ms) with live colored feedback:
```powershell
1..100 | ForEach-Object {
    $bytes = (Get-Random -Minimum 64 -Maximum 1400)
    $delay = (Get-Random -Minimum 10 -Maximum 200)
    Write-Host "Ping #$_ ($bytes bytes, delay ${delay}ms)... " -NoNewline
    $res = ping -n 1 -l $bytes 172.25.80.31 | Select-String "Reply from"
    if ($res) { Write-Host "OK ($res)" -ForegroundColor Green } else { Write-Host "Timeout" -ForegroundColor Yellow }
    Start-Sleep -Milliseconds $delay
}
```

### Expected Behavior on Dashboard:
- Successive RTT differences produce **real jitter fluctuations** on the telemetry chart.
- When jitter variance destabilizes EWMA confidence bands, PRECURSOR flags distribution drift and alerts the operator.

---

## Summary Checklist

| Test | Windows Action | Expected Dashboard State | Alert Fired? |
| :--- | :--- | :--- | :--- |
| **1. Baseline** | `ping -n 10 172.25.80.31` | Latency < 2ms, Loss 0% (`PREDICT`) | **No (Suppressed)** |
| **2. High Flood** | `ping -t -l 65000 172.25.80.31` | Throughput & InEchos spike, `drops_in` grows | **Warning / Queue Growth** |
| **3. Packet Silence** | Block ICMP in Windows Firewall | Packet Loss 100% (`DEGRADED`/`ABSTAIN`) | **Yes (Audio + Banner + OS)** |
| **4. Real Jitter** | PowerShell randomized loop | Jitter jumps > 15ms, EWMA drift | **Warning / Drift** |
