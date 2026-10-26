import { 
  TelemetryPointRecord, 
  MetricSummary, 
  EventWindow, 
  DataQualityAudit 
} from '../types';

/**
 * Deterministic Telemetry Fixture for PRECURSOR Phase 3.
 * Represents a 5-minute sampling window (60 steps @ 5s interval)
 * with a realistic gradual degradation and microburst event.
 * Explicitly includes illustrative missing and stale data points
 * to demonstrate how the Reliability Gate handles non-healthy data.
 */

export const INITIAL_METRIC_SUMMARIES: MetricSummary[] = [
  {
    id: 'rtt_ms',
    label: 'Outbound Probe RTT',
    unit: 'ms',
    currentValue: 48.6,
    p95Value: 51.4,
    trend: 'up',
    trendPct: 62.5,
    quality: 'good',
    thresholdWarning: 35.0,
    thresholdCritical: 50.0,
    description: 'Active round-trip latency pinging configured target host.'
  },
  {
    id: 'jitter_ms',
    label: 'Outbound Probe Jitter',
    unit: 'ms',
    currentValue: 7.2,
    p95Value: 8.1,
    trend: 'up',
    trendPct: 45.0,
    quality: 'good',
    thresholdWarning: 4.0,
    thresholdCritical: 8.0,
    description: 'Statistical delay variance in successive outbound probe round-trips.'
  },
  {
    id: 'packet_loss_pct',
    label: 'Outbound Probe Loss',
    unit: '%',
    currentValue: 2.15,
    p95Value: 2.40,
    trend: 'up',
    trendPct: 180.0,
    quality: 'good',
    thresholdWarning: 0.50,
    thresholdCritical: 2.00,
    description: 'Fraction of outbound probe packets failing receipt acknowledgement from target.'
  },
  {
    id: 'throughput_mbps',
    label: 'Network Throughput',
    unit: 'Mbps',
    currentValue: 742.0,
    p95Value: 955.0,
    trend: 'down',
    trendPct: -18.2,
    quality: 'good',
    thresholdWarning: 600.0,
    thresholdCritical: 400.0,
    description: 'Aggregated physical bandwidth utilization across server network interface.'
  },
  {
    id: 'packets_in_sec',
    label: 'Inbound Packets (RX)',
    unit: 'pkts/s',
    currentValue: 1250,
    p95Value: 1420,
    trend: 'stable',
    trendPct: 0.0,
    quality: 'good',
    thresholdWarning: 2000,
    thresholdCritical: 10000,
    description: 'Physical incoming packet arrival rate on server network interface.'
  },
  {
    id: 'packets_out_sec',
    label: 'Outbound Packets (TX)',
    unit: 'pkts/s',
    currentValue: 980,
    p95Value: 1150,
    trend: 'stable',
    trendPct: 0.0,
    quality: 'good',
    thresholdWarning: 5000,
    thresholdCritical: 20000,
    description: 'Physical outgoing packet transmission rate from server network interface.'
  },
  {
    id: 'interface_errors',
    label: 'Inbound Buffer Drops',
    unit: 'drops',
    currentValue: 0,
    p95Value: 0,
    trend: 'stable',
    trendPct: 0.0,
    quality: 'good',
    thresholdWarning: 5,
    thresholdCritical: 20,
    description: 'Kernel ring buffer overruns and fragment reassembly drops on server interface.'
  }
];

export const TELEMETRY_EVENT_WINDOWS: EventWindow[] = [
  {
    id: 'ev-1',
    name: 'Spine-Leaf Buffer Saturation',
    startTime: '14:02:15',
    endTime: '14:03:45',
    targetMetric: 'rtt_ms',
    severity: 'warning',
    description: 'Microburst queue occupancy exceeding 75% on spine-01 egress switch fabric.'
  },
  {
    id: 'ev-2',
    name: 'Tail Packet Drop Burst',
    startTime: '14:02:45',
    endTime: '14:03:30',
    targetMetric: 'packet_loss_pct',
    severity: 'critical',
    description: 'Tail-drop mitigation engaged on leaf-01 uplinks; 2.4% packet loss sustained.'
  }
];

export const TELEMETRY_QUALITY_AUDIT: DataQualityAudit = {
  healthyCount: 284,
  staleCount: 8,
  missingCount: 6,
  invalidCount: 2,
  totalObservations: 300,
  sensorHealthScore: 0.946,
  recentAuditEvents: [
    {
      id: 'qa-1',
      timeLabel: '14:02:30',
      metric: 'rtt_ms',
      status: 'missing',
      detail: 'Null packet probe response received from leaf-02 probe agent (timeout > 5000ms).'
    },
    {
      id: 'qa-2',
      timeLabel: '14:02:35',
      metric: 'jitter_ms',
      status: 'missing',
      detail: 'Observation skipped due to missing paired packet timestamp.'
    },
    {
      id: 'qa-3',
      timeLabel: '14:03:00',
      metric: 'throughput_mbps',
      status: 'stale',
      detail: 'Counter unchanged across 3 consecutive 5-second polling cycles (telemetry cache stale).'
    },
    {
      id: 'qa-4',
      timeLabel: '14:03:40',
      metric: 'interface_errors',
      status: 'invalid',
      detail: 'Sensor returned negative delta value (-4); rejected by ingress schema validator.'
    }
  ]
};

// Generates 60 deterministic time series records (14:00:00 to 14:04:55)
export const GENERATE_TELEMETRY_SERIES = (): TelemetryPointRecord[] => {
  const records: TelemetryPointRecord[] = [];
  const baseEpoch = 1772006400; // Reference timestamp

  for (let i = 0; i < 60; i++) {
    const epoch = baseEpoch + (i * 5);
    const minute = Math.floor(i / 12);
    const second = (i % 12) * 5;
    const timeLabel = `14:0${minute}:${second < 10 ? '0' : ''}${second}`;

    // Degradation envelope peaking around step 30-45 (14:02:30 - 14:03:45)
    let rtt: number | null = 19.5 + Math.sin(i * 0.2) * 2.5;
    let jitter: number | null = 1.4 + Math.cos(i * 0.15) * 0.4;
    let loss: number | null = 0.02 + (i > 25 ? Math.sin((i - 25) * 0.15) * 0.05 : 0.01);
    let throughput: number | null = 940 - (Math.sin(i * 0.1) * 35);
    let errors: number | null = 0;
    let quality: TelemetryPointRecord['quality'] = 'good';
    let isEvent = false;

    // Simulate developing degradation event
    if (i >= 24 && i <= 48) {
      isEvent = true;
      const progress = (i - 24) / 24; // 0.0 to 1.0
      rtt = 22.0 + Math.sin(progress * Math.PI) * 29.5 + (Math.sin(i * 0.8) * 2.0);
      jitter = 1.8 + Math.sin(progress * Math.PI) * 6.4 + (Math.cos(i * 0.7) * 0.8);
      loss = Math.max(0.0, Math.sin(progress * Math.PI) * 2.45 + (Math.sin(i * 0.9) * 0.15));
      throughput = 940 - Math.sin(progress * Math.PI) * 220 + (Math.cos(i * 0.4) * 25);
      errors = Math.round(Math.sin(progress * Math.PI) * 14);
    }

    // Explicit illustrative gaps and data-quality anomalies
    if (i === 30 || i === 31) {
      // Missing telemetry points
      rtt = null;
      jitter = null;
      quality = 'missing';
    } else if (i === 36) {
      // Stale repeating metric point
      rtt = 42.1;
      jitter = 6.4;
      loss = 1.85;
      throughput = 780.0;
      errors = 8;
      quality = 'stale';
    } else if (i === 44) {
      // Invalid sensor reading
      errors = null;
      quality = 'invalid';
    }

    const inPkts = throughput !== null ? Math.round(throughput * 85 + (Math.sin(i * 0.3) * 40)) : null;
    const outPkts = throughput !== null ? Math.round(throughput * 70 + (Math.cos(i * 0.3) * 30)) : null;

    records.push({
      id: `pt-${i}`,
      timestamp: epoch,
      timeLabel,
      rtt_ms: rtt !== null ? Number(rtt.toFixed(2)) : null,
      jitter_ms: jitter !== null ? Number(jitter.toFixed(2)) : null,
      packet_loss_pct: loss !== null ? Number(loss.toFixed(3)) : null,
      throughput_mbps: throughput !== null ? Number(throughput.toFixed(1)) : null,
      packets_in_sec: inPkts,
      packets_out_sec: outPkts,
      interface_errors: errors,
      quality,
      segment: i % 3 === 0 ? 'core-spines' : i % 3 === 1 ? 'aggregation-leaves' : 'edge-gateway',
      isEventWindow: isEvent
    });
  }

  return records;
};

export const DETERMINISTIC_TELEMETRY_SERIES = GENERATE_TELEMETRY_SERIES();
