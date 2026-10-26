export type MetricQuality = 'good' | 'stale' | 'missing' | 'invalid';

export type MetricId = 
  | 'rtt_ms' 
  | 'jitter_ms' 
  | 'packet_loss_pct' 
  | 'throughput_mbps' 
  | 'interface_errors';

export type TimeRange = '5m' | '15m' | '30m' | '1h';

export type NetworkSegment = 
  | 'all' 
  | 'edge-gateway' 
  | 'core-spines' 
  | 'aggregation-leaves' 
  | 'access-servers';

export interface TelemetryPointRecord {
  id: string;
  timestamp: number;
  timeLabel: string;
  rtt_ms: number | null;
  jitter_ms: number | null;
  packet_loss_pct: number | null;
  throughput_mbps: number | null;
  interface_errors: number | null;
  quality: MetricQuality;
  segment: NetworkSegment;
  isEventWindow?: boolean;
}

export interface MetricSummary {
  id: MetricId;
  label: string;
  unit: string;
  currentValue: number | null;
  p95Value?: number | null;
  trend: 'up' | 'down' | 'stable';
  trendPct: number;
  quality: MetricQuality;
  thresholdWarning: number;
  thresholdCritical: number;
  description: string;
}

export interface EventWindow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  targetMetric: MetricId;
  severity: 'info' | 'warning' | 'critical';
  description: string;
}

export interface QualityAuditEvent {
  id: string;
  timeLabel: string;
  metric: string;
  status: MetricQuality;
  detail: string;
}

export interface DataQualityAudit {
  healthyCount: number;
  staleCount: number;
  missingCount: number;
  invalidCount: number;
  totalObservations: number;
  sensorHealthScore: number;
  recentAuditEvents: QualityAuditEvent[];
}
