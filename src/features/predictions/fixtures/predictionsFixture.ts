import { 
  CurrentFault, 
  PredictionRecord, 
  PredictionHorizon, 
  GateDecisionRecord,
  DetectorMetadata 
} from '../types';

/**
 * Deterministic Predictions Fixture for PRECURSOR Phase 3.
 * Strictly separates immediate rule-based current faults from multi-horizon forecasts (+5m, +15m, +30m).
 * Explicitly labels uncalibrated detector scores as illustrative.
 */

export const DETECTOR_METADATA: DetectorMetadata[] = [
  {
    id: 'fixed_sla',
    name: 'Fixed SLA Threshold Detector',
    description: 'Monitors rigid contractual latency, loss, and jitter ceilings (e.g. RTT > 35ms or loss > 1.0%).',
    strengths: 'Deterministic, easily understood, compliance-driven, zero cold-start delay.',
    limitations: 'Blind to slow gradual drifts that stay beneath static threshold until too late.',
    formulaSummary: 'Trigger if (observed_metric >= sla_threshold) sustained for N consecutive periods.'
  },
  {
    id: 'ewma',
    name: 'EWMA Adaptive Detector',
    description: 'Exponentially Weighted Moving Average that tracks recent trajectory with dynamic variance bands.',
    strengths: 'Rapid response to sudden regime shifts while filtering high-frequency noise.',
    limitations: 'Can adapt to sustained degradation if half-life decay parameter is tuned too aggressively.',
    formulaSummary: 'S_t = alpha * Y_t + (1 - alpha) * S_{t-1}; trigger if |Y_t - S_t| > k * sigma_t.'
  },
  {
    id: 'forecast_residual',
    name: 'Forecast-Residual Drift Detector',
    description: 'Fits an autoregressive linear trend and computes the residual divergence over forward lookaheads.',
    strengths: 'Detects developing degradation minutes before any static SLA threshold is reached.',
    limitations: 'Requires steady sensor continuity; sensitive to unannounced network topology changes.',
    formulaSummary: 'Residual = Y_{t+h} - Yhat_{t+h}; trigger if cumulative residual growth exceeds 2.5 * SE.'
  }
];

export const CURRENT_FAULTS: CurrentFault[] = [
  {
    id: 'flt-01',
    title: 'Active Core Uplink Interface Flap',
    targetDevice: 'spine-01',
    interfaceId: 'FortyGigE0/1',
    rule: 'IMMEDIATE_LINK_STATE_FLAP',
    observedValue: '3 state changes / 60s',
    threshold: '>= 2 transitions / 60s',
    detectedAt: '14:03:12',
    severity: 'critical',
    isImmediate: true,
    summary: 'Carrier detect lost twice in under 60 seconds on physical transceiver. Traffic rerouted over backup spine.'
  },
  {
    id: 'flt-02',
    title: 'Active Tail-Drop Hard Threshold Breach',
    targetDevice: 'leaf-01',
    interfaceId: 'TenGigE0/48',
    rule: 'IMMEDIATE_DROP_EXCEEDANCE',
    observedValue: '14 pkts/s drop rate',
    threshold: '>= 10 pkts/s',
    detectedAt: '14:03:45',
    severity: 'high',
    isImmediate: true,
    summary: 'Hardware FIFO tail-drop queue depth exceeded max buffer limit. Active packet loss currently impacting egress stream.'
  }
];

export const PREDICTIONS_BY_HORIZON: Record<PredictionHorizon, PredictionRecord[]> = {
  5: [
    {
      id: 'pred-5m-01',
      targetMetric: 'Spine-to-Leaf RTT Latency',
      metricId: 'rtt_ms',
      targetEntity: 'spine-01 -> leaf-01',
      potentialImpact: 'SLA Breach: P95 Latency expected to exceed contractual 35.0ms ceiling during next ingress burst.',
      horizonMinutes: 5,
      detectorName: 'ewma',
      detectorLabel: 'EWMA Adaptive Detector',
      detectorScore: 0.84,
      scoreBadgeLabel: 'ILLUSTRATIVE SCORE — NOT CALIBRATED',
      threshold: 0.65,
      predictedImpact: true,
      isSustained: true,
      reliabilityState: 'PREDICT',
      evidence: {
        baselineMean: '19.4 ms',
        currentValue: '32.1 ms (trend accelerating)',
        residualDelta: '+12.7 ms above EWMA baseline',
        consecutiveBreaches: 4,
        driftPValue: 0.42,
        sensorCompleteness: '96.8% valid observations',
        methodology: 'EWMA mean shifted +3.1 sigma; variance envelope projected to intersect 35ms SLA within 180s.'
      },
      limitations: [
        'Detector assumes constant background traffic profile; sudden unannounced traffic rerouting could invalidate curve.',
        'Score is a normalized heuristic anomaly measure, not a calibrated failure probability.'
      ]
    },
    {
      id: 'pred-5m-02',
      targetMetric: 'Egress Interface Drop Rate',
      metricId: 'interface_errors',
      targetEntity: 'leaf-01 [eth1/48]',
      potentialImpact: 'Buffer Exhaustion: Ingress queue depth growing at 4.2 MB/s; tail-drop escalation imminent.',
      horizonMinutes: 5,
      detectorName: 'fixed_sla',
      detectorLabel: 'Fixed SLA Threshold Detector',
      detectorScore: 0.76,
      scoreBadgeLabel: 'ILLUSTRATIVE SCORE — NOT CALIBRATED',
      threshold: 0.70,
      predictedImpact: true,
      isSustained: false,
      reliabilityState: 'PREDICT',
      evidence: {
        baselineMean: '0.2 pkts/s',
        currentValue: '8.4 pkts/s',
        consecutiveBreaches: 2,
        sensorCompleteness: '100% valid observations',
        methodology: 'Deterministic threshold comparison against safety margin (10 pkts/s critical limit).'
      },
      limitations: [
        'Does not anticipate flow completion timing; microbursts under 200ms may clear without intervention.'
      ]
    }
  ],
  15: [
    {
      id: 'pred-15m-01',
      targetMetric: 'End-to-End Packet Loss Ratio',
      metricId: 'packet_loss_pct',
      targetEntity: 'Fabric Segment: Spine Tier -> Web Cluster',
      potentialImpact: 'Service Degradation: Packet loss trajectory indicates sustained > 1.5% loss across aggregation tier.',
      horizonMinutes: 15,
      detectorName: 'forecast_residual',
      detectorLabel: 'Forecast-Residual Drift Detector',
      detectorScore: 0.91,
      scoreBadgeLabel: 'ILLUSTRATIVE SCORE — NOT CALIBRATED',
      threshold: 0.75,
      predictedImpact: true,
      isSustained: true,
      reliabilityState: 'PREDICT',
      evidence: {
        baselineMean: '0.01%',
        currentValue: '0.85%',
        residualDelta: '+0.72% residual divergence',
        consecutiveBreaches: 7,
        driftPValue: 0.28,
        sensorCompleteness: '95.2% valid observations',
        methodology: 'Autoregressive trend projection confirms positive slope exceeding 99% confidence interval.'
      },
      limitations: [
        'Forecast horizon exceeds current telemetry buffer variance window (10 minutes of stable reference data).',
        'Relies on linear residual model; non-linear TCP congestion backoff may moderate actual packet loss.'
      ]
    },
    {
      id: 'pred-15m-02',
      targetMetric: 'Aggregation Uplink Throughput',
      metricId: 'throughput_mbps',
      targetEntity: 'leaf-02 -> spine-02',
      potentialImpact: 'Bandwidth Bottleneck: Secondary spine uplink saturating at 95% capacity following primary failover.',
      horizonMinutes: 15,
      detectorName: 'ewma',
      detectorLabel: 'EWMA Adaptive Detector',
      detectorScore: 0.68,
      scoreBadgeLabel: 'ILLUSTRATIVE SCORE — NOT CALIBRATED',
      threshold: 0.65,
      predictedImpact: true,
      isSustained: false,
      reliabilityState: 'PREDICT',
      evidence: {
        baselineMean: '450 Mbps',
        currentValue: '890 Mbps',
        residualDelta: '+440 Mbps surge',
        consecutiveBreaches: 3,
        sensorCompleteness: '98.0% valid observations',
        methodology: 'EWMA tracking sudden step-function load migration.'
      },
      limitations: [
        'Load spike could be transient batch replication job scheduled to complete in < 10 minutes.'
      ]
    }
  ],
  30: [
    {
      id: 'pred-30m-01',
      targetMetric: 'Cluster-Wide Latency Distribution Drift',
      metricId: 'rtt_ms',
      targetEntity: 'Compute Leaf Tier -> Database Core',
      potentialImpact: 'Systemic Slowdown: Cumulative queuing delay across cross-connect links will elevate database query RTT by 40%.',
      horizonMinutes: 30,
      detectorName: 'forecast_residual',
      detectorLabel: 'Forecast-Residual Drift Detector',
      detectorScore: 0.62,
      scoreBadgeLabel: 'ILLUSTRATIVE SCORE — NOT CALIBRATED',
      threshold: 0.70,
      predictedImpact: false,
      isSustained: false,
      reliabilityState: 'PREDICT',
      evidence: {
        baselineMean: '18.2 ms',
        currentValue: '26.8 ms',
        residualDelta: '+8.6 ms',
        consecutiveBreaches: 1,
        driftPValue: 0.18,
        sensorCompleteness: '94.0% valid observations',
        methodology: 'Trend trajectory projected across 360 observation steps; score remains below decision threshold.'
      },
      limitations: [
        'Long-range 30-minute horizons carry substantial uncertainty bounds (+/- 14ms margin of error).',
        'Not recommended for automated remediation without manual operator verification.'
      ]
    }
  ]
};

export const GATE_DECISION_SCENARIOS: Record<'PREDICT' | 'DEGRADED' | 'ABSTAIN', GateDecisionRecord> = {
  PREDICT: {
    state: 'PREDICT',
    reasons: [
      'Telemetry completeness at 94.6% (> 85.0% requirement).',
      'Kolmogorov-Smirnov baseline drift test p-value = 0.42 (no statistically significant regime shift).',
      'Telemetry freshness within 5-second sampling threshold.'
    ],
    sensorHealthScore: 0.946,
    driftScore: 0.12,
    residualErrorScore: 0.08,
    suppressedMetrics: [],
    immediateAlertsActive: true,
    evaluatedAt: '14:04:15 UTC'
  },
  DEGRADED: {
    state: 'DEGRADED',
    reasons: [
      'Telemetry completeness at 82.1% (warning threshold 85.0%).',
      'Mild tail-variance drift detected on spine-01 (KS statistic = 0.28, p-value = 0.06).',
      'Predictions permitted with advisory caution badges.'
    ],
    sensorHealthScore: 0.821,
    driftScore: 0.28,
    residualErrorScore: 0.22,
    suppressedMetrics: ['interface_errors'],
    immediateAlertsActive: true,
    evaluatedAt: '14:04:15 UTC'
  },
  ABSTAIN: {
    state: 'ABSTAIN',
    reasons: [
      'CRITICAL: Telemetry ingestion gap > 30 seconds detected on leaf aggregation layer.',
      'Kolmogorov-Smirnov test p-value = 0.003 < 0.01 (severe distribution drift invalidates forecast baselines).',
      'HARD INVALIDATION: All predictive outputs are strictly withheld to prevent misleading operations.'
    ],
    sensorHealthScore: 0.612,
    driftScore: 0.68,
    residualErrorScore: 0.85,
    suppressedMetrics: ['rtt_ms', 'jitter_ms', 'packet_loss_pct', 'throughput_mbps', 'interface_errors'],
    immediateAlertsActive: true,
    evaluatedAt: '14:04:15 UTC'
  }
};
