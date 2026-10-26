import React from 'react';
import { MetricQuality } from '@/types/telemetry';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  quality?: MetricQuality;
  isPlaceholder?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  quality = 'good',
  isPlaceholder = false,
  icon,
  subtitle,
  className = '',
}) => {
  const qualityBadge = {
    good: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    stale: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    missing: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    invalid: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  }[quality];

  return (
    <div
      className={`rounded-xl border border-precursor-border bg-precursor-card/80 p-4 backdrop-blur-md transition-all hover:border-precursor-border-active hover:shadow-glow-purple/10 ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5">
          {icon && <span className="text-precursor-purple">{icon}</span>}
          {title}
        </span>
        {isPlaceholder ? (
          <span className="rounded border border-slate-700/60 bg-slate-800/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            DEMO
          </span>
        ) : (
          <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${qualityBadge}`}>
            {quality}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold tracking-tight text-white">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {subtitle && (
        <div className="mt-1.5 text-xs text-slate-400/80">
          {subtitle}
        </div>
      )}
    </div>
  );
};
