# PRECURSOR — Windows Real-Time Physical Network Testing Guide

This guide provides native Windows commands (**PowerShell** and **Command Prompt**) to trigger **all 18 registered early-warning detectors and failure gates** in PRECURSOR from a secondary Windows PC on the same local network.

All tests operate on the **physical network interface layer** in real-time mode (`mode: live`).

---

## 1. Finding Your IPs & Handshake Setup

### Step 1: Find the Linux Server IP (PRECURSOR Host)
On the **Linux server**, check your active physical IP:
```bash
ip -brief address
```
*(Look for your active interface, e.g. `wlp0s20f3` on Wi-Fi or `enp0s31f6` on Ethernet, e.g., `192.168.1.100` or `172.20.10.2`).*

Throughout this guide, replace `<SERVER_IP>` with this address:
- **Dashboard Web UI**: `http://<SERVER_IP>:5173`
- **Backend REST API**: `http://<SERVER_IP>:8000`
- **Incidents Catalog**: `http://<SERVER_IP>:5173/incidents`
- **Predictions & Formulas**: `http://<SERVER_IP>:5173/predictions`
- **Live Telemetry & Packet Flow**: `http://<SERVER_IP>:5173/telemetry`
- **Network World 3D Twin**: `http://<SERVER_IP>:5173/`

---

### Step 2: Find the Windows PC IP
On your **Windows PC**, open PowerShell or Command Prompt and run:
```cmd
ipconfig
```
Look for your active adapter's **IPv4 Address** (e.g. `192.168.1.105` or `172.20.10.4`).
Replace `<WINDOWS_IP>` with this address in the steps below.

> [!NOTE]
> **Mobile Hotspot Note**: If both machines are connected to a phone's mobile hotspot, the phone may act as a NAT/proxy router. If incoming packets to the Linux server display the phone's gateway IP (`192.168.43.1` or `172.20.10.1`), set `<WINDOWS_IP>` to that gateway address.

---

### Step 3: Configure PRECURSOR to Probe Your Windows PC
PRECURSOR evaluates round-trip latency, jitter, and packet loss by actively probing a target host. Point PRECURSOR to your Windows machine using either method:

#### Method A: One-liner from Windows PowerShell
```powershell
Invoke-RestMethod -Uri "http://<SERVER_IP>:8000/api/mode" -Method Post -ContentType "application/json" -Body '{"mode":"live", "target_host":"<WINDOWS_IP>", "target_port":80}'
```

#### Method B: In the Web Dashboard
1. Open `http://<SERVER_IP>:5173/telemetry` in your browser.
2. In the **Active Linux Socket & Interface Probe Configuration** card:
   - Enter your `<WINDOWS_IP>` in **Target Host / IP**.
   - Enter `80` (or `445`) in **Target Port**.
   - Click **Save & Apply Probe Target**.

---

### Step 4: Allow Inbound ICMP on Windows Firewall
By default, Windows Firewall silently drops incoming ICMP echo requests (pings). To allow PRECURSOR's probe engine to measure round-trip latency and 0% loss:

Open **PowerShell as Administrator** on the Windows PC and run:
```powershell
netsh advfirewall firewall add rule name="Allow ICMPv4-In" protocol=icmpv4:8,any dir=in action=allow
```
*Verification: PRECURSOR's probe on `/telemetry` will report ~0.5ms – 2.0ms physical RTT and 0.0% packet loss.*

---

## 2. Complete Registry of All 18 Detectors

PRECURSOR continuously evaluates your physical link across **5-minute, 15-minute, and 30-minute horizons**. Here is the complete list of detectors registered in `precursor/detectors/registry.py`:

| # | Metric ID | Model / Detector Type | Parameter / Limit | Traffic Direction | Target Fault / Incident Title |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `icmp_inbound_rate` | Fixed SLA | `> 0.8 pkts/s` (sustained ≥ 2) | Windows ➔ Linux | `Inbound ICMP Flood Rate SLA Breach` |
| **2** | `icmp_inbound_rate` | EWMA Dynamic Band | `k_sigma = 2.5σ` (α = 0.3) | Windows ➔ Linux | `Inbound ICMP Dynamic Rate Anomaly` |
| **3** | `icmp_inbound_rate` | Immediate Fault Gate | `≥ 25.0 pkts/s` (zero-latency) | Windows ➔ Linux | `CRITICAL: Inbound ICMP Flood / Ping Storm` |
| **4** | `packet_loss_pct` | Immediate Fault Gate | `= 100.0%` (zero-latency) | Linux ➔ Windows | `CRITICAL: Immediate Link/Connectivity Failure` |
| **5** | `packet_loss_pct` | Fixed SLA | `> 5.0%` (sustained ≥ 2) | Linux ➔ Windows | `EARLY WARNING: Outbound Packet Loss Surge` |
| **6** | `packet_loss_pct` | EWMA Dynamic Band | `k_sigma = 3.0σ` (α = 0.2) | Linux ➔ Windows | `Packet Loss Dynamic Band Anomaly` |
| **7** | `packet_loss_pct` | Forecast Residual | `Factor > 2.5x` variance | Linux ➔ Windows | `Loss Trend Degradation Projection` |
| **8** | `latency_ms` | Fixed SLA | `> 50.0 ms` (sustained ≥ 2) | Linux ➔ Windows | `EARLY WARNING: Outbound SLA Latency Degradation` |
| **9** | `latency_ms` | EWMA Dynamic Band | `k_sigma = 3.0σ` (α = 0.2) | Linux ➔ Windows | `Latency Statistical Anomaly Drift` |
| **10** | `latency_ms` | Forecast Residual | `Factor > 2.5x` variance | Linux ➔ Windows | `Latency Trend Degradation Projection` |
| **11** | `jitter_ms` | Fixed SLA | `> 10.0 ms` (sustained ≥ 2) | Linux ➔ Windows | `Network Jitter SLA Breach` |
| **12** | `jitter_ms` | EWMA Dynamic Band | `k_sigma = 3.0σ` (α = 0.2) | Linux ➔ Windows | `Jitter Variance Anomaly` |
| **13** | `packets_in_sec` | EWMA Dynamic Band | `k_sigma = 3.0σ` (α = 0.3) | Windows ➔ Linux | `EARLY WARNING: Inbound Packet Surge` |
| **14** | `packets_in_sec` | Fixed SLA | `> 15,000 pkts/s` (sustained ≥ 2) | Windows ➔ Linux | `Inbound Volumetric Packet Rate Breach` |
| **15** | `packets_out_sec`| Fixed SLA | `> 15,000 pkts/s` (sustained ≥ 2) | Linux ➔ Windows | `Outbound Volumetric Packet Rate Breach` |
| **16** | `drops_in` | Fixed SLA | `> 20.0 drops` (sustained ≥ 2) | Windows ➔ Linux | `Inbound Frame Drops SLA Breach` |
| **17** | `drops_in` | EWMA Dynamic Band | `k_sigma = 3.0σ` (α = 0.3) | Windows ➔ Linux | `CRITICAL: Inbound Interface Buffer Saturation` |
| **18** | `link_state` | Immediate Fault Gate | `= 0.0` (link down) | Physical Interface | `CRITICAL: Immediate Link/Connectivity Failure` |

---

## 3. Step-by-Step Detector Testing Procedures

---

### Detector Test 1 & 2: Inbound ICMP Rate SLA & EWMA Drift
**Metrics Tested**: `icmp_inbound_rate` (Fixed SLA `> 0.8 pkts/s` & EWMA `2.5σ`)  
**Direction**: Windows ➔ Linux  
**Principle**: Standard Windows `ping -t` sends 1 Echo request per second (1.0 pkt/s). This cleanly exceeds the 0.8 pkts/s SLA threshold and departs from the resting 0.0 baseline.

#### Windows Command (CMD or PowerShell):
```cmd
ping -t <SERVER_IP>
```
*Let it run for 10–15 seconds.*

#### Dashboard Verification:
1. **Predictions Tab** (`/predictions`):
   - Card **Inbound ICMP Flood Rate** turns amber/warning.
   - Evaluated formula displayed: `Fixed SLA: 1.00 pkts/s vs limit 0.80 (sustained=True)`.
   - EWMA dynamic formula displayed: `EWMA (α=0.3): Z-score 3.12 vs 2.5σ`.
   - Click **Show 3 Packets Evaluated** to view timestamped ICMP Echo forensic samples.
2. **Incidents Tab** (`/incidents`):
   - New active incident logged: **`Inbound ICMP Flood Rate SLA Breach`**.
3. **Telemetry Tab** (`/telemetry`):
   - Inbound ICMP Rate chart tracks steady at `1.0 pkts/s`.

---

### Detector Test 3: Immediate ICMP Flood Hard Fault
**Metric Tested**: `icmp_inbound_rate` (Immediate Fault Gate `≥ 25.0 pkts/s`)  
**Direction**: Windows ➔ Linux  
**Principle**: Blasting 25+ Echo requests per second trips the zero-latency hardware gate immediately, bypassing the 5-minute smoothing window.

#### Option A: Parallel PowerShell Blast (Recommended):
```powershell
1..8 | ForEach-Object -Parallel {
    1..500 | ForEach-Object {
        Test-Connection -ComputerName "<SERVER_IP>" -Count 1 -Delay 0 -Quiet
    }
} -ThrottleLimit 8
```

#### Option B: Multi-Window CMD Ping Storm:
Open 6 Command Prompt windows simultaneously:
```cmd
start cmd /k "ping -t -l 1400 <SERVER_IP>"
start cmd /k "ping -t -l 1400 <SERVER_IP>"
start cmd /k "ping -t -l 1400 <SERVER_IP>"
start cmd /k "ping -t -l 1400 <SERVER_IP>"
start cmd /k "ping -t -l 1400 <SERVER_IP>"
start cmd /k "ping -t -l 1400 <SERVER_IP>"
```

#### Dashboard Verification:
1. **Predictions Tab**:
   - Reliability Gate trips from `PREDICT` to **`DEGRADED`** (does not drop to `ABSTAIN` as other node networks remain active).
   - Active Fault banner: `Inbound Denial-of-Service Flood (Zero-Latency Rule)`.
2. **Incidents Tab**:
   - Severity: **CRITICAL**.
   - Title: **`CRITICAL: Inbound ICMP Flood / Ping Storm on <interface>`**.
3. **Network World** (`/`):
   - Local host node pulses red; link load indicates heavy congestion.

---

### Detector Test 4: Immediate 100% Packet Loss Blackhole
**Metric Tested**: `packet_loss_pct` (Immediate Fault Gate `= 100.0%`)  
**Direction**: Linux ➔ Windows (Probe Engine)  
**Principle**: Disabling ICMP on Windows causes PRECURSOR's probes to receive zero replies, creating an instant 100% loss blackhole.

#### Windows Command (PowerShell as Administrator):
```powershell
# Disable ICMP rule to simulate a total physical drop / silent blackhole
netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=no
```
*(Or disconnect Wi-Fi / run `Disable-NetAdapter -Name "*" -Confirm:$false`)*

#### Dashboard Verification:
1. **Predictions Tab**:
   - Reliability Gate shifts to **`DEGRADED`** (does NOT drop to `ABSTAIN`, since other interfaces/networks remain operational on the node).
   - Active Fault banner: `Total Packet Loss Blackhole (Zero-Latency Rule)`.
   - Predictions continue to evaluate active interface and inbound signals with calibrated trust.
2. **Incidents Tab**:
   - Incident logged: **`CRITICAL: Immediate Link/Connectivity Failure on <interface>`**.
3. **Network World** (`/`):
   - The Windows peer node turns **Red (`critical`)**; connecting link line turns red.

#### Recovery Command:
```powershell
netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes
```

---

### Detector Test 5, 6 & 7: Partial Loss SLA, EWMA & Forecast Residual
**Metrics Tested**: `packet_loss_pct` (Fixed SLA `> 5.0%`, EWMA `3.0σ`, Forecast Residual `> 2.5x`)  
**Direction**: Linux ➔ Windows (Probe Engine)  
**Principle**: Intermittently dropping incoming probes so that the rolling loss window measures ~20% loss. This triggers Fixed SLA (5%), EWMA anomaly, and the linear trend forecast residual.

#### Windows Command (PowerShell as Administrator):
```powershell
Write-Host "Simulating 20% intermittent packet loss for 30 seconds..." -ForegroundColor Cyan
1..25 | ForEach-Object {
    if ($_ % 5 -eq 0) {
        netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=no | Out-Null
        Start-Sleep -Milliseconds 1200
        netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes | Out-Null
        Write-Host "[-] Dropped probe interval #$_" -ForegroundColor Red
    } else {
        Write-Host "[+] Nominal probe interval #$_" -ForegroundColor Green
        Start-Sleep -Milliseconds 800
    }
}
Write-Host "Test complete. Firewall restored." -ForegroundColor Green
```

#### Dashboard Verification:
1. **Telemetry Tab**:
   - Packet Loss metric rises to ~`20.0%`.
2. **Predictions Tab**:
   - **Packet Loss SLA** card shows: `Fixed SLA: 20.0% vs limit 5.0% (sustained=True)`.
   - **EWMA Loss Card** shows: `EWMA (α=0.2): Z-score 3.42 vs 3.0σ`.
   - **Forecast Residual Card** shows: `Linear Trend Residual: Factor 2.85 vs 2.5x variance`.
3. **Incidents Tab**:
   - Early warning logged: **`EARLY WARNING: High confidence Outbound Packet Loss Surge predicted in 5m`**.

---

### Detector Test 8, 9 & 10: Outbound Latency SLA, EWMA & Trend Projection
**Metrics Tested**: `latency_ms` (Fixed SLA `> 50.0 ms`, EWMA `3.0σ`, Forecast Residual `> 2.5x`)  
**Direction**: Linux ➔ Windows (Probe Engine)  
**Principle**: Flooding the wireless or LAN switch buffer with maximum MTU jumbo packets (`65,000` bytes) saturates queue buffers (bufferbloat), pushing round-trip probe latency from ~1ms up to 60–200ms.

#### Method 1: Saturated Bufferbloat Ping Flood (Command Prompt):
Run 3 Command Prompt instances in parallel:
```cmd
ping -t -l 65000 <SERVER_IP>
```

#### Method 2: Concurrency Queue Saturation (PowerShell):
Pull high-frequency telemetry batches from the PRECURSOR API to congest the interface buffer:
```powershell
1..6 | ForEach-Object -Parallel {
    while ($true) {
        Invoke-RestMethod -Uri "http://<SERVER_IP>:8000/api/telemetry/live?limit=5000" | Out-Null
    }
} -ThrottleLimit 6
```

#### Dashboard Verification:
1. **Predictions Tab**:
   - **Target RTT Latency** card turns amber/red.
   - Evaluated formula: `Fixed SLA: 78.4 ms vs limit 50.0 ms (sustained=True)`.
   - Statistical drift: `EWMA (α=0.2): Z-score 4.82 vs 3.0σ`.
   - Trend projection predicts SLA breach extending across 15m and 30m tabs.
2. **Incidents Tab**:
   - Active Incident: **`EARLY WARNING: High confidence Outbound SLA Latency Degradation predicted in 5m`**.

---

### Detector Test 11 & 12: Network Jitter SLA & EWMA Variance
**Metrics Tested**: `jitter_ms` (Fixed SLA `> 10.0 ms` & EWMA `3.0σ`)  
**Direction**: Linux ➔ Windows (Probe Engine)  
**Principle**: Alternating rapidly between tiny (32-byte) and huge (60,000-byte) packets with randomized delays causes successive probe RTT deltas (`|RTT_t - RTT_{t-1}|`) to swing violently between 1ms and 80ms, breaching the 10ms SLA.

#### Windows Command (PowerShell):
```powershell
Write-Host "Injecting rapid RTT variance to trigger Jitter SLA (> 10ms)..." -ForegroundColor Yellow
1..40 | ForEach-Object {
    $bytes = if ($_ % 2 -eq 0) { 32 } else { 60000 }
    $delay = Get-Random -Minimum 30 -Maximum 180
    Write-Host "Probe #$_: sending ${bytes}B (sleep ${delay}ms)... " -NoNewline
    $res = ping -n 1 -l $bytes <SERVER_IP> | Select-String "Reply from"
    if ($res) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "Delayed" -ForegroundColor Yellow }
    Start-Sleep -Milliseconds $delay
}
```

#### Dashboard Verification:
1. **Telemetry Tab**:
   - Jitter metric graph spikes with oscillations between 2ms and 45ms.
2. **Predictions Tab**:
   - **Network Jitter SLA** card activates: `Fixed SLA: 24.3 ms vs limit 10.0 ms (sustained=True)`.
   - **Jitter EWMA** card flags anomalous variance expansion: `Z-score 3.89 vs 3.0σ`.

---

### Detector Test 13 & 14: Inbound Packet Rate EWMA Surge (`packets_in_sec`)
**Metrics Tested**: `packets_in_sec` (EWMA Dynamic Band `3.0σ` & Fixed SLA `15,000 pkts/s`)  
**Direction**: Windows ➔ Linux  
**Principle**: On a quiet physical LAN, baseline incoming traffic is ~10–50 pkts/s. A high-rate parallel UDP burst from PowerShell pushes `packets_in_sec` on the Linux interface to 1,000–5,000+ pkts/s, instantly triggering the EWMA 3.0σ surge anomaly.

#### Windows Command (PowerShell):
```powershell
Write-Host "Generating inbound packet surge..." -ForegroundColor Cyan
1..6 | ForEach-Object -Parallel {
    $client = New-Object System.Net.Sockets.UdpClient
    $payload = [byte[]](1..1000 | ForEach-Object { 0xAA })
    1..4000 | ForEach-Object {
        $client.Send($payload, $payload.Length, "<SERVER_IP>", 9999) | Out-Null
    }
    $client.Close()
} -ThrottleLimit 6
Write-Host "Surge complete." -ForegroundColor Green
```

#### Dashboard Verification:
1. **Telemetry Tab**:
   - `packets_in_sec` chart spikes dramatically.
2. **Predictions Tab**:
   - **Inbound Packet Flow** card turns amber: `EWMA (α=0.3): Z-score 5.12 vs 3.0σ`.
3. **Incidents Tab**:
   - Logged event: **`EARLY WARNING: High confidence Inbound Packet Surge / Ping Flood predicted in 5m`**.

---

### Detector Test 15: Outbound Packet Rate SLA (`packets_out_sec`)
**Metric Tested**: `packets_out_sec` (Fixed SLA `> 15,000 pkts/s`)  
**Direction**: Linux ➔ Windows  
**Principle**: Pulling high-speed bulk data streams from the server forces Linux kernel packet transmission to peak.

#### Windows Command (PowerShell):
```powershell
1..10 | ForEach-Object -Parallel {
    while ($true) {
        Invoke-RestMethod -Uri "http://<SERVER_IP>:8000/api/telemetry/archive" | Out-Null
    }
} -ThrottleLimit 10
```

---

### Detector Test 16 & 17: Inbound Frame Drops & Buffer Saturation (`drops_in`)
**Metrics Tested**: `drops_in` (Fixed SLA `> 20 drops` & EWMA `3.0σ`)  
**Direction**: Windows ➔ Linux  
**Principle**: Firing rapid UDP datagrams to an unhandled UDP port on the Linux host overruns the kernel's socket receive queues and network driver ring buffers, incrementing `rx_drops` in `/proc/net/dev`.

#### Windows Command (PowerShell):
```powershell
Write-Host "Saturating socket queues to induce physical frame drops..." -ForegroundColor Red
1..8 | ForEach-Object -Parallel {
    $client = New-Object System.Net.Sockets.UdpClient
    $payload = [byte[]](1..1472 | ForEach-Object { 0xFF })
    1..6000 | ForEach-Object {
        $client.Send($payload, $payload.Length, "<SERVER_IP>", 8000) | Out-Null
    }
    $client.Close()
} -ThrottleLimit 8
```

#### Dashboard Verification:
1. **Telemetry Tab**:
   - Interface `drops_in` counter increments above 20.
2. **Predictions Tab**:
   - **Inbound Frame Drops** card turns red: `Fixed SLA: X drops vs limit 20.0 (sustained=True)`.
3. **Incidents Tab**:
   - Incident logged: **`CRITICAL: Inbound Interface Buffer Saturation / Frame Drops on <interface>`**.

---

### Detector Test 18: Physical Link State Cut (`link_state = 0.0`)
**Metric Tested**: `link_state` (Immediate Fault Gate `= 0.0`)  
**Scope**: Physical Interface Layer  
**Principle**: Immediate zero-latency detection of physical link loss (cable unplugged or interface down).

#### Option A: Ethernet Setup (Triggered from Windows):
If connected via an Ethernet switch or direct patch cable:
```powershell
# Disabling the Windows Ethernet adapter cuts physical carrier on the Linux port
Disable-NetAdapter -Name "Ethernet*" -Confirm:$false
```
*To restore: `Enable-NetAdapter -Name "Ethernet*" -Confirm:$false`*

#### Option B: Server CLI Verification:
On the Linux server, bring down the physical link:
```bash
sudo ip link set dev <interface> down
```
*To restore: `sudo ip link set dev <interface> up`*

#### Dashboard Verification:
1. **Predictions Tab**:
   - Reliability Gate immediately shifts to **`ABSTAIN`**.
   - Active Fault: `Immediate Link State Hardware Failure`.
2. **Incidents Tab**:
   - Incident logged: **`CRITICAL: Immediate Link/Connectivity Failure on <interface>`**.

---

## 4. All-In-One Interactive Windows Test Script (`Test-Precursor.ps1`)

Save the following script as `Test-Precursor.ps1` on your Windows PC. It provides an automated, interactive menu to configure PRECURSOR and trigger any detector on demand:

```powershell
# ==============================================================================
# PRECURSOR Interactive Physical Detector Test Suite (Windows)
# ==============================================================================

param(
    [string]$ServerIP = "",
    [string]$WindowsIP = ""
)

if (-not $ServerIP) {
    $ServerIP = Read-Host "Enter Linux PRECURSOR Server IP (e.g. 192.168.1.100)"
}
if (-not $WindowsIP) {
    # Auto-detect primary IPv4
    $detected = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
    $WindowsIP = Read-Host "Enter Windows PC IP [$detected]"
    if (-not $WindowsIP) { $WindowsIP = $detected }
}

function Show-Menu {
    Clear-Host
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "   PRECURSOR — Real-Time Physical Detector Test Suite       " -ForegroundColor Yellow
    Write-Host "   Server: http://$ServerIP`:5173  |  Target Host: $WindowsIP" -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " [0] Configure PRECURSOR Target Host to this Windows PC"
    Write-Host " [1] Enable Windows Firewall ICMP Rule (Prerequisite)"
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " [2] Inbound ICMP Rate SLA Breach (> 0.8 pkts/s continuous ping)" -ForegroundColor Green
    Write-Host " [3] Immediate ICMP Flood Gate (>= 25 pkts/s burst)" -ForegroundColor Red
    Write-Host " [4] Total Blackhole 100% Packet Loss (Disable ICMP rule)" -ForegroundColor Red
    Write-Host " [5] Partial Packet Loss SLA Breach (20% intermittent drop)" -ForegroundColor Yellow
    Write-Host " [6] Excessive Latency SLA & Bufferbloat (> 50ms RTT)" -ForegroundColor Yellow
    Write-Host " [7] Network Jitter & Variance Degradation (> 10ms jitter)" -ForegroundColor Yellow
    Write-Host " [8] Inbound Packet Rate EWMA Surge (High-speed UDP)" -ForegroundColor Cyan
    Write-Host " [9] Inbound Buffer Drops / Socket Queue Saturation" -ForegroundColor Magenta
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " [R] Restore Clean Baseline (Re-enable ICMP, clear errors)" -ForegroundColor Green
    Write-Host " [Q] Quit"
    Write-Host "============================================================" -ForegroundColor Cyan
}

do {
    Show-Menu
    $choice = Read-Host "Select an option [0-9, R, Q]"
    switch ($choice) {
        "0" {
            Write-Host "Configuring PRECURSOR probe target..." -ForegroundColor Cyan
            try {
                $body = @{ mode = "live"; target_host = $WindowsIP; target_port = 80 } | ConvertTo-Json
                $resp = Invoke-RestMethod -Uri "http://$ServerIP`:8000/api/mode" -Method Post -ContentType "application/json" -Body $body
                Write-Host "Success! Mode: $($resp.mode), Target Host: $($resp.target_host)" -ForegroundColor Green
            } catch {
                Write-Host "Failed to connect to PRECURSOR API at $ServerIP`:8000: $_" -ForegroundColor Red
            }
            Pause
        }
        "1" {
            Write-Host "Adding Windows Firewall ICMP allow rule..." -ForegroundColor Cyan
            netsh advfirewall firewall add rule name="Allow ICMPv4-In" protocol=icmpv4:8,any dir=in action=allow
            Pause
        }
        "2" {
            Write-Host "Running continuous ping to trip ICMP Rate SLA (> 0.8 pkts/s)..." -ForegroundColor Green
            Write-Host "Press Ctrl+C to stop." -ForegroundColor White
            ping -t $ServerIP
        }
        "3" {
            Write-Host "Blasting high-speed ICMP to trip Immediate Fault (>= 25 pkts/s)..." -ForegroundColor Red
            1..8 | ForEach-Object -Parallel {
                1..400 | ForEach-Object {
                    Test-Connection -ComputerName $using:ServerIP -Count 1 -Delay 0 -Quiet
                }
            } -ThrottleLimit 8
            Write-Host "Burst finished." -ForegroundColor Green
            Pause
        }
        "4" {
            Write-Host "Disabling ICMP rule to simulate 100% loss blackhole..." -ForegroundColor Red
            netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=no
            Write-Host "Firewall now blocking ICMP. Check Dashboard for immediate fault." -ForegroundColor Yellow
            Read-Host "Press Enter to restore ICMP rule..."
            netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes
            Write-Host "ICMP restored." -ForegroundColor Green
            Pause
        }
        "5" {
            Write-Host "Simulating 20% intermittent packet loss for 30s..." -ForegroundColor Yellow
            1..20 | ForEach-Object {
                if ($_ % 5 -eq 0) {
                    netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=no | Out-Null
                    Start-Sleep -Milliseconds 1200
                    netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes | Out-Null
                    Write-Host "[-] Dropped probe #$_" -ForegroundColor Red
                } else {
                    Write-Host "[+] Nominal probe #$_" -ForegroundColor Green
                    Start-Sleep -Milliseconds 800
                }
            }
            netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes | Out-Null
            Write-Host "Simulation complete." -ForegroundColor Green
            Pause
        }
        "6" {
            Write-Host "Saturating link buffers with 65,000-byte pings to trip Latency SLA (> 50ms)..." -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to stop." -ForegroundColor White
            ping -t -l 65000 $ServerIP
        }
        "7" {
            Write-Host "Injecting rapid RTT variance to trip Jitter SLA (> 10ms)..." -ForegroundColor Yellow
            1..30 | ForEach-Object {
                $bytes = if ($_ % 2 -eq 0) { 32 } else { 60000 }
                $delay = Get-Random -Minimum 30 -Maximum 180
                Write-Host "Probe #$_: ${bytes}B (sleep ${delay}ms)... " -NoNewline
                $res = ping -n 1 -l $bytes $ServerIP | Select-String "Reply from"
                if ($res) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "Slow" -ForegroundColor Yellow }
                Start-Sleep -Milliseconds $delay
            }
            Write-Host "Jitter injection complete." -ForegroundColor Green
            Pause
        }
        "8" {
            Write-Host "Blasting high-speed UDP to trip Inbound Packet Surge EWMA..." -ForegroundColor Cyan
            1..6 | ForEach-Object -Parallel {
                $client = New-Object System.Net.Sockets.UdpClient
                $payload = [byte[]](1..1000 | ForEach-Object { 0xAA })
                1..3000 | ForEach-Object {
                    $client.Send($payload, $payload.Length, $using:ServerIP, 9999) | Out-Null
                }
                $client.Close()
            } -ThrottleLimit 6
            Write-Host "Surge complete." -ForegroundColor Green
            Pause
        }
        "9" {
            Write-Host "Sending UDP storm to unhandled port to induce Frame Drops..." -ForegroundColor Magenta
            1..8 | ForEach-Object -Parallel {
                $client = New-Object System.Net.Sockets.UdpClient
                $payload = [byte[]](1..1472 | ForEach-Object { 0xFF })
                1..5000 | ForEach-Object {
                    $client.Send($payload, $payload.Length, $using:ServerIP, 8000) | Out-Null
                }
                $client.Close()
            } -ThrottleLimit 8
            Write-Host "Drop storm complete." -ForegroundColor Green
            Pause
        }
        "R" {
            Write-Host "Restoring clean baseline..." -ForegroundColor Green
            netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes | Out-Null
            Write-Host "ICMP rule enabled. Link state normal." -ForegroundColor Green
            Pause
        }
    }
} while ($choice -ne "Q" -and $choice -ne "q")
```

---

## 5. Clean Baseline Restoration Checklist

After completing your test runs, return the test environment to nominal baseline:

1. **Re-enable Windows Firewall ICMP Rule**:
   ```powershell
   netsh advfirewall firewall set rule name="Allow ICMPv4-In" new enable=yes
   ```
2. **Terminate Background Command Windows**:
   Close any running `ping -t` Command Prompt windows.
3. **Verify Dashboard Health**:
   - Navigate to `http://<SERVER_IP>:5173/` (Network World).
   - Ensure nodes indicate **Nominal (`healthy`)**.
   - Navigate to `http://<SERVER_IP>:5173/predictions`.
   - Ensure the Reliability Gate displays **`PREDICT`** with zero active immediate hardware faults.
