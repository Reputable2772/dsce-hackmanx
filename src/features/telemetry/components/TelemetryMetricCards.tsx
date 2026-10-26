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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 text-[#202938]">
      {metrics.map((metric) => {
        const isSelected = selectedMetric === metric.id;
        const isWarning = metric.currentValue !== null && metric.currentValue >= metric.thresholdWarning;
        const isCritical = metric.currentValue !== null && metric.currentValue >= metric.thresholdCritical;

        return (
          <div
            key={metric.id}
            onClick={() => onSelectMetric(metric.id)}
            className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all duration-150 ${
              isSelected
                ? 'border-[#5267D8] bg-[#EEF2FF]/50 ring-1 ring-[#5267D8] shadow-xs'
                : 'border-[#E3E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-xs'
            }`}
          >
            {/* Header: Label & Tooltip */}
            <div className="flex items-start justify-between gap-1">
              <span className="text-xs font-semibold text-[#687386] group-hover:text-[#202938] transition-colors">
                {metric.label}
              </span>
              <span title={metric.description} className="cursor-help text-slate-400 hover:text-slate-600">
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* Value & Unit */}
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`font-mono text-2xl font-extrabold tracking-tight ${
                  isCritical 
                    ? 'text-rose-600' 
                    : isWarning 
                    ? 'text-amber-600' 
                    : 'text-[#202938]'
                }`}>
                  {metric.currentValue !== null ? metric.currentValue : '—'}
                </span>
                <span className="font-mono text-xs text-[#687386] font-semibold">
                  {metric.unit}
                </span>
              </div>

              {/* P95 Indicator if available */}
              {metric.p95Value !== undefined && (
                <div className="mt-0.5 text-[10px] font-mono text-[#687386]">
                  P95: <span className="text-[#202938] font-semibold">{metric.p95Value} {metric.unit}</span>
                </div>
              )}
            </div>

            {/* Footer: Trend & Threshold status */}
            <div className="flex items-center justify-between border-t border-[#E3E8F0] pt-2 text-[11px]">
              <div className="flex items-center gap-1 font-mono">
                {metric.trend === 'up' ? (
                  <ArrowUpRight className={`h-3 w-3 ${metric.id === 'throughput_mbps' ? 'text-emerald-600' : 'text-amber-600'}`} />
                ) : metric.trend === 'down' ? (
                  <ArrowDownRight className={`h-3 w-3 ${metric.id === 'throughput_mbps' ? 'text-amber-600' : 'text-emerald-600'}`} />
                ) : (
                  <Minus className="h-3 w-3 text-slate-400" />
                )}
                <span className={metric.trend === 'stable' ? 'text-[#94A3B8]' : 'text-[#687386]'}>
                  {metric.trendPct > 0 ? `+${metric.trendPct}%` : `${metric.trendPct}%`}
                </span>
              </div>

              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                isCritical 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : isWarning 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isCritical ? 'CRITICAL' : isWarning ? 'ELEVATED' : 'NOMINAL'}
              </span>
            </div>
          </div>
        );
      })}

      {/* 6th Card: Sensor Health & Quality */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-xs">
        <div className="flex items-start justify-between gap-1">
          <span className="text-xs font-semibold text-[#687386]">
            Sensor Completeness
          </span>
          <span title="Aggregate percentage of valid, timely telemetry observations received across 5s polling windows." className="cursor-help text-slate-400 hover:text-slate-600">
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-extrabold tracking-tight text-emerald-600">
              {(qualityAudit.sensorHealthScore * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-0.5 text-[10px] font-mono text-[#687386]">
            {qualityAudit.healthyCount} / {qualityAudit.totalObservations} valid pts
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#E3E8F0] pt-2 text-[11px]">
          <div className="flex items-center gap-1 font-mono text-[#687386]">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>5s rate</span>
          </div>

          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700">
            VALIDATED
          </span>
        </div>
      </div>
    </div>
  );
};
