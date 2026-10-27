import { GateState } from '@/types';

export type PredictionHorizon = 5 | 15 | 30;

export type DetectorType = 'fixed_sla' | 'ewma' | 'forecast_residual' | 'immediate';

export interface CurrentFault {
  id: string;
  title: string;
  targetDevice: string;
  interfaceId: string;
  rule: string;
  observedValue: string;
  threshold: string;
  detectedAt: string;
  severity: 'critical' | 'high' | 'medium';
  isImmediate: true;
  summary: string;
}

export interface PredictionEvidence {
  baselineMean?: string;
  currentValue?: string;
  residualDelta?: string;
  consecutiveBreaches?: number;
  driftPValue?: number;
  sensorCompleteness?: string;
  methodology: string;
}

export interface PacketSampleItem {
  packet_id: string;
  timestamp: number;
  timestamp_iso: string;
  metric: string;
  value: number | null;
  quality: string;
  protocol: string;
  source: string;
  destination: string;
  destination_port?: number;
  packet_size?: number;
}

export interface PredictionRecord {
  id: string;
  targetMetric: string;
  metricId: string;
  targetEntity: string;
  potentialImpact: string;
  horizonMinutes: PredictionHorizon;
  detectorName: DetectorType;
  detectorLabel: string;
  detectorScore: number; // 0.00 to 1.00 raw score
  scoreBadgeLabel: string; // "ILLUSTRATIVE SCORE — NOT CALIBRATED"
  threshold: number;
  predictedImpact: boolean;
  isSustained: boolean;
  reliabilityState: GateState;
  evidence: PredictionEvidence;
  limitations: string[];
  targetHost?: string;
  interfaceId?: string;
  mathFormula?: string;
  samplePackets?: PacketSampleItem[];
}

export interface GateDecisionRecord {
  state: GateState;
  reasons: string[];
  sensorHealthScore: number;
  driftScore: number; // e.g. Kolmogorov-Smirnov statistic
  residualErrorScore: number;
  suppressedMetrics: string[];
  immediateAlertsActive: boolean;
  evaluatedAt: string;
}

export interface DetectorMetadata {
  id: DetectorType;
  name: string;
  description: string;
  strengths: string;
  limitations: string;
  formulaSummary: string;
}
