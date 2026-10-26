import React from 'react';
import {
  Activity,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Shuffle,
  GitBranch,
  Radio,
  RefreshCw,
} from 'lucide-react';
import type { ScenarioDefinition, ScenarioId } from '../types';

const iconMap: Record<string, React.ElementType> = {
  Activity,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Shuffle,
  GitBranch,
  Radio,
  RefreshCw,
};

interface ScenarioCardProps {
  scenario: ScenarioDefinition;
  isSelected: boolean;
  onSelect: (id: ScenarioId) => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  isSelected,
  onSelect,
}) => {
  const Icon = iconMap[scenario.icon] ?? Activity;
  const maxIntensity = Math.max(...scenario.miniTimeline.map((t) => t.intensity));

  return (
    <button
      type="button"
      onClick={() => onSelect(scenario.id)}
      aria-pressed={isSelected}
      className={`group relative flex flex-col rounded-xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-precursor-purple ${
        isSelected
          ? 'border-precursor-purple bg-precursor-violet/30 shadow-glow-purple'
          : 'border-precursor-border bg-precursor-card/60 hover:border-precursor-border-active hover:bg-precursor-card/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            isSelected
              ? 'border-precursor-purple/50 bg-precursor-purple/20 text-precursor-purple'
              : 'border-precursor-border bg-precursor-surface text-slate-400 group-hover:text-precursor-cyan'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{scenario.name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            {scenario.description}
          </p>
        </div>
      </div>

      {/* Metric Types */}
      <div className="mt-3 flex flex-wrap gap-1">
        {scenario.metricTypes.map((m) => (
          <span
            key={m}
            className="rounded border border-precursor-border bg-precursor-surface/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Challenge */}
      <p className="mt-2.5 text-[11px] leading-snug text-slate-500">
        <span className="font-semibold text-slate-400">Challenge:</span>{' '}
        {scenario.expectedChallenge}
      </p>

      {/* Mini Timeline */}
      <div className="mt-3 flex items-end gap-[3px]" aria-label="Illustrative timeline">
        {scenario.miniTimeline.map((point, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-sm transition-colors ${
                isSelected ? 'bg-precursor-purple' : 'bg-slate-600 group-hover:bg-precursor-cyan/60'
              }`}
              style={{
                height: `${Math.max(4, (point.intensity / maxIntensity) * 32)}px`,
                opacity: 0.4 + (point.intensity / maxIntensity) * 0.6,
              }}
            />
            <span className="text-[9px] text-slate-500">{point.label}</span>
          </div>
        ))}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -right-px -top-px rounded-bl-lg rounded-tr-xl bg-precursor-purple px-2 py-0.5 font-mono text-[9px] font-bold text-white">
          SELECTED
        </div>
      )}
    </button>
  );
};
