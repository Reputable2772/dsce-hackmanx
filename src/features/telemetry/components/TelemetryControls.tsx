import React from 'react';
import { Database, RotateCcw, UploadCloud } from 'lucide-react';
import { TimeRange, MetricId, NetworkSegment } from '../types';

interface TelemetryControlsProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  selectedMetric: MetricId | 'all';
  onMetricChange: (metric: MetricId | 'all') => void;
  selectedSegment: NetworkSegment;
  onSegmentChange: (segment: NetworkSegment) => void;
  onResetFilters: () => void;
  onOpenIngest?: () => void;
}

export const TelemetryControls: React.FC<TelemetryControlsProps> = ({
  selectedRange,
  onRangeChange,
  selectedMetric,
  onMetricChange,
  selectedSegment,
  onSegmentChange,
  onResetFilters,
  onOpenIngest,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm text-[#202938]">
      {/* Filters group */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Metric Selector */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="font-semibold text-[#687386]">Metric:</span>
          <select
            value={selectedMetric}
            onChange={(e) => onMetricChange(e.target.value as MetricId | 'all')}
            className="rounded-lg border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#202938] outline-none transition hover:border-[#CBD5E1] focus:border-[#5267D8]"
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
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="font-semibold text-[#687386]">Segment:</span>
          <select
            value={selectedSegment}
            onChange={(e) => onSegmentChange(e.target.value as NetworkSegment)}
            className="rounded-lg border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#202938] outline-none transition hover:border-[#CBD5E1] focus:border-[#5267D8]"
          >
            <option value="all">All Monitored Segments</option>
            <option value="core-spines">Core Spines</option>
            <option value="aggregation-leaves">Aggregation Leaves</option>
            <option value="edge-gateway">Edge Gateway</option>
            <option value="access-servers">Access Server Clusters</option>
          </select>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="font-semibold text-[#687386]">Window:</span>
          <div className="flex rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-0.5">
            {(['5m', '15m', '30m', '1h'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => onRangeChange(r)}
                className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                  selectedRange === r
                    ? 'bg-[#5267D8] text-white shadow-xs'
                    : 'text-[#687386] hover:text-[#202938]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Controls: Ingest modal trigger, Granularity tag & Reset */}
      <div className="flex items-center gap-2 font-mono text-xs">
        {onOpenIngest && (
          <button
            type="button"
            onClick={onOpenIngest}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-[#5267D8] hover:bg-indigo-100 transition shadow-xs"
            title="Inject custom telemetry point directly into buffer"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Ingest Point</span>
          </button>
        )}

        <div className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 font-semibold text-teal-700">
          <Database className="h-3.5 w-3.5 text-teal-600" />
          <span>5s Granularity</span>
        </div>

        <button
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#687386] transition hover:bg-[#F8FAFC] hover:text-[#202938]"
          title="Reset to default filters"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
