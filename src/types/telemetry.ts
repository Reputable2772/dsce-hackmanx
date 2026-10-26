export type MetricQuality = 'good' | 'stale' | 'missing' | 'invalid';

export interface TelemetryPoint {
  timestamp: number; // Unix epoch seconds UTC
  metric_id: string;
  value: number | null;
  quality: MetricQuality;
  source: 'synthetic' | 'live';
  interface_id?: string;
  labels?: Record<string, string>;
}

export interface MetricSummary {
  metric_id: string;
  label: string;
  current_value: number | null;
  unit: string;
  quality: MetricQuality;
  min?: number;
  max?: number;
}
