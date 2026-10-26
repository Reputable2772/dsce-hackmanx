import { IncidentRecord, IncidentSeverity, IncidentStatus, IncidentCategory, IncidentEvidenceItem } from './types';

/**
 * Robustly normalizes any raw incident payload from the backend API,
 * historical database, or test fixtures into a complete, safe IncidentRecord.
 * Guarantees every array property is instantiated so .join(), .map(), and .length
 * never throw a TypeError.
 */
export function normalizeIncident(raw: any, index: number = 0): IncidentRecord {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `INC-${index + 1}`,
      title: 'Unknown Incident',
      summary: 'No details available.',
      severity: 'WARNING',
      status: 'OPEN',
      category: 'ANOMALY',
      affectedNodes: ['host'],
      affectedLinks: [],
      primaryMetrics: [],
      detectionSource: 'EWMA Adaptive',
      firstObserved: 'N/A',
      lastObserved: 'N/A',
      isActiveFault: false,
      predictedHorizonMinutes: null,
      source: 'synthetic',
      evidence: [],
      timeline: [],
      currentFaults: [],
      futurePredictions: [],
      hypotheses: [],
      diagnosticSteps: [],
      verificationChecks: [],
      remediations: [],
    };
  }

  // 1. Severity normalization
  const rawSev = String(raw.severity || 'WARNING').toUpperCase();
  const severity: IncidentSeverity =
    rawSev === 'CRITICAL' ? 'CRITICAL' : rawSev === 'HIGH' ? 'HIGH' : rawSev === 'INFO' ? 'INFO' : 'WARNING';

  // 2. Status normalization
  const rawStatus = String(raw.status || 'ACTIVE').toUpperCase();
  const status: IncidentStatus =
    rawStatus === 'RESOLVED'
      ? 'RESOLVED'
      : rawStatus === 'ACKNOWLEDGED'
      ? 'ACKNOWLEDGED'
      : rawStatus === 'INVESTIGATING'
      ? 'INVESTIGATING'
      : 'OPEN';

  // 3. Category normalization
  const rawCat = String(raw.category || '').toUpperCase();
  const category: IncidentCategory =
    rawCat === 'CONGESTION' || rawCat === 'HARDWARE' || rawCat === 'CONFIGURATION' || rawCat === 'CONNECTIVITY'
      ? (rawCat as IncidentCategory)
      : raw.is_active_fault
      ? 'CONNECTIVITY'
      : 'ANOMALY';

  // 4. Timestamps
  const firstEpoch = raw.first_seen ?? raw.detected_at ?? (typeof raw.firstObserved === 'number' ? raw.firstObserved : null);
  const lastEpoch = raw.last_seen ?? raw.detected_at ?? (typeof raw.lastObserved === 'number' ? raw.lastObserved : null);

  const formatTs = (epoch: number | null, fallback: string = 'N/A'): string => {
    if (epoch == null) return fallback;
    try {
      const ms = epoch > 1e11 ? epoch : epoch * 1000;
      return new Date(ms).toISOString().substring(11, 19) + ' UTC';
    } catch {
      return fallback;
    }
  };

  const firstObserved = typeof raw.firstObserved === 'string' ? raw.firstObserved : formatTs(firstEpoch);
  const lastObserved = typeof raw.lastObserved === 'string' ? raw.lastObserved : formatTs(lastEpoch, firstObserved);

  // 5. Arrays with defensive fallbacks
  const affectedNodes: string[] = Array.isArray(raw.affectedNodes)
    ? raw.affectedNodes.map(String)
    : Array.isArray(raw.affected_nodes)
    ? raw.affected_nodes.map(String)
    : raw.interface_id
    ? [String(raw.interface_id)]
    : ['host'];

  const affectedLinks: string[] = Array.isArray(raw.affectedLinks)
    ? raw.affectedLinks.map(String)
    : Array.isArray(raw.affected_links)
    ? raw.affected_links.map(String)
    : [];

  const primaryMetrics: string[] = Array.isArray(raw.primaryMetrics)
    ? raw.primaryMetrics.map(String)
    : Array.isArray(raw.primary_metrics)
    ? raw.primary_metrics.map(String)
    : [];

  const supportingSignals: string[] = Array.isArray(raw.supporting_signals)
    ? raw.supporting_signals.map(String)
    : [];

  // 6. Evidence array
  let evidence: IncidentEvidenceItem[] = [];
  if (Array.isArray(raw.evidence)) {
    evidence = raw.evidence.map((ev: any) => ({
      metric: String(ev?.metric || 'Metric'),
      observedValue: String(ev?.observedValue ?? ev?.value ?? 'Nominal'),
      baseline: String(ev?.baseline || 'Nominal'),
      delta: String(ev?.delta || 'Nominal'),
      timestamp: String(ev?.timestamp || lastObserved),
    }));
  } else if (raw.evidence_summary && typeof raw.evidence_summary === 'object') {
    evidence = Object.entries(raw.evidence_summary).map(([metric, val]) => ({
      metric,
      observedValue: String(val),
      baseline: 'Nominal',
      delta: '+Breach',
      timestamp: lastObserved,
    }));
  }

  const isActiveFault = Boolean(raw.isActiveFault ?? raw.is_active_fault);
  const predictedHorizonMinutes =
    raw.predictedHorizonMinutes ?? raw.predicted_horizon_minutes ?? (isActiveFault ? null : 5);

  const id = String(raw.id || `INC-${Date.now()}-${index + 1}`);
  const iface = raw.interface_id || 'eth0';

  const title = String(
    raw.title ||
      (isActiveFault
        ? `Active Fault Detected on ${iface}`
        : `Predictive Anomaly Warning (+${predictedHorizonMinutes || 5}m Lookahead)`)
  );

  const summary = String(
    raw.copilot_summary ||
    raw.summary ||
      raw.description ||
      (isActiveFault
        ? `Confirmed active hardware or SLA fault breach on ${iface}. Immediate operational attention recommended.`
        : `Early-warning forecast (+${predictedHorizonMinutes || 5}m horizon). Reliability Gate State: ${raw.gate_state || 'PREDICT'}.`)
  );

  // 7. Timeline
  const timeline = Array.isArray(raw.timeline)
    ? raw.timeline
    : [
        {
          id: `tl-${id}-1`,
          time: firstObserved,
          event: `Incident registered (${isActiveFault ? 'Active Threshold Breach' : 'Predictive Forecast Horizon'})`,
          type: 'detection' as const,
        },
      ];

  // 8. Current Faults
  const currentFaults = Array.isArray(raw.currentFaults)
    ? raw.currentFaults
    : isActiveFault && primaryMetrics.length > 0
    ? primaryMetrics.map((m) => ({
        id: `fault-${m}`,
        rule: 'Exceeded SLA threshold',
        interfaceId: iface,
        value: String(raw.evidence_summary?.[m] || 'Active breach'),
      }))
    : [];

  // 9. Future Predictions
  const futurePredictions = Array.isArray(raw.futurePredictions)
    ? raw.futurePredictions
    : !isActiveFault && predictedHorizonMinutes
    ? [
        {
          id: `pred-${id}`,
          horizon: predictedHorizonMinutes,
          impact: severity === 'CRITICAL' ? 'High packet drop and TCP timeout forecast' : 'Latency jitter drift above SLA',
          score: 0.88,
        },
      ]
    : [];

  // 10. Hypotheses
  const hypotheses = Array.isArray(raw.hypotheses)
    ? raw.hypotheses
    : Array.isArray(raw.copilot_hypotheses) && raw.copilot_hypotheses.length > 0
    ? raw.copilot_hypotheses.map((h: any, idx: number) => ({
        id: `hyp-${id}-${idx + 1}`,
        title: h.statement || String(h),
        likelihood: h.confidence && h.confidence > 0.7 ? ('High' as const) : ('Medium' as const),
        rationale: h.rationale || `Grounded in observed telemetry evidence.`,
        isHypothesis: true as const,
      }))
    : [
        {
          id: `hyp-${id}-1`,
          title: isActiveFault ? 'Interface Buffer Congestion or Link Flap' : 'Resource Drift / Early Degradation',
          likelihood: 'High' as const,
          rationale: `Derived from ${supportingSignals.length > 0 ? supportingSignals.join(', ') : 'multi-signal telemetry detectors'}.`,
          isHypothesis: true as const,
        },
      ];

  // 11. Diagnostic steps & Runbook commands
  let diagnosticSteps: any[] = [];
  if (Array.isArray(raw.diagnosticSteps) && raw.diagnosticSteps.length > 0) {
    diagnosticSteps = raw.diagnosticSteps;
  } else if (Array.isArray(raw.diagnostic_commands) && raw.diagnostic_commands.length > 0) {
    diagnosticSteps = raw.diagnostic_commands.map((cmd: string, idx: number) => ({
      step: idx + 1,
      action: `Diagnostic runbook probe step`,
      command: cmd,
      expected: 'Confirm execution returns 0 without socket error or timeout',
    }));
  } else {
    diagnosticSteps = [
      {
        step: 1,
        action: `Verify interface counters and link status on ${iface}`,
        command: `ip -s link show ${iface}`,
        expected: 'Confirm drop counters and link operational carrier state',
      },
      {
        step: 2,
        action: 'Measure ICMP round-trip latency and packet loss',
        command: 'ping -c 5 172.25.80.31',
        expected: 'RTT < 50ms and 0% packet loss',
      },
      {
        step: 3,
        action: 'Inspect active socket connection states and buffer queues',
        command: 'ss -s',
        expected: 'No socket backlogs or unexpected TCP drops',
      },
    ];
  }

  const verificationChecks = Array.isArray(raw.verificationChecks) ? raw.verificationChecks : [];
  const remediations = Array.isArray(raw.remediations) ? raw.remediations : [];

  return {
    id,
    title,
    summary,
    severity,
    status,
    category,
    affectedNodes,
    affectedLinks,
    primaryMetrics,
    detectionSource: raw.detectionSource || (isActiveFault ? 'Fixed SLA' : 'EWMA Adaptive'),
    firstObserved,
    lastObserved,
    isActiveFault,
    predictedHorizonMinutes,
    source: raw.source === 'live' || String(raw.id || '').toLowerCase().includes('live') || String(raw.interface_id || '').startsWith('live') ? 'live' : 'synthetic',
    evidence,
    timeline,
    currentFaults,
    futurePredictions,
    hypotheses,
    diagnosticSteps,
    verificationChecks,
    remediations,
  };
}

export function normalizeIncidentList(rawList: any[]): IncidentRecord[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item, idx) => normalizeIncident(item, idx));
}
