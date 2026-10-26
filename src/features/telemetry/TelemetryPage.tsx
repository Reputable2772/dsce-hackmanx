import React, { useState, useMemo, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Radio } from 'lucide-react';
import { TelemetryControls } from './components/TelemetryControls';
import { TelemetryMetricCards } from './components/TelemetryMetricCards';
import { TelemetryChartSection } from './components/TelemetryChartSection';
import { DataQualityPanel } from './components/DataQualityPanel';
import { CustomIngestModal } from './components/CustomIngestModal';
import { 
  INITIAL_METRIC_SUMMARIES, 
  DETERMINISTIC_TELEMETRY_SERIES, 
  TELEMETRY_EVENT_WINDOWS, 
  TELEMETRY_QUALITY_AUDIT 
} from './fixtures/telemetryFixture';
import { TimeRange, MetricId, NetworkSegment, MetricSummary, DataQualityAudit } from './types';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const TelemetryPage: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('5m');
  const [selectedMetric, setSelectedMetric] = useState<MetricId | 'all'>('all');
  const [selectedSegment, setSelectedSegment] = useState<NetworkSegment>('all');
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  const [metrics, setMetrics] = useState<MetricSummary[]>(INITIAL_METRIC_SUMMARIES);
  const [qualityAudit, setQualityAudit] = useState<DataQualityAudit>(TELEMETRY_QUALITY_AUDIT);

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
    } catch {}
  };

  useEffect(() => {
    if (!isConnected) {
      setMetrics(INITIAL_METRIC_SUMMARIES);
      setQualityAudit(TELEMETRY_QUALITY_AUDIT);
      return;
    }

    fetchLiveMetrics();
    const timer = setInterval(fetchLiveMetrics, 4000);
    return () => {
      clearInterval(timer);
    };
  }, [isConnected]);

  // Filter time series data based on selections
  const filteredData = useMemo(() => {
    let dataset = DETERMINISTIC_TELEMETRY_SERIES;

    // Filter by network segment if selected
    if (selectedSegment !== 'all') {
      dataset = dataset.filter(d => d.segment === selectedSegment);
    }

    // Filter by time range (illustrative slicing)
    if (selectedRange === '5m') {
      // return all 60 points of the 5-minute sampling window
      return dataset;
    } else if (selectedRange === '15m') {
      return dataset.slice(-45);
    } else if (selectedRange === '30m') {
      return dataset.slice(-30);
    } else {
      return dataset.slice(-20);
    }
  }, [selectedRange, selectedSegment]);

  const handleResetFilters = () => {
    setSelectedRange('5m');
    setSelectedMetric('all');
    setSelectedSegment('all');
  };

  return (
    <PageContainer
      title="Telemetry Explorer & Time-Series Stream"
      subtitle="5-second granularity network telemetry observation buffer across Spine-Leaf fabric nodes with real-time sensor quality verification."
      action={
        isConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400 animate-pulse">
            <Radio className="h-3 w-3" />
            <span>Live Telemetry Buffer (Python Engine)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1 font-mono text-xs text-slate-400">
            <span>Illustrative Demonstration Fixtures</span>
          </span>
        )
      }
    >
      <div className="space-y-6">
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
          eventWindows={TELEMETRY_EVENT_WINDOWS}
          timeRange={selectedRange}
        />

        {/* Data Quality & Invalidation Guard Panel */}
        <DataQualityPanel audit={qualityAudit} />

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
