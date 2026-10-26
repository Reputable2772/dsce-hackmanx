import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  HelpCircle, 
  CheckCircle2
} from 'lucide-react';
import { MetricSummary, DataQualityAudit } from '../types';

interface TelemetryMetricCardsProps {
  metrics: MetricSummary[];
  qualityAudit: DataQualityAudit;
  selectedMetric: string;
  onSelectMetric: (metricId: any) => void;
}

export const TelemetryMetricCards: React.FC<TelemetryMetricCardsProps> = ({
  metrics,
  qualityAudit,
  selectedMetric,
  onSelectMetric
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => {
        const isSelected = selectedMetric === metric.id;
        const isWarning = metric.currentValue !== null && metric.currentValue >= metric.thresholdWarning;
        const isCritical = metric.currentValue !== null && metric.currentValue >= metric.thresholdCritical;

        return (
          <div
            key={metric.id}
            onClick={() => onSelectMetric(metric.id)}
            className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 backdrop-blur-xl transition-all duration-200 ${
              isSelected
                ? 'border-precursor-cyan bg-precursor-surface/90 shadow-glow-cyan/20 ring-1 ring-precursor-cyan/60'
                : 'border-white/[0.08] bg-precursor-card-glass hover:border-precursor-purple/40 hover:bg-precursor-surface/60'
            }`}
          >
            {/* Header: Label & Tooltip */}
            <div className="flex items-start justify-between gap-1">
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                {metric.label}
              </span>
              <span title={metric.description} className="cursor-help text-slate-500 hover:text-slate-300">
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* Value & Unit */}
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`font-mono text-2xl font-extrabold tracking-tight ${
                  isCritical 
                    ? 'text-rose-400 text-glow-coral' 
                    : isWarning 
                    ? 'text-amber-400 text-glow-amber' 
                    : 'text-white'
                }`}>
                  {metric.currentValue !== null ? metric.currentValue : '—'}
                </span>
                <span className="font-mono text-xs text-slate-400 font-semibold">
                  {metric.unit}
                </span>
              </div>

              {/* P95 Indicator if available */}
              {metric.p95Value !== undefined && (
                <div className="mt-0.5 text-[10px] font-mono text-slate-400">
                  P95: <span className="text-slate-300 font-semibold">{metric.p95Value} {metric.unit}</span>
                </div>
              )}
            </div>

            {/* Footer: Trend & Threshold status */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px]">
              <div className="flex items-center gap-1 font-mono">
                {metric.trend === 'up' ? (
                  <ArrowUpRight className={`h-3 w-3 ${metric.id === 'throughput_mbps' ? 'text-emerald-400' : 'text-amber-400'}`} />
                ) : metric.trend === 'down' ? (
                  <ArrowDownRight className={`h-3 w-3 ${metric.id === 'throughput_mbps' ? 'text-amber-400' : 'text-emerald-400'}`} />
                ) : (
                  <Minus className="h-3 w-3 text-slate-400" />
                )}
                <span className={metric.trend === 'stable' ? 'text-slate-400' : 'text-slate-300'}>
                  {metric.trendPct > 0 ? `+${metric.trendPct}%` : `${metric.trendPct}%`}
                </span>
              </div>

              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                isCritical 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                  : isWarning 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {isCritical ? 'CRITICAL' : isWarning ? 'ELEVATED' : 'NOMINAL'}
              </span>
            </div>
          </div>
        );
      })}

      {/* 6th Card: Sensor Health & Quality */}
      <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-precursor-card-glass p-3.5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-1">
          <span className="text-xs font-semibold text-slate-300">
            Sensor Completeness
          </span>
          <span title="Aggregate percentage of valid, timely telemetry observations received across 5s polling windows." className="cursor-help text-slate-500 hover:text-slate-300">
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-extrabold tracking-tight text-emerald-400">
              {(qualityAudit.sensorHealthScore * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-0.5 text-[10px] font-mono text-slate-400">
            {qualityAudit.healthyCount} / {qualityAudit.totalObservations} valid pts
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px]">
          <div className="flex items-center gap-1 font-mono text-slate-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>5s rate</span>
          </div>

          <span className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
            VALIDATED
          </span>
        </div>
      </div>
    </div>
  );
};
