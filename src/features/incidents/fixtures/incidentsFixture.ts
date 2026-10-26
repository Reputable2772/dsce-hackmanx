import { IncidentRecord } from '../types';

export const DETERMINISTIC_INCIDENTS: IncidentRecord[] = [
  {
    id: 'INC-2026-0842',
    title: 'Spine-01 Buffer Saturation & Tail-Drop Queue Contention',
    summary: 'Ingress microburst triggered FIFO buffer saturation on spine-01 fabric switch. P95 latency degraded from 19.4ms to 48.6ms (+150%), with tail packet drops reaching 2.15% across leaf-01 uplinks.',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    category: 'CONGESTION',
    affectedNodes: ['spine-01', 'leaf-01'],
    affectedLinks: ['spine-01-leaf-01'],
    primaryMetrics: ['rtt_ms', 'packet_loss_pct', 'interface_errors'],
    detectionSource: 'EWMA Adaptive',
    firstObserved: '14:02:15 UTC',
    lastObserved: '14:04:45 UTC',
    isActiveFault: true,
    predictedHorizonMinutes: 5,
    evidence: [
      {
        metric: 'Round-Trip Latency (rtt_ms)',
        observedValue: '48.6 ms',
        baseline: '19.4 ms',
        delta: '+29.2 ms (+150.5%)',
        timestamp: '14:04:45 UTC'
      },
      {
        metric: 'Packet Loss Ratio (packet_loss_pct)',
        observedValue: '2.15 %',
        baseline: '0.02 %',
        delta: '+2.13 % (Breached 2.0% SLA)',
        timestamp: '14:04:40 UTC'
      },
      {
        metric: 'Tail Drop Rate (interface_errors)',
        observedValue: '12 pkts/s',
        baseline: '0 pkts/s',
        delta: '+12 pkts/s (Queue Saturation)',
        timestamp: '14:04:45 UTC'
      }
    ],
    timeline: [
      { id: 'tl-1', time: '14:02:15', event: 'EWMA detector triggered anomaly alert on spine-01 (residual > 3.0 sigma).', type: 'detection' },
      { id: 'tl-2', time: '14:02:45', event: 'Latency exceeded contractual warning threshold (35.0ms) on spine-01 -> leaf-01.', type: 'metric_breach' },
      { id: 'tl-3', time: '14:03:12', event: 'Immediate fault rule triggered: Carrier state flap detected on FortyGigE0/1.', type: 'metric_breach' },
      { id: 'tl-4', time: '14:03:30', event: 'Packet loss crossed critical threshold (2.0%). Tail-drop queue depth 100%.', type: 'metric_breach' },
      { id: 'tl-5', time: '14:04:00', event: 'Operator investigation initiated. Copilot root-cause runbook matching active.', type: 'operator_note' }
    ],
    currentFaults: [
      {
        id: 'flt-01',
        rule: 'IMMEDIATE_LINK_STATE_FLAP',
        interfaceId: 'FortyGigE0/1',
        value: '3 state changes / 60s'
      },
      {
        id: 'flt-02',
        rule: 'IMMEDIATE_DROP_EXCEEDANCE',
        interfaceId: 'TenGigE0/48',
        value: '14 pkts/s drop rate'
      }
    ],
    futurePredictions: [
      {
        id: 'pred-5m-01',
        horizon: 5,
        impact: 'SLA Breach: P95 Latency projected to maintain > 45ms across aggregation tier.',
        score: 0.84
      },
      {
        id: 'pred-15m-01',
        horizon: 15,
        impact: 'Sustained packet loss > 1.5% leading to TCP window collapse on compute nodes.',
        score: 0.91
      }
    ],
    hypotheses: [
      {
        id: 'hyp-1',
        title: 'Asymmetric Microburst Ingress via Data Analytics Ingestion',
        likelihood: 'High',
        rationale: 'Telemetry indicates sudden step-function load increase (+440 Mbps) originating from analytics leaf interface without corresponding ECMP balance.',
        isHypothesis: true
      },
      {
        id: 'hyp-2',
        title: 'QoS Queue Starvation / CoS Misconfiguration',
        likelihood: 'Moderate',
        rationale: 'Egress buffer allocation profile may have defaulted to best-effort queue on spine-01 transceiver.',
        isHypothesis: true
      },
      {
        id: 'hyp-3',
        title: 'Physical Transceiver Optic Thermal Degradation',
        likelihood: 'Low',
        rationale: 'Optical Rx levels remain within acceptable -3.2 dBm margin; hardware failure unlikely primary cause.',
        isHypothesis: true
      }
    ],
    diagnosticSteps: [
      {
        step: 1,
        action: 'Inspect hardware queue buffer drop counters on spine-01 egress ports',
        command: 'show interface FortyGigE0/1 counters queue drop detail',
        expected: 'Verify whether drops are concentrated in strict priority vs best-effort queues.'
      },
      {
        step: 2,
        action: 'Query ECMP hash distribution across parallel spine uplinks',
        command: 'show ip load-sharing interface FortyGigE0/1',
        expected: 'Check for hash polarity causing disproportionate flow concentration on spine-01.'
      },
      {
        step: 3,
        action: 'Sample ingress packet loss via synthetic UDP probe echo',
        command: 'precursor-probe --target spine-01 --count 50 --interval-ms 100',
        expected: 'Confirm loss rate matches sensor observation (2.15% +/- 0.3%).'
      }
    ],
    verificationChecks: [
      {
        check: 'P95 RTT Recovery',
        method: 'Continuous 5s telemetry polling',
        passCriteria: 'P95 latency returns below 25.0 ms for 5 consecutive sampling windows.'
      },
      {
        check: 'Zero Queue Drop Ingress',
        method: 'SNMP/Telemetry interface drop counters',
        passCriteria: 'Drop rate returns to 0 pkts/s on FortyGigE0/1.'
      }
    ],
    remediations: [
      {
        action: 'Dynamic Traffic Shedding: Shift 40% of leaf-01 analytics ingress flows to secondary spine-02 via BGP local-preference adjustment.',
        risk: 'Moderate: Transient TCP retransmissions (~200ms) during route convergence.',
        rollback: 'Revert BGP local-pref policy to default 100 via automated route-map withdrawal.'
      },
      {
        action: 'Increase Egress Buffer Ceiling: Expand dynamic buffer allocation threshold from 4MB to 16MB on spine-01.',
        risk: 'Low: Reduces buffer pool available for adjacent non-congested ports.',
        rollback: 'Restore original 4MB buffer pool allocation policy.'
      }
    ]
  },
  {
    id: 'INC-2026-0839',
    title: 'Leaf-02 Uplink Transceiver CRC Frame Degradation',
    summary: 'Intermittent optical signal attenuation causing physical layer CRC checksum errors (8 pkts/s) on leaf-02 uplink to spine-02. Latency remains nominal at 21.0ms.',
    severity: 'HIGH',
    status: 'OPEN',
    category: 'HARDWARE',
    affectedNodes: ['leaf-02', 'spine-02'],
    affectedLinks: ['spine-02-leaf-02'],
    primaryMetrics: ['interface_errors'],
    detectionSource: 'Fixed SLA',
    firstObserved: '13:45:00 UTC',
    lastObserved: '14:02:30 UTC',
    isActiveFault: true,
    predictedHorizonMinutes: null,
    evidence: [
      {
        metric: 'Interface CRC Checksum Errors',
        observedValue: '8 pkts/s',
        baseline: '0 pkts/s',
        delta: '+8 pkts/s above threshold',
        timestamp: '14:02:30 UTC'
      }
    ],
    timeline: [
      { id: 'tl-1', time: '13:45:00', event: 'First CRC error burst logged on leaf-02 [eth1/48].', type: 'detection' },
      { id: 'tl-2', time: '13:58:20', event: 'Fixed SLA detector flagged persistent CRC error rate > 5 pkts/s.', type: 'metric_breach' }
    ],
    currentFaults: [
      {
        id: 'flt-crc',
        rule: 'IMMEDIATE_CRC_ERROR_THRESHOLD',
        interfaceId: 'TenGigE0/48',
        value: '8 pkts/s'
      }
    ],
    futurePredictions: [],
    hypotheses: [
      {
        id: 'hyp-crc-1',
        title: 'Dirty or Loose LC Fiber Patch Connector',
        likelihood: 'High',
        rationale: 'FCS errors without frame size violations typically correlate with optical dispersion from dirty patch interfaces.',
        isHypothesis: true
      }
    ],
    diagnosticSteps: [
      {
        step: 1,
        action: 'Inspect DOM optical power levels on leaf-02',
        command: 'show interface TenGigE0/48 transceiver detail',
        expected: 'Rx optical power should read > -8.0 dBm.'
      }
    ],
    verificationChecks: [
      {
        check: 'Zero CRC Accumulation',
        method: 'Counter monitoring',
        passCriteria: 'Zero CRC counter increments over 15 minutes.'
      }
    ],
    remediations: [
      {
        action: 'Administrative Drain: Temporarily set link cost to maximum to isolate transceiver for physical inspection.',
        risk: 'Low: Spine-01 secondary path carries all redundant traffic seamlessly.',
        rollback: 'Restore default OSPF/IS-IS cost.'
      }
    ]
  },
  {
    id: 'INC-2026-0835',
    title: 'Web Cluster Egress TCP Window Starvation & Throughput Collapse',
    summary: 'Autoregressive trend analysis predicts progressive TCP window degradation across web server cluster over the next 15-30 minutes due to persistent RTT inflation.',
    severity: 'WARNING',
    status: 'ACKNOWLEDGED',
    category: 'ANOMALY',
    affectedNodes: ['srv-web-01', 'leaf-01'],
    affectedLinks: ['leaf-01-srv-web-01'],
    primaryMetrics: ['throughput_mbps', 'rtt_ms'],
    detectionSource: 'Forecast-Residual',
    firstObserved: '13:30:00 UTC',
    lastObserved: '14:00:00 UTC',
    isActiveFault: false,
    predictedHorizonMinutes: 15,
    evidence: [
      {
        metric: 'Aggregated Throughput (throughput_mbps)',
        observedValue: '742 Mbps',
        baseline: '940 Mbps',
        delta: '-198 Mbps (-21.1%)',
        timestamp: '14:00:00 UTC'
      }
    ],
    timeline: [
      { id: 'tl-1', time: '13:30:00', event: 'Forecast-Residual drift detected negative throughput trajectory.', type: 'detection' },
      { id: 'tl-2', time: '13:50:00', event: 'Reliability Gate set status to DEGRADED due to tail uncertainty.', type: 'gate_change' }
    ],
    currentFaults: [],
    futurePredictions: [
      {
        id: 'pred-15m-02',
        horizon: 15,
        impact: 'Throughput predicted to fall below 600 Mbps ceiling if latency contention is unmitigated.',
        score: 0.68
      }
    ],
    hypotheses: [
      {
        id: 'hyp-web-1',
        title: 'TCP Cubic Window Halving from Upstream Buffer Drops',
        likelihood: 'High',
        rationale: 'Correlates directly with packet loss on spine-01 uplink.',
        isHypothesis: true
      }
    ],
    diagnosticSteps: [
      {
        step: 1,
        action: 'Query TCP socket state statistics on srv-web-01',
        command: 'ss -ti dst 10.0.0.0/16',
        expected: 'Verify cwnd and rtt variance measurements across active client connections.'
      }
    ],
    verificationChecks: [
      {
        check: 'Throughput Recovery',
        method: 'Interface bandwidth monitor',
        passCriteria: 'Sustained throughput > 850 Mbps.'
      }
    ],
    remediations: [
      {
        action: 'Enable ECN (Explicit Congestion Notification) on leaf-01 egress queues to signal congestion before packet drop.',
        risk: 'Low: Requires host TCP stack ECN negotiation support.',
        rollback: 'Disable ECN marking profile.'
      }
    ]
  },
  {
    id: 'INC-2026-0828',
    title: 'Edge Gateway BGP Multipath Route Flap Resolved',
    summary: 'Transient BGP session hold-time expiration caused route flap across peer autonomous systems. Successfully converged over alternate transit provider.',
    severity: 'INFO',
    status: 'RESOLVED',
    category: 'CONNECTIVITY',
    affectedNodes: ['gw-edge-01'],
    affectedLinks: ['gw-edge-01-spine-01', 'gw-edge-01-spine-02'],
    primaryMetrics: ['jitter_ms'],
    detectionSource: 'Fixed SLA',
    firstObserved: '12:15:00 UTC',
    lastObserved: '12:35:00 UTC',
    isActiveFault: false,
    predictedHorizonMinutes: null,
    evidence: [
      {
        metric: 'Transit Jitter (jitter_ms)',
        observedValue: '1.4 ms (Nominal)',
        baseline: '1.2 ms',
        delta: '+0.2 ms',
        timestamp: '12:35:00 UTC'
      }
    ],
    timeline: [
      { id: 'tl-1', time: '12:15:00', event: 'Peer BGP keepalive timeout logged.', type: 'detection' },
      { id: 'tl-2', time: '12:20:00', event: 'Route convergence completed over secondary transit ASN.', type: 'gate_change' },
      { id: 'tl-3', time: '12:35:00', event: 'Incident resolved automatically; metric stabilized.', type: 'operator_note' }
    ],
    currentFaults: [],
    futurePredictions: [],
    hypotheses: [
      {
        id: 'hyp-bgp-1',
        title: 'Upstream Transit Provider Maintenance Window',
        likelihood: 'High',
        rationale: 'External ASN notified maintenance window coinciding with keepalive loss.',
        isHypothesis: true
      }
    ],
    diagnosticSteps: [],
    verificationChecks: [
      {
        check: 'BGP Prefix Stability',
        method: 'show ip bgp summary',
        passCriteria: 'Zero flaps over 60 minutes.'
      }
    ],
    remediations: []
  }
];
