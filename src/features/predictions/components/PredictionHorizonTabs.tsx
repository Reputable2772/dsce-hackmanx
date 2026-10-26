import React from 'react';
import { Clock } from 'lucide-react';
import { PredictionHorizon } from '../types';

interface PredictionHorizonTabsProps {
  selectedHorizon: PredictionHorizon;
  onHorizonChange: (horizon: PredictionHorizon) => void;
  counts: Record<PredictionHorizon, number>;
}

export const PredictionHorizonTabs: React.FC<PredictionHorizonTabsProps> = ({
  selectedHorizon,
  onHorizonChange,
  counts
}) => {
  const horizons: { id: PredictionHorizon; label: string; desc: string }[] = [
    { id: 5, label: '+5 Minutes', desc: 'Short-range microburst & queue surge forecasts' },
    { id: 15, label: '+15 Minutes', desc: 'Medium-range sustained SLA & loss trajectory' },
    { id: 30, label: '+30 Minutes', desc: 'Long-range systemic trend & cross-connect drift' }
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-precursor-card-glass p-2 backdrop-blur-xl shadow-glass-panel">
      <div className="flex items-center gap-2 px-3">
        <Clock className="h-4 w-4 text-precursor-purple" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
          Horizon Lookahead:
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1 max-w-2xl">
        {horizons.map((h) => {
          const isSelected = selectedHorizon === h.id;
          return (
            <button
              key={h.id}
              onClick={() => onHorizonChange(h.id)}
              className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 text-xs font-mono transition-all duration-200 ${
                isSelected
                  ? 'border border-precursor-purple/60 bg-precursor-violet/60 text-white shadow-glow-purple/20'
                  : 'border border-transparent text-slate-400 hover:border-white/[0.1] hover:bg-precursor-surface/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight">{h.label}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected ? 'bg-precursor-purple text-navy-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}>
                  {counts[h.id]}
                </span>
              </div>
              <span className="hidden sm:inline text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                {h.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
