export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ACKNOWLEDGED';

export type IncidentCategory = 
  | 'CONGESTION' 
  | 'HARDWARE' 
  | 'CONFIGURATION' 
  | 'CONNECTIVITY' 
  | 'ANOMALY';

export interface IncidentEvidenceItem {
  metric: string;
  observedValue: string;
  baseline: string;
  delta: string;
  timestamp: string;
}

export interface IncidentTimelineEvent {
  id: string;
  time: string;
  event: string;
  type: 'detection' | 'metric_breach' | 'gate_change' | 'operator_note';
}

export interface ContributingHypothesis {
  id: string;
  title: string;
  likelihood: 'High' | 'Moderate' | 'Low';
  rationale: string;
  isHypothesis: true;
}

export interface DiagnosticStep {
  step: number;
  action: string;
  command?: string;
  expected: string;
}

export interface VerificationCheck {
  check: string;
  method: string;
  passCriteria: string;
}

export interface RemediationOption {
  action: string;
  risk: string;
  rollback: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  affectedNodes: string[];
  affectedLinks: string[];
  primaryMetrics: string[];
  detectionSource: 'Fixed SLA' | 'EWMA Adaptive' | 'Forecast-Residual';
  firstObserved: string;
  lastObserved: string;
  isActiveFault: boolean;
  predictedHorizonMinutes: number | null;
  source?: 'synthetic' | 'live';
  evidence: IncidentEvidenceItem[];
  timeline: IncidentTimelineEvent[];
  currentFaults: Array<{ id: string; rule: string; interfaceId: string; value: string }>;
  futurePredictions: Array<{ id: string; horizon: number; impact: string; score: number }>;
  hypotheses: ContributingHypothesis[];
  diagnosticSteps: DiagnosticStep[];
  verificationChecks: VerificationCheck[];
  remediations: RemediationOption[];
}
