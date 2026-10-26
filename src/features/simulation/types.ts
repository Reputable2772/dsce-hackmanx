import type { GateState } from '@/types';

/* ─── Scenario Definitions ─── */

export type ScenarioId =
  | 'normal_operation'
  | 'gradual_degradation'
  | 'sudden_failure'
  | 'traffic_surge'
  | 'distribution_shift_impact'
  | 'distribution_shift_no_impact'
  | 'sensor_degradation'
  | 'recovery';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  description: string;
  metricTypes: string[];
  expectedChallenge: string;
  timelineStages: string[];
  /** Illustrative mini-timeline for the card */
  miniTimeline: { label: string; intensity: number }[];
  icon: string; // lucide icon name
}

/* ─── Configuration ─── */

export interface SimulationConfig {
  scenarioId: ScenarioId;
  seed: number;
  durationMinutes: number;
  eventStartPercent: number; // 0–100, where the event begins on the timeline
  gateMode: 'gate_on' | 'gate_off';
}

export type SimulationPhase = 'idle' | 'running' | 'completed';

/* ─── Timeline ─── */

export type TimelineStageType =
  | 'baseline'
  | 'event_onset'
  | 'degradation'
  | 'detection'
  | 'prediction'
  | 'abstention'
  | 'recovery'
  | 'stable';

export interface TimelineStage {
  id: string;
  index: number;
  label: string;
  type: TimelineStageType;
  durationLabel: string;
  gateState: GateState;
  /** Illustrative telemetry snapshot for this stage */
  telemetry: {
    rtt_ms: number | null;
    jitter_ms: number | null;
    packet_loss_pct: number | null;
    throughput_mbps: number | null;
    sensorHealth: number; // 0–100
  };
  detectorObservations: DetectorObservation[];
  reliabilityNotes: string[];
}

export interface DetectorObservation {
  detectorName: string;
  score: number;
  threshold: number;
  triggered: boolean;
  note: string;
}

/* ─── Evaluation ─── */

export interface EvaluationMetrics {
  detectedEvents: number;
  falseAlarmsPerHour: number;
  warningLeadTimeMinutes: number;
  lateOrMissedEvents: number;
  abstentionRate: number; // 0–1
  totalPredictionWindows: number;
}

export interface GateComparisonResult {
  scenarioId: ScenarioId;
  scenarioName: string;
  seed: number;
  gateOn: EvaluationMetrics;
  gateOff: EvaluationMetrics;
  explanation: string;
}

export interface ScenarioEvaluationRow {
  scenarioId: ScenarioId;
  scenarioName: string;
  available: boolean;
  gateOn: EvaluationMetrics | null;
  gateOff: EvaluationMetrics | null;
}

/* ─── Gate Education ─── */

export interface GateStateExplanation {
  state: GateState;
  title: string;
  description: string;
  conditions: string[];
  example: string;
}
