/**
 * PRECURSOR — Phase 5: Simulation Lab & Evaluation Fixtures
 *
 * All values are DETERMINISTIC, explicitly labelled demonstration data.
 * They are NOT measured benchmark results, real telemetry, or validated findings.
 */

import type {
  ScenarioDefinition,
  ScenarioId,
  TimelineStage,
  TimelineStageType,
  GateComparisonResult,
  ScenarioEvaluationRow,
  GateStateExplanation,
} from '../types';

/* ═══════════════════════════════════════════════════════════════
   1. SCENARIO LIBRARY
   ═══════════════════════════════════════════════════════════════ */

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    id: 'normal_operation',
    name: 'Normal Operation',
    description: 'Stable network conditions with healthy telemetry and no faults.',
    metricTypes: ['RTT', 'Jitter', 'Packet Loss', 'Throughput'],
    expectedChallenge: 'Baseline verification — confirm the system does not generate spurious alerts under normal load.',
    timelineStages: ['Baseline', 'Continued Baseline', 'Stable'],
    miniTimeline: [
      { label: 'Start', intensity: 0.1 },
      { label: 'Mid', intensity: 0.12 },
      { label: 'End', intensity: 0.1 },
    ],
    icon: 'Activity',
  },
  {
    id: 'gradual_degradation',
    name: 'Gradual Degradation',
    description: 'Latency increases progressively over several minutes, simulating link saturation.',
    metricTypes: ['RTT', 'Jitter', 'Throughput'],
    expectedChallenge: 'Detect slowly-developing degradation before SLA breach.',
    timelineStages: ['Baseline', 'Event Onset', 'Degradation', 'Detection', 'Prediction'],
    miniTimeline: [
      { label: 'Normal', intensity: 0.1 },
      { label: 'Onset', intensity: 0.3 },
      { label: 'Growing', intensity: 0.55 },
      { label: 'Breach', intensity: 0.8 },
      { label: 'Alert', intensity: 0.9 },
    ],
    icon: 'TrendingUp',
  },
  {
    id: 'sudden_failure',
    name: 'Sudden Failure',
    description: 'A network component or link experiences an abrupt failure.',
    metricTypes: ['Packet Loss', 'RTT', 'Interface Errors'],
    expectedChallenge: 'Minimize detection latency for step-change faults.',
    timelineStages: ['Baseline', 'Event Onset', 'Detection', 'Stable Fault'],
    miniTimeline: [
      { label: 'Normal', intensity: 0.1 },
      { label: 'Fault', intensity: 1.0 },
      { label: 'Detect', intensity: 0.95 },
      { label: 'Stable', intensity: 0.85 },
    ],
    icon: 'Zap',
  },
  {
    id: 'traffic_surge',
    name: 'Traffic Surge',
    description: 'Throughput demand rises sharply, saturating available capacity.',
    metricTypes: ['Throughput', 'RTT', 'Packet Loss'],
    expectedChallenge: 'Distinguish legitimate high load from abnormal congestion.',
    timelineStages: ['Baseline', 'Event Onset', 'Degradation', 'Detection', 'Prediction'],
    miniTimeline: [
      { label: 'Idle', intensity: 0.15 },
      { label: 'Ramp', intensity: 0.5 },
      { label: 'Peak', intensity: 0.95 },
      { label: 'Saturated', intensity: 1.0 },
      { label: 'Easing', intensity: 0.7 },
    ],
    icon: 'ArrowUpRight',
  },
  {
    id: 'distribution_shift_impact',
    name: 'Distribution Shift — With Impact',
    description: 'Telemetry patterns change alongside service degradation.',
    metricTypes: ['RTT', 'Jitter', 'Throughput'],
    expectedChallenge: 'Detect genuine impact even when statistical distributions change.',
    timelineStages: ['Baseline', 'Event Onset', 'Degradation', 'Detection', 'Abstention', 'Prediction'],
    miniTimeline: [
      { label: 'Normal', intensity: 0.1 },
      { label: 'Shift', intensity: 0.4 },
      { label: 'Impact', intensity: 0.75 },
      { label: 'Abstain?', intensity: 0.6 },
      { label: 'Confirm', intensity: 0.8 },
    ],
    icon: 'Shuffle',
  },
  {
    id: 'distribution_shift_no_impact',
    name: 'Distribution Shift — Without Impact',
    description: 'Telemetry distribution changes without an assumed service failure.',
    metricTypes: ['RTT', 'Jitter', 'Throughput'],
    expectedChallenge: 'Avoid false alarms when distributions shift but service remains healthy.',
    timelineStages: ['Baseline', 'Event Onset', 'Abstention', 'Stable'],
    miniTimeline: [
      { label: 'Normal', intensity: 0.1 },
      { label: 'Shift', intensity: 0.45 },
      { label: 'Abstain', intensity: 0.35 },
      { label: 'OK', intensity: 0.15 },
    ],
    icon: 'GitBranch',
  },
  {
    id: 'sensor_degradation',
    name: 'Sensor Degradation',
    description: 'Telemetry becomes stale, incomplete, invalid, or unavailable.',
    metricTypes: ['Sensor Health', 'All Metrics'],
    expectedChallenge: 'Recognize that predictions built on degraded inputs should not be trusted.',
    timelineStages: ['Baseline', 'Event Onset', 'Degradation', 'Abstention', 'Recovery'],
    miniTimeline: [
      { label: 'Healthy', intensity: 0.1 },
      { label: 'Stale', intensity: 0.4 },
      { label: 'Missing', intensity: 0.7 },
      { label: 'Abstain', intensity: 0.55 },
      { label: 'Recover', intensity: 0.2 },
    ],
    icon: 'Radio',
  },
  {
    id: 'recovery',
    name: 'Recovery',
    description: 'Metrics return toward expected operating conditions after a fault.',
    metricTypes: ['RTT', 'Packet Loss', 'Throughput'],
    expectedChallenge: 'Correctly identify recovery without generating new false warnings.',
    timelineStages: ['Fault Baseline', 'Recovery Onset', 'Improving', 'Stable'],
    miniTimeline: [
      { label: 'Fault', intensity: 0.85 },
      { label: 'Recovery', intensity: 0.6 },
      { label: 'Improving', intensity: 0.3 },
      { label: 'Normal', intensity: 0.1 },
    ],
    icon: 'RefreshCw',
  },
];

/* ═══════════════════════════════════════════════════════════════
   2. DETERMINISTIC TIMELINE FIXTURES (seed-keyed)
   ═══════════════════════════════════════════════════════════════ */

/** Seeded hash for deterministic but varied values */
function seededValue(seed: number, stage: number, metric: number): number {
  const x = Math.sin(seed * 9301 + stage * 49297 + metric * 233) * 10000;
  return x - Math.floor(x);
}

function buildTimeline(scenarioId: ScenarioId, seed: number): TimelineStage[] {
  const def = scenarioDefinitions.find((s) => s.id === scenarioId);
  if (!def) return [];

  const stages: TimelineStage[] = def.timelineStages.map((label, idx) => {
    const sv = (m: number) => seededValue(seed, idx, m);
    const stageType = resolveStageType(label);

    const baseRtt = 12 + sv(0) * 4;
    const baseJitter = 1.5 + sv(1) * 1.2;
    const basePl = sv(2) * 0.15;
    const baseTp = 940 + sv(3) * 50;
    const baseSensor = 98 + sv(4) * 2;

    const factors = getStageFactors(scenarioId, stageType);

    return {
      id: `${scenarioId}-${seed}-stage-${idx}`,
      index: idx,
      label,
      type: stageType,
      durationLabel: getStageDuration(scenarioId, idx, def.timelineStages.length),
      gateState: factors.gateState,
      telemetry: {
        rtt_ms: +(baseRtt * factors.rttMultiplier).toFixed(1),
        jitter_ms: +(baseJitter * factors.jitterMultiplier).toFixed(2),
        packet_loss_pct: +(basePl * factors.plMultiplier).toFixed(3),
        throughput_mbps: +(baseTp * factors.tpMultiplier).toFixed(0),
        sensorHealth: Math.min(100, Math.max(0, +(baseSensor * factors.sensorMultiplier).toFixed(0))),
      },
      detectorObservations: buildDetectorObs(stageType, sv),
      reliabilityNotes: factors.notes,
    };
  });

  return stages;
}

type StageFactors = {
  rttMultiplier: number;
  jitterMultiplier: number;
  plMultiplier: number;
  tpMultiplier: number;
  sensorMultiplier: number;
  gateState: 'PREDICT' | 'DEGRADED' | 'ABSTAIN';
  notes: string[];
};

function getStageFactors(scenarioId: ScenarioId, stageType: string): StageFactors {
  const base: StageFactors = {
    rttMultiplier: 1,
    jitterMultiplier: 1,
    plMultiplier: 1,
    tpMultiplier: 1,
    sensorMultiplier: 1,
    gateState: 'PREDICT',
    notes: ['All reliability checks passing.'],
  };

  switch (scenarioId) {
    case 'normal_operation':
      return base;
    case 'gradual_degradation':
      if (stageType === 'baseline') return base;
      if (stageType === 'event_onset') return { ...base, rttMultiplier: 1.8, jitterMultiplier: 1.5, notes: ['Initial latency trend detected.'] };
      if (stageType === 'degradation') return { ...base, rttMultiplier: 3.5, jitterMultiplier: 2.8, tpMultiplier: 0.7, gateState: 'DEGRADED', notes: ['Residual error growing. Confidence reduced.'] };
      if (stageType === 'detection') return { ...base, rttMultiplier: 5.0, jitterMultiplier: 4.0, tpMultiplier: 0.5, plMultiplier: 8, gateState: 'DEGRADED', notes: ['Fixed SLA threshold breached. EWMA trend confirmed.'] };
      return { ...base, rttMultiplier: 6.0, jitterMultiplier: 4.5, tpMultiplier: 0.4, plMultiplier: 12, gateState: 'DEGRADED', notes: ['Prediction windows indicate continued degradation.'] };
    case 'sudden_failure':
      if (stageType === 'baseline') return base;
      if (stageType === 'event_onset') return { ...base, rttMultiplier: 15, plMultiplier: 80, tpMultiplier: 0.1, gateState: 'PREDICT', notes: ['Immediate rule-based detection triggered.'] };
      if (stageType === 'detection') return { ...base, rttMultiplier: 20, plMultiplier: 100, tpMultiplier: 0.05, gateState: 'PREDICT', notes: ['All detectors confirm fault. Immediate alert active.'] };
      return { ...base, rttMultiplier: 18, plMultiplier: 90, tpMultiplier: 0.08, gateState: 'PREDICT', notes: ['Fault persists. Recovery not yet observed.'] };
    case 'traffic_surge':
      if (stageType === 'baseline') return base;
      if (stageType === 'event_onset') return { ...base, rttMultiplier: 2.0, tpMultiplier: 1.4, notes: ['Throughput rising above baseline.'] };
      if (stageType === 'degradation') return { ...base, rttMultiplier: 4.0, jitterMultiplier: 3.0, tpMultiplier: 1.05, plMultiplier: 6, gateState: 'DEGRADED', notes: ['Capacity saturation detected. Queue delays increasing.'] };
      if (stageType === 'detection') return { ...base, rttMultiplier: 6.0, jitterMultiplier: 5.0, tpMultiplier: 0.95, plMultiplier: 15, gateState: 'DEGRADED', notes: ['Congestion thresholds breached on aggregation links.'] };
      return { ...base, rttMultiplier: 3.0, jitterMultiplier: 2.5, tpMultiplier: 1.1, plMultiplier: 4, gateState: 'DEGRADED', notes: ['Surge subsiding but residuals remain elevated.'] };
    case 'distribution_shift_impact':
      if (stageType === 'baseline') return base;
      if (stageType === 'event_onset') return { ...base, rttMultiplier: 1.6, jitterMultiplier: 2.5, notes: ['Distribution shift detected in latency.'] };
      if (stageType === 'degradation') return { ...base, rttMultiplier: 2.8, jitterMultiplier: 4.0, tpMultiplier: 0.65, gateState: 'DEGRADED', notes: ['Service impact confirmed alongside shift.'] };
      if (stageType === 'detection') return { ...base, rttMultiplier: 3.2, jitterMultiplier: 4.5, tpMultiplier: 0.6, gateState: 'DEGRADED', notes: ['Detectors triggered. KS drift p < 0.01.'] };
      if (stageType === 'abstention') return { ...base, rttMultiplier: 2.5, jitterMultiplier: 3.5, tpMultiplier: 0.7, gateState: 'ABSTAIN', notes: ['Predictions withheld — model may not generalize to shifted distribution. Immediate alerts remain active.'] };
      return { ...base, rttMultiplier: 3.5, jitterMultiplier: 4.8, tpMultiplier: 0.55, gateState: 'DEGRADED', notes: ['Impact confirmed via independent checks. Prediction may resume with caution.'] };
    case 'distribution_shift_no_impact':
      if (stageType === 'baseline') return base;
      if (stageType === 'event_onset') return { ...base, rttMultiplier: 1.3, jitterMultiplier: 2.0, notes: ['Distribution shift detected but no service degradation observed.'] };
      if (stageType === 'abstention') return { ...base, rttMultiplier: 1.2, jitterMultiplier: 1.8, gateState: 'ABSTAIN', notes: ['Predictions withheld — distribution shift does not necessarily imply service impact. A false alarm would be harmful.'] };
      return { ...base, rttMultiplier: 1.1, jitterMultiplier: 1.1, notes: ['Shift resolved. Service remained healthy throughout.'] };
    case 'sensor_degradation':
      if (stageType === 'baseline') return base;
      if (stageType === 'event_onset') return { ...base, sensorMultiplier: 0.8, gateState: 'DEGRADED', notes: ['Sensor health declining — stale readings detected.'] };
      if (stageType === 'degradation') return { ...base, sensorMultiplier: 0.5, gateState: 'DEGRADED', notes: ['Multiple sensors reporting invalid or missing data.'] };
      if (stageType === 'abstention') return { ...base, sensorMultiplier: 0.3, gateState: 'ABSTAIN', notes: ['Predictions withheld — insufficient sensor coverage to support predictions. Immediate rule-based alerts remain active for available telemetry.'] };
      return { ...base, sensorMultiplier: 0.85, gateState: 'DEGRADED', notes: ['Sensor health recovering. Predictions may resume when checks pass.'] };
    case 'recovery':
      if (stageType === 'baseline') return { ...base, rttMultiplier: 8.0, plMultiplier: 40, tpMultiplier: 0.3, gateState: 'PREDICT', notes: ['Existing fault condition — elevated latency and packet loss.'] };
      if (stageType === 'event_onset') return { ...base, rttMultiplier: 4.0, plMultiplier: 15, tpMultiplier: 0.55, notes: ['Recovery signals observed — latency decreasing.'] };
      if (stageType === 'degradation') return { ...base, rttMultiplier: 2.0, plMultiplier: 5, tpMultiplier: 0.8, notes: ['Continued improvement. Monitoring for stability.'] };
      return base;
    default:
      return base;
  }
}

function resolveStageType(label: string): TimelineStageType {
  const map: Record<string, TimelineStageType> = {
    'Baseline': 'baseline',
    'Continued Baseline': 'baseline',
    'Stable': 'stable',
    'Event Onset': 'event_onset',
    'Degradation': 'degradation',
    'Detection': 'detection',
    'Prediction': 'prediction',
    'Abstention': 'abstention',
    'Abstain?': 'abstention',
    'Recovery': 'event_onset',
    'Recovery Onset': 'event_onset',
    'Improving': 'degradation',
    'Fault Baseline': 'baseline',
    'Stable Fault': 'stable',
    'Confirm': 'detection',
    'OK': 'stable',
  };
  return map[label] ?? 'baseline';
}

function getStageDuration(scenarioId: ScenarioId, idx: number, total: number): string {
  const base = scenarioId === 'sudden_failure' ? 2 : 5;
  const mins = base + idx * 2;
  if (idx === total - 1) return `t+${mins}m → end`;
  return `t+${idx === 0 ? 0 : base + (idx - 1) * 2}m – t+${mins}m`;
}

function buildDetectorObs(
  stageType: string,
  sv: (m: number) => number
): { detectorName: string; score: number; threshold: number; triggered: boolean; note: string }[] {
  const detectors = [
    { name: 'Fixed SLA', threshold: 0.5 },
    { name: 'EWMA Adaptive', threshold: 0.6 },
    { name: 'Forecast-Residual', threshold: 0.55 },
  ];

  return detectors.map((d, i) => {
    let score: number;
    switch (stageType) {
      case 'baseline':
      case 'stable':
        score = +(0.1 + sv(10 + i) * 0.2).toFixed(2);
        break;
      case 'event_onset':
        score = +(0.3 + sv(10 + i) * 0.25).toFixed(2);
        break;
      case 'degradation':
        score = +(0.55 + sv(10 + i) * 0.2).toFixed(2);
        break;
      case 'detection':
        score = +(0.7 + sv(10 + i) * 0.2).toFixed(2);
        break;
      case 'prediction':
        score = +(0.65 + sv(10 + i) * 0.2).toFixed(2);
        break;
      case 'abstention':
        score = +(0.4 + sv(10 + i) * 0.3).toFixed(2);
        break;
      default:
        score = +(0.2 + sv(10 + i) * 0.15).toFixed(2);
    }
    return {
      detectorName: d.name,
      score,
      threshold: d.threshold,
      triggered: score >= d.threshold,
      note: score >= d.threshold
        ? `Score ${score} exceeds threshold ${d.threshold}.`
        : `Score ${score} below threshold ${d.threshold}.`,
    };
  });
}

export function getTimelineForScenario(scenarioId: ScenarioId, seed: number): TimelineStage[] {
  return buildTimeline(scenarioId, seed);
}

/* ═══════════════════════════════════════════════════════════════
   3. EVALUATION COMPARISON FIXTURES
   ═══════════════════════════════════════════════════════════════ */

/**
 * IMPORTANT: These are ILLUSTRATIVE values only — NOT measured benchmark results.
 * Gate-on vs gate-off comparisons are meaningful only under identical scenario seeds,
 * fault timings, and evaluation conditions.
 */

const evaluationFixtures: Record<ScenarioId, GateComparisonResult | null> = {
  normal_operation: {
    scenarioId: 'normal_operation',
    scenarioName: 'Normal Operation',
    seed: 42,
    gateOn: {
      detectedEvents: 0,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 0,
      falseAlarmsPerHour: 0.12,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'Under normal conditions, the reliability gate produces no false alarms. Without the gate, minor statistical fluctuations may occasionally trigger spurious alerts.',
  },
  gradual_degradation: {
    scenarioId: 'gradual_degradation',
    scenarioName: 'Gradual Degradation',
    seed: 42,
    gateOn: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 8.2,
      lateOrMissedEvents: 0,
      abstentionRate: 0.05,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.35,
      warningLeadTimeMinutes: 10.1,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'The gate-off mode produces slightly earlier warnings but at the cost of false alarms. Gate-on suppresses unsupported early predictions and abstains briefly until residual checks pass.',
  },
  sudden_failure: {
    scenarioId: 'sudden_failure',
    scenarioName: 'Sudden Failure',
    seed: 42,
    gateOn: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 0.3,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 0.3,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'Sudden faults are detected immediately by rule-based thresholds. Both modes respond identically because immediate detection does not depend on future predictions.',
  },
  traffic_surge: {
    scenarioId: 'traffic_surge',
    scenarioName: 'Traffic Surge',
    seed: 42,
    gateOn: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 4.5,
      lateOrMissedEvents: 0,
      abstentionRate: 0.08,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.6,
      warningLeadTimeMinutes: 6.0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'Gate-on avoids premature alarms during the initial throughput ramp. Gate-off produces earlier warnings but includes false alarms from transient spikes.',
  },
  distribution_shift_impact: {
    scenarioId: 'distribution_shift_impact',
    scenarioName: 'Distribution Shift — With Impact',
    seed: 42,
    gateOn: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 3.8,
      lateOrMissedEvents: 0,
      abstentionRate: 0.18,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 1,
      falseAlarmsPerHour: 0.8,
      warningLeadTimeMinutes: 7.5,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'Under distribution shift with impact, gate-on abstains during the shift period because model predictions may not generalize. Immediate rule-based alerts remain active. Gate-off predicts through the shift but generates false alarms from the unfamiliar distribution.',
  },
  distribution_shift_no_impact: {
    scenarioId: 'distribution_shift_no_impact',
    scenarioName: 'Distribution Shift — Without Impact',
    seed: 42,
    gateOn: {
      detectedEvents: 0,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.22,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 0,
      falseAlarmsPerHour: 1.2,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'This scenario illustrates the critical distinction: distribution shift does not necessarily imply service impact. Gate-on correctly abstains from predictions without raising false alarms. Gate-off misinterprets the shift as degradation and produces false alarms.',
  },
  sensor_degradation: {
    scenarioId: 'sensor_degradation',
    scenarioName: 'Sensor Degradation',
    seed: 42,
    gateOn: {
      detectedEvents: 0,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.35,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 0,
      falseAlarmsPerHour: 0.9,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'When sensors degrade, gate-on withholds predictions because the inputs are unreliable. Gate-off continues predicting on stale or missing data and produces false alarms. Abstention is not a missed detection — immediate rule-based alerts remain active for available telemetry.',
  },
  recovery: {
    scenarioId: 'recovery',
    scenarioName: 'Recovery',
    seed: 42,
    gateOn: {
      detectedEvents: 0,
      falseAlarmsPerHour: 0.0,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.03,
      totalPredictionWindows: 60,
    },
    gateOff: {
      detectedEvents: 0,
      falseAlarmsPerHour: 0.25,
      warningLeadTimeMinutes: 0,
      lateOrMissedEvents: 0,
      abstentionRate: 0.0,
      totalPredictionWindows: 60,
    },
    explanation: 'During recovery, gate-on briefly abstains while residual error from the prior fault decays. Gate-off may generate false warnings from residual drift during the recovery period.',
  },
};

export function getEvaluationForScenario(scenarioId: ScenarioId): GateComparisonResult | null {
  return evaluationFixtures[scenarioId] ?? null;
}

export function getAllEvaluationRows(): ScenarioEvaluationRow[] {
  return scenarioDefinitions.map((def) => {
    const eval_ = evaluationFixtures[def.id];
    return {
      scenarioId: def.id,
      scenarioName: def.name,
      available: eval_ !== null,
      gateOn: eval_?.gateOn ?? null,
      gateOff: eval_?.gateOff ?? null,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. GATE STATE EDUCATION FIXTURES
   ═══════════════════════════════════════════════════════════════ */

export const gateStateExplanations: GateStateExplanation[] = [
  {
    state: 'PREDICT',
    title: 'PREDICT — Reliability Checks Pass',
    description: 'The system permits a prediction when all configured reliability checks pass: sensor health is adequate, no significant distribution drift is detected, residual error is within tolerance, and calibration data is available.',
    conditions: [
      'Sensor health score above configured threshold',
      'Kolmogorov–Smirnov drift statistic below configured limit',
      'Residual forecast error within acceptable bounds',
      'Calibration data available and recent',
    ],
    example: 'Example: All four sensors reporting good-quality data, KS statistic 0.04 (threshold 0.10), residual error 2.3 ms (limit 5.0 ms). → Gate permits prediction.',
  },
  {
    state: 'DEGRADED',
    title: 'DEGRADED — Reduced Confidence',
    description: 'The system indicates reduced confidence in the available telemetry or model behavior. Predictions may still be shown but are annotated with warnings. Operators should interpret results with caution.',
    conditions: [
      'One or more sensor channels stale or intermittent',
      'Drift statistic elevated but below abstention threshold',
      'Residual error growing but not yet excessive',
      'Calibration data aging but still within validity window',
    ],
    example: 'Example: Two of four sensors intermittent, KS statistic 0.07 (threshold 0.10), residual error 4.1 ms (limit 5.0 ms). → Gate warns of degraded confidence.',
  },
  {
    state: 'ABSTAIN',
    title: 'ABSTAIN — Predictions Withheld',
    description: 'The system withholds unsupported future predictions and explains why. Abstention is not equivalent to a missed detection — immediate rule-based fault detection can remain active while future predictions are withheld.',
    conditions: [
      'Sensor health below minimum threshold for model inputs',
      'Significant distribution drift detected (KS p < 0.01)',
      'Residual error exceeds tolerance for reliable prediction',
      'Calibration data unavailable or expired',
    ],
    example: 'Example: Sensor health 45% (threshold 70%), KS statistic 0.18 (threshold 0.10). → Gate withholds predictions. Immediate SLA breach alerts remain active.',
  },
];

/* ═══════════════════════════════════════════════════════════════
   5. LIMITATIONS TEXT
   ═══════════════════════════════════════════════════════════════ */

export const evaluationLimitations = [
  'All values shown are predetermined illustrative fixtures, not measured benchmark results.',
  'Gate-on and gate-off comparisons are meaningful only when both use identical scenario seeds, fault timings, and evaluation conditions.',
  'Abstention is not automatically a missed detection; immediate rule-based fault detection remains active while future predictions are withheld.',
  'A prediction score is not a probability unless calibrated and validated against held-out data.',
  'Distribution shift does not necessarily imply service impact — the two must be evaluated independently.',
  'Real evaluation requires backend integration with the PRECURSOR simulation engine and validated telemetry datasets.',
];
