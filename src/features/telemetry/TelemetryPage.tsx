import React, { useState, useMemo, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Radio } from 'lucide-react';
import { TelemetryControls } from './components/TelemetryControls';
import { TelemetryMetricCards } from './components/TelemetryMetricCards';
import { TelemetryChartSection } from './components/TelemetryChartSection';
import { CustomIngestModal } from './components/CustomIngestModal';
import { 
  INITIAL_METRIC_SUMMARIES, 
  DETERMINISTIC_TELEMETRY_SERIES, 
  TELEMETRY_EVENT_WINDOWS, 
  TELEMETRY_QUALITY_AUDIT 
} from './fixtures/telemetryFixture';
import { TimeRange, MetricId, NetworkSegment, MetricSummary, DataQualityAudit, TelemetryPointRecord, MetricQuality } from './types';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const TelemetryPage: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('5m');
  const [selectedMetric, setSelectedMetric] = useState<MetricId | 'all'>('all');
  const [selectedSegment, setSelectedSegment] = useState<NetworkSegment>('all');
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';
  const operatingMode = useAppStore((s) => s.operatingMode);
  const targetHost = useAppStore((s) => s.targetHost);
  const targetPort = useAppStore((s) => s.targetPort);
  const interfaceId = useAppStore((s) => s.interfaceId);

  const [metrics, setMetrics] = useState<MetricSummary[]>(INITIAL_METRIC_SUMMARIES);
  const [qualityAudit, setQualityAudit] = useState<DataQualityAudit>(TELEMETRY_QUALITY_AUDIT);
  const [livePoints, setLivePoints] = useState<TelemetryPointRecord[]>([]);

  const fetchLiveMetrics = async () => {
    try {
      const status = await apiClient.fetchStatus();
      if (!status) return;

      const latest = status.latest_metrics || {};
      const q = status.quality_stats || {};

      setMetrics((prev) =>
        prev.map((m) => {
          if (m.id === 'rtt_ms' && latest.latency_ms != null) {
            return { ...m, currentValue: Number(latest.latency_ms) };
          }
          if (m.id === 'jitter_ms' && latest.jitter_ms != null) {
            return { ...m, currentValue: Number(latest.jitter_ms) };
          }
          if (m.id === 'packet_loss_pct' && latest.packet_loss_pct != null) {
            return { ...m, currentValue: Number(latest.packet_loss_pct) };
          }
          if (m.id === 'throughput_mbps' && latest.throughput_mbps != null) {
            return { ...m, currentValue: Number(latest.throughput_mbps) };
          }
          if (m.id === 'packets_in_sec' && (latest.packets_in_sec != null || latest.rx_packets_sec != null)) {
            return { ...m, currentValue: Number(latest.packets_in_sec ?? latest.rx_packets_sec) };
          }
          if (m.id === 'packets_out_sec' && (latest.packets_out_sec != null || latest.tx_packets_sec != null)) {
            return { ...m, currentValue: Number(latest.packets_out_sec ?? latest.tx_packets_sec) };
          }
          if (m.id === 'interface_errors' && latest.drops_in != null) {
            return { ...m, currentValue: Number(latest.drops_in) };
          }
          return m;
        })
      );

      if (q.total_points != null) {
        const total = Number(q.total_points) || 1;
        const goodRatio = q.good_ratio ?? 1.0;
        setQualityAudit((prev) => ({
          ...prev,
          totalObservations: total,
          healthyCount: Math.round(total * goodRatio),
          missingCount: Math.round(total * (q.missing_ratio ?? 0)),
          staleCount: Math.round(total * (q.stale_ratio ?? 0)),
          invalidCount: Math.round(total * (q.invalid_ratio ?? 0)),
          sensorHealthScore: Number(goodRatio.toFixed(3)),
        }));
      }

      // In Live Mode, fetch real time-series from backend buffer
      if (operatingMode === 'live') {
        const windowSec = selectedRange === '1h' ? 3600 : selectedRange === '30m' ? 1800 : selectedRange === '15m' ? 900 : 300;
        const telemRes = await apiClient.fetchTelemetry(windowSec);
        if (telemRes && Array.isArray(telemRes.points)) {
          const groups = new Map<number, Partial<TelemetryPointRecord>>();
          for (const pt of telemRes.points) {
            if (pt.source && pt.source === 'synthetic') continue;
            const t = Math.round(Number(pt.timestamp));
            if (!groups.has(t)) {
              const d = new Date(t * 1000);
              const timeLabel = d.toTimeString().split(' ')[0];
              groups.set(t, {
                id: `live-${t}`,
                timestamp: t,
                timeLabel,
                rtt_ms: null,
                jitter_ms: null,
                packet_loss_pct: null,
                throughput_mbps: null,
                packets_in_sec: null,
                packets_out_sec: null,
                icmp_inbound_rate: null,
                interface_errors: null,
                quality: (pt.quality as MetricQuality) || 'good',
                segment: 'edge-gateway',
              });
            }
            const entry = groups.get(t)!;
            const val = pt.value != null ? Number(pt.value) : null;
            if (pt.metric_id === 'latency_ms' || pt.metric_id === 'rtt_ms') {
              entry.rtt_ms = val;
            } else if (pt.metric_id === 'jitter_ms') {
              entry.jitter_ms = val;
            } else if (pt.metric_id === 'packet_loss_pct') {
              entry.packet_loss_pct = val;
            } else if (pt.metric_id === 'throughput_mbps') {
              entry.throughput_mbps = val;
            } else if (pt.metric_id === 'packets_in_sec' || pt.metric_id === 'rx_packets_sec') {
              entry.packets_in_sec = val;
            } else if (pt.metric_id === 'packets_out_sec' || pt.metric_id === 'tx_packets_sec') {
              entry.packets_out_sec = val;
            } else if (pt.metric_id === 'icmp_inbound_rate') {
              entry.icmp_inbound_rate = val;
            } else if (pt.metric_id === 'drops_in' || pt.metric_id === 'interface_errors') {
              entry.interface_errors = val;
            }
          }
          const converted = Array.from(groups.values()).sort(
            (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
          ) as TelemetryPointRecord[];
          setLivePoints(converted);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!isConnected) {
      if (operatingMode !== 'live') {
        setMetrics(INITIAL_METRIC_SUMMARIES);
        setQualityAudit(TELEMETRY_QUALITY_AUDIT);
      }
      return;
    }

    fetchLiveMetrics();
    const timer = setInterval(fetchLiveMetrics, 3000);
    return () => {
      clearInterval(timer);
    };
  }, [isConnected, operatingMode, selectedRange]);

  // Filter time series data based on selections
  const filteredData = useMemo(() => {
    if (operatingMode === 'live') {
      // In Live Mode, strictly use live points captured from physical probe traffic
      return livePoints;
    }

    let dataset = DETERMINISTIC_TELEMETRY_SERIES;

    // Filter by network segment if selected
    if (selectedSegment !== 'all') {
      dataset = dataset.filter(d => d.segment === selectedSegment);
    }

    // Filter by time range (illustrative slicing)
    if (selectedRange === '5m') {
      return dataset;
    } else if (selectedRange === '15m') {
      return dataset.slice(-45);
    } else if (selectedRange === '30m') {
      return dataset.slice(-30);
    } else {
      return dataset.slice(-20);
    }
  }, [operatingMode, livePoints, selectedRange, selectedSegment]);

  const handleResetFilters = () => {
    setSelectedRange('5m');
    setSelectedMetric('all');
    setSelectedSegment('all');
  };

  return (
    <PageContainer
      title={operatingMode === 'live' ? `Live Telemetry Stream • ${targetHost}:${targetPort}` : "Telemetry Explorer & Time-Series Stream"}
      subtitle={operatingMode === 'live' 
        ? `Real-time physical network telemetry probed on local interface ${interfaceId} targeting secondary PC ${targetHost}:${targetPort}. Synthetic datasets are strictly excluded.`
        : "5-second granularity network telemetry observation buffer across Spine-Leaf fabric nodes with real-time sensor quality verification."
      }
      action={
        operatingMode === 'live' ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold animate-pulse">
            <Radio className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>LIVE HARDWARE PROBE: {targetHost}:{targetPort}</span>
          </span>
        ) : isConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-700 dark:text-emerald-400">
            <Radio className="h-3 w-3" />
            <span>Connected (Synthetic Engine)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-1 font-mono text-xs text-slate-600 dark:text-slate-400">
            <span>Illustrative Demonstration Fixtures</span>
          </span>
        )
      }
    >
      <div className="space-y-6">
        {/* Live Mode Target Banner */}
        {operatingMode === 'live' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Bidirectional Server Telemetry • Monitored NIC: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{interfaceId || 'auto'}</span> • Outbound Target: <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold">{targetHost}:{targetPort}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Monitoring incoming RX packet flow, burst floods, and kernel buffer drops alongside active outbound probe RTT and packet loss.
                </p>
              </div>
            </div>
            {livePoints.length === 0 && (
              <span className="text-xs font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 px-2.5 py-1 rounded-md font-medium">
                Awaiting probe samples... Click "Sample Now" or enable auto-stream
              </span>
            )}
          </div>
        )}

        {/* Filter Toolbar */}
        <TelemetryControls
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          selectedSegment={selectedSegment}
          onSegmentChange={setSelectedSegment}
          onResetFilters={handleResetFilters}
          onOpenIngest={() => setIsIngestModalOpen(true)}
        />

        {/* 6 Overview Metric Cards */}
        <TelemetryMetricCards
          metrics={metrics}
          qualityAudit={qualityAudit}
          selectedMetric={selectedMetric}
          onSelectMetric={(id) => setSelectedMetric(selectedMetric === id ? 'all' : id)}
        />

        {/* Interactive Charts Section (Recharts) */}
        <TelemetryChartSection
          data={filteredData}
          selectedMetric={selectedMetric}
          eventWindows={operatingMode === 'live' ? [] : TELEMETRY_EVENT_WINDOWS}
          timeRange={selectedRange}
        />

        {/* Custom Telemetry Ingest Modal */}
        <CustomIngestModal
          isOpen={isIngestModalOpen}
          onClose={() => setIsIngestModalOpen(false)}
          onIngestSuccess={fetchLiveMetrics}
        />
      </div>
    </PageContainer>
  );
};
