import React, { useState, useMemo } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { TelemetryControls } from './components/TelemetryControls';
import { TelemetryMetricCards } from './components/TelemetryMetricCards';
import { TelemetryChartSection } from './components/TelemetryChartSection';
import { DataQualityPanel } from './components/DataQualityPanel';
import { 
  INITIAL_METRIC_SUMMARIES, 
  DETERMINISTIC_TELEMETRY_SERIES, 
  TELEMETRY_EVENT_WINDOWS, 
  TELEMETRY_QUALITY_AUDIT 
} from './fixtures/telemetryFixture';
import { TimeRange, MetricId, NetworkSegment } from './types';

export const TelemetryPage: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('5m');
  const [selectedMetric, setSelectedMetric] = useState<MetricId | 'all'>('all');
  const [selectedSegment, setSelectedSegment] = useState<NetworkSegment>('all');

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
        />

        {/* 6 Overview Metric Cards */}
        <TelemetryMetricCards
          metrics={INITIAL_METRIC_SUMMARIES}
          qualityAudit={TELEMETRY_QUALITY_AUDIT}
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
        <DataQualityPanel audit={TELEMETRY_QUALITY_AUDIT} />
      </div>
    </PageContainer>
  );
};
