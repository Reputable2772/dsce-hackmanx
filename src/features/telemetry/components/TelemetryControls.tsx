import React from 'react';
import { Database, RotateCcw } from 'lucide-react';
import { TimeRange, MetricId, NetworkSegment } from '../types';

interface TelemetryControlsProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  selectedMetric: MetricId | 'all';
  onMetricChange: (metric: MetricId | 'all') => void;
  selectedSegment: NetworkSegment;
  onSegmentChange: (segment: NetworkSegment) => void;
  onResetFilters: () => void;
}

export const TelemetryControls: React.FC<TelemetryControlsProps> = ({
  selectedRange,
  onRangeChange,
  selectedMetric,
  onMetricChange,
  selectedSegment,
  onSegmentChange,
  onResetFilters
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-violet-900/40 bg-navy-900/60 p-4 backdrop-blur-md">
      {/* Filters group */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Metric Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Metric:</span>
          <select
            value={selectedMetric}
            onChange={(e) => onMetricChange(e.target.value as MetricId | 'all')}
            className="rounded-lg border border-violet-800/50 bg-navy-950 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none transition focus:border-cyan-400"
          >
            <option value="all">All Primary Metrics</option>
            <option value="rtt_ms">Round-Trip Latency (ms)</option>
            <option value="packet_loss_pct">Packet Loss (%)</option>
            <option value="throughput_mbps">Throughput (Mbps)</option>
            <option value="jitter_ms">Transit Jitter (ms)</option>
            <option value="interface_errors">Interface Errors (pkts/s)</option>
          </select>
        </div>

        {/* Network Segment Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Segment:</span>
          <select
            value={selectedSegment}
            onChange={(e) => onSegmentChange(e.target.value as NetworkSegment)}
            className="rounded-lg border border-violet-800/50 bg-navy-950 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none transition focus:border-cyan-400"
          >
            <option value="all">All Fabric Segments</option>
            <option value="core-spines">Core Spines (spine-01/02)</option>
            <option value="aggregation-leaves">Aggregation Leaves (leaf-01..04)</option>
            <option value="edge-gateway">Edge Gateway</option>
            <option value="access-servers">Access Server Clusters</option>
          </select>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Time Range:</span>
          <div className="flex rounded-lg border border-violet-800/50 bg-navy-950 p-0.5">
            {(['5m', '15m', '30m', '1h'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => onRangeChange(r)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  selectedRange === r
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Controls: Demo tag & Reset */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-300">
          <Database className="h-3.5 w-3.5 text-cyan-400" />
          <span>DEMO DATA (5s Interval)</span>
        </div>

        <button
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          title="Reset to default filters"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  );
};
