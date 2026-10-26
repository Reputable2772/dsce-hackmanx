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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E3E8F0] bg-white p-3 shadow-sm text-[#202938]">
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-4 w-4 text-[#5267D8]" />
        <span className="text-xs font-bold text-[#687386] uppercase tracking-wider font-mono">
          Horizon Lookahead:
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 max-w-3xl">
        {horizons.map((h) => {
          const isSelected = selectedHorizon === h.id;
          return (
            <button
              key={h.id}
              onClick={() => onHorizonChange(h.id)}
              className={`flex flex-col items-center justify-center rounded-lg px-3 py-2 text-xs font-mono transition-all duration-150 ${
                isSelected
                  ? 'border border-[#5267D8] bg-[#EEF2FF] text-[#5267D8] shadow-xs'
                  : 'border border-[#E3E8F0] bg-white text-[#687386] hover:bg-[#F8FAFC] hover:text-[#202938]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs tracking-tight">{h.label}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected ? 'bg-[#5267D8] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}>
                  {counts[h.id] ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-[#687386] mt-0.5 truncate max-w-full text-center">
                {h.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
