import { 
  SuggestedPrompt, 
  CopilotStructuredResponse, 
  ClaimVerificationRecord 
} from '../types';

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'p-1',
    title: 'Spine-01 Congestion Root Cause',
    category: 'Investigation',
    prompt: 'Investigate the root cause of the active buffer saturation on spine-01 (INC-2026-0842). What is the observed evidence vs hypotheses?',
    incidentId: 'INC-2026-0842'
  },
  {
    id: 'p-2',
    title: 'Verify SLA Compliance Claims',
    category: 'Verification',
    prompt: 'Verify the claim: "Latency on spine-01 is currently 48.6 ms, exceeding contractual SLA, while packet loss is under 0.5%."',
    incidentId: 'INC-2026-0842'
  },
  {
    id: 'p-3',
    title: 'Remediation Risks & Rollback',
    category: 'Remediation',
    prompt: 'What are the operational risks and rollback procedures if we execute BGP local-preference traffic shedding to secondary spine-02?',
    incidentId: 'INC-2026-0842'
  },
  {
    id: 'p-4',
    title: 'Reliability Gate Drift Assessment',
    category: 'Drift',
    prompt: 'Why is the Reliability Gate currently in PREDICT state, and what sensor thresholds would trigger a transition to ABSTAIN?'
  }
];

export const PREDEFINED_CLAIMS: ClaimVerificationRecord[] = [
  {
    id: 'clm-1',
    claimText: 'Latency on spine-01 is currently 48.6 ms, exceeding contractual SLA threshold of 35.0 ms.',
    metricId: 'rtt_ms',
    claimedValue: '48.6 ms',
    actualValue: '48.6 ms',
    status: 'VERIFIED',
    explanation: 'VERIFIED: Telemetry observation recorded at 14:04:45 UTC confirms exact RTT of 48.6 ms on spine-01 -> leaf-01, an increase of +150.5% over the 19.4 ms baseline.',
    limitations: 'Observation represents synthetic probe echo; client-side TCP application response times may experience additional queuing delay.',
    evidenceTimestamp: '14:04:45 UTC'
  },
  {
    id: 'clm-2',
    claimText: 'Packet loss on the aggregation tier remained nominal under 0.5% during the contention event.',
    metricId: 'packet_loss_pct',
    claimedValue: '< 0.5 %',
    actualValue: '2.15 %',
    status: 'CONTRADICTED',
    explanation: 'CONTRADICTED: Telemetry buffer confirms packet loss peaked at 2.15% at 14:04:40 UTC, breaching both the claimed 0.5% ceiling and the contractual 2.0% critical threshold.',
    limitations: 'Numerical disagreement exceeds 10% tolerance boundary. Discrepancy delta: +1.65% above claim.',
    evidenceTimestamp: '14:04:40 UTC'
  },
  {
    id: 'clm-3',
    claimText: 'Control plane BGP route convergence delay was exactly 142 milliseconds.',
    metricId: 'bgp_convergence_ms',
    claimedValue: '142 ms',
    actualValue: null,
    status: 'UNVERIFIED',
    explanation: 'UNVERIFIED: Control plane BGP convergence latency is not captured in the 5-second data-plane telemetry observation buffer. Claim cannot be substantiated or falsified.',
    limitations: 'Requires auxiliary routing daemon event logs (BMP/BGP monitoring protocol) not present in active telemetry stream.',
    evidenceTimestamp: 'N/A'
  },
  {
    id: 'clm-4',
    claimText: 'Interface throughput on leaf-01 uplinks decreased to 742 Mbps under congestion.',
    metricId: 'throughput_mbps',
    claimedValue: '742 Mbps',
    actualValue: '742.0 Mbps',
    status: 'VERIFIED',
    explanation: 'VERIFIED: Bandwidth utilization counter on leaf-01 egress uplink recorded 742.0 Mbps, representing a 21.1% dip from nominal 940 Mbps rate.',
    limitations: 'Aggregate interface counter does not differentiate individual VLAN or DSCP traffic classes.',
    evidenceTimestamp: '14:04:45 UTC'
  }
];

export const DEFAULT_COPILOT_RESPONSES: Record<string, CopilotStructuredResponse> = {
  'p-1': {
    summary: 'Spine-01 is currently experiencing critical queue buffer saturation triggered by an analytics microburst from leaf-01. RTT latency is elevated to 48.6ms (+150%) and packet loss has reached 2.15%. Current rule-based link state flaps have also been detected on FortyGigE0/1.',
    observedEvidence: [
      { label: 'Observed P95 Latency', value: '48.6 ms', context: 'Baseline: 19.4 ms (+150.5% elevation)' },
      { label: 'Egress Packet Loss', value: '2.15 %', context: 'Critical threshold: 2.00% (SLA breached)' },
      { label: 'Hardware Tail Drops', value: '12 pkts/s', context: 'Ingress buffer capacity reached 100%' },
      { label: 'Active Link Flaps', value: '3 flaps / 60s', context: 'Immediate zero-latency rule alert on FortyGigE0/1' }
    ],
    hypotheses: [
      {
        title: 'Asymmetric Microburst Flow Concentration',
        detail: 'ECMP hash polarization has concentrated heavy data analytics replication flows onto spine-01 rather than distributing equally with spine-02.',
        confidence: 'High'
      },
      {
        title: 'QoS Queue Starvation on Egress Transceiver',
        detail: 'Egress queue buffer profile may have exhausted dedicated buffer allocation for high-priority CoS queues.',
        confidence: 'Moderate'
      }
    ],
    diagnosticSteps: [
      {
        step: 1,
        command: 'show interface FortyGigE0/1 counters queue drop detail',
        explanation: 'Inspect hardware queue buffer depth to determine if drops are isolated to best-effort or priority traffic.'
      },
      {
        step: 2,
        command: 'show ip load-sharing interface FortyGigE0/1',
        explanation: 'Check ECMP hashing parameters to identify flow imbalance across parallel spine uplinks.'
      },
      {
        step: 3,
        command: 'precursor-probe --target spine-01 --count 50 --interval-ms 100',
        explanation: 'Perform active probe echo to measure forward synthetic transit latency directly.'
      }
    ],
    riskAndImpact: 'Unmitigated packet loss (2.15%) will trigger cumulative TCP window halving across compute nodes within 5 minutes, reducing cluster database throughput by an estimated 35-40%.',
    verificationSteps: [
      'Confirm FortyGigE0/1 drop counter ceases incrementing over 60 seconds.',
      'Verify P95 latency returns below 25.0 ms across 5 consecutive 5s sampling cycles.',
      'Ensure Reliability Gate maintains PREDICT state with KS drift p-value > 0.05.'
    ],
    rollbackConsiderations: 'If BGP local-preference adjustment causes unexpected route flapping, immediately withdraw route-map via `no route-map DRAIN_SPINE_01 permit 10` to restore standard ECMP weights.',
    runbookReferences: [
      { id: 'RB-NET-042', title: 'Spine-Leaf Fabric Buffer Contention & Queue Sizing', source: 'Internal Runbook Repository', sampleOnly: true },
      { id: 'RB-NET-019', title: 'Optical Transceiver Degradation & Rapid Drain Protocol', source: 'Internal Runbook Repository', sampleOnly: true }
    ],
    claims: [
      PREDEFINED_CLAIMS[0],
      PREDEFINED_CLAIMS[1]
    ],
    modelUsed: 'PRECURSOR Copilot Preview (Offline Heuristic Rule Engine — Deterministic Demo)'
  },
  'p-2': {
    summary: 'Verification analysis conducted for submitted SLA compliance assertions against the active 5-second telemetry observation snapshot.',
    observedEvidence: [
      { label: 'Claimed Latency vs Actual', value: '48.6 ms vs 48.6 ms', context: 'Status: VERIFIED (Exact match)' },
      { label: 'Claimed Packet Loss vs Actual', value: '< 0.5% vs 2.15%', context: 'Status: CONTRADICTED (Actual is 2.15%)' }
    ],
    hypotheses: [
      {
        title: 'Partial Telemetry Knowledge in Claim Assertion',
        detail: 'The submitted statement correctly cited observed latency but relied on outdated pre-burst packet loss figures.',
        confidence: 'High'
      }
    ],
    diagnosticSteps: [
      {
        step: 1,
        command: 'precursor telemetry inspect --metric packet_loss_pct --window 5m',
        explanation: 'Extract raw packet loss time series points across the 5-minute sampling window.'
      }
    ],
    riskAndImpact: 'Relying on contradicted SLA assertions poses compliance and operational risks if remediation decisions assume loss-free transmission.',
    verificationSteps: [
      'Cross-reference packet loss counters across both ingress leaf and egress spine interfaces.'
    ],
    rollbackConsiderations: 'No operational state changes were performed during claim verification.',
    runbookReferences: [
      { id: 'RB-AUDIT-008', title: 'Automated Telemetry SLA Claim Verification Standards', source: 'Internal Runbook Repository', sampleOnly: true }
    ],
    claims: [
      PREDEFINED_CLAIMS[0],
      PREDEFINED_CLAIMS[1]
    ],
    modelUsed: 'PRECURSOR Copilot Preview (Numerical Claim Verifier — Deterministic Demo)'
  },
  'default': {
    summary: 'Standard investigation response generated from active telemetry snapshot and deterministic diagnostic heuristics.',
    observedEvidence: [
      { label: 'Active Incidents', value: '1 Critical, 1 High', context: 'INC-2026-0842 and INC-2026-0839' },
      { label: 'Gate Decision', value: 'PREDICT', context: 'Sensor health 94.6%, KS drift 0.12' }
    ],
    hypotheses: [
      {
        title: 'Correlated Fabric Queue Contention',
        detail: 'Recent metric trends correlate with buffer contention across leaf-spine interconnections.',
        confidence: 'Moderate'
      }
    ],
    diagnosticSteps: [
      {
        step: 1,
        command: 'precursor-cli status --all',
        explanation: 'Fetch holistic node health, interface drop rates, and reliability gate scores.'
      }
    ],
    riskAndImpact: 'Degradation is currently bounded to spine-01; secondary spine-02 possesses 45% available headroom.',
    verificationSteps: [
      'Monitor telemetry explorer for post-event stabilization.'
    ],
    rollbackConsiderations: 'Always verify secondary link capacity prior to executing manual drain commands.',
    runbookReferences: [
      { id: 'RB-NET-001', title: 'Fabric General Operations and Troubleshooting', source: 'Internal Runbook Repository', sampleOnly: true }
    ],
    claims: [
      PREDEFINED_CLAIMS[0],
      PREDEFINED_CLAIMS[2]
    ],
    modelUsed: 'PRECURSOR Copilot Preview (Offline Heuristic Rule Engine — Deterministic Demo)'
  }
};
