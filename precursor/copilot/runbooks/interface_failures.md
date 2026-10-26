# Runbook: Interface Hardware Errors & Flapping
**Tags:** errors_in, interface, crc, frame_error, hardware, phy
**Target Metrics:** errors_in, drops_in, link_state

## 1. Symptoms
- Rising error counts in `/proc/net/dev` (`errors_in`, `errors_out`).
- Cyclic link up/down transitions (flapping).
- Frame or CRC check failures in NIC statistics.

## 2. Possible Causes (Hypotheses)
- Damaged copper patch cord or bent fiber optic cable.
- Dirty optical connector or failing transceiver laser.
- Duplex mismatch (half-duplex vs full-duplex auto-negotiation failure).
- Electrical noise / EMI on the cable run.

## 3. Diagnostic Commands
```bash
# Check detailed error counters in ethtool
ethtool -S eth0 | grep -E "crc|error|frame|align|fifo"

# Check speed and duplex settings
ethtool eth0 | grep -E "Speed|Duplex|Auto-negotiation"

# Check link flap log messages
journalctl -k -b | grep -E "eth0.*(carrier|link|down|up)" | tail -n 20
```

## 4. Remediation Options
- Force auto-negotiation reload: `sudo ethtool -r eth0`.
- Explicitly lock speed and duplex if auto-negotiation fails: `sudo ethtool -s eth0 speed 1000 duplex full autoneg off`.
- Replace the physical patch cable.

## 5. Verification Steps
- Verify zero new CRC/frame errors over 5 minutes.
- Confirm link state remains stable without flaps.

## 6. Risks & Rollback
- Risk: Manual speed/duplex override on one side of a link can cause immediate duplex mismatch.
- Rollback: Re-enable auto-negotiation: `sudo ethtool -s eth0 autoneg on`.
