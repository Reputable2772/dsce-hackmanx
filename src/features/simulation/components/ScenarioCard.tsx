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
      className={`group relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5267D8] ${
        isSelected
          ? 'border-[#5267D8] bg-[#EEF2FF]/60 shadow-xs ring-1 ring-[#5267D8]'
          : 'border-[#E3E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC] shadow-xs'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            isSelected
              ? 'border-indigo-200 bg-[#EEF2FF] text-[#5267D8]'
              : 'border-[#E3E8F0] bg-[#F8FAFC] text-[#687386] group-hover:text-[#5267D8]'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#202938]">{scenario.name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[#687386] line-clamp-2">
            {scenario.description}
          </p>
        </div>
      </div>

      {/* Metric Types */}
      <div className="mt-3 flex flex-wrap gap-1">
        {scenario.metricTypes.map((m) => (
          <span
            key={m}
            className="rounded-md border border-[#E3E8F0] bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] text-[#687386]"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Challenge */}
      <p className="mt-2.5 text-[11px] leading-snug text-[#687386]">
        <span className="font-semibold text-[#202938]">Challenge:</span>{' '}
        {scenario.expectedChallenge}
      </p>

      {/* Mini Timeline */}
      <div className="mt-3 flex items-end gap-[3px]" aria-label="Illustrative timeline">
        {scenario.miniTimeline.map((point, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-xs transition-colors ${
                isSelected ? 'bg-[#5267D8]' : 'bg-slate-300 group-hover:bg-[#5267D8]/60'
              }`}
              style={{
                height: `${Math.max(4, (point.intensity / maxIntensity) * 32)}px`,
                opacity: 0.4 + (point.intensity / maxIntensity) * 0.6,
              }}
            />
            <span className="text-[9px] text-[#687386]">{point.label}</span>
          </div>
        ))}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -right-px -top-px rounded-bl-lg rounded-tr-xl bg-[#5267D8] px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs">
          ACTIVE
        </div>
      )}
    </button>
  );
};
