import React from 'react';
import { AlertCircle, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { IncidentRecord, IncidentStatus } from '../types';

interface IncidentSummaryCardsProps {
  incidents: IncidentRecord[];
  selectedStatus: IncidentStatus | 'ALL';
  onSelectStatus: (status: IncidentStatus | 'ALL') => void;
}

export const IncidentSummaryCards: React.FC<IncidentSummaryCardsProps> = ({
  incidents,
  selectedStatus,
  onSelectStatus
}) => {
  const counts = {
    ALL: incidents.length,
    OPEN: incidents.filter(i => i.status === 'OPEN').length,
    INVESTIGATING: incidents.filter(i => i.status === 'INVESTIGATING').length,
    ACKNOWLEDGED: incidents.filter(i => i.status === 'ACKNOWLEDGED').length,
    RESOLVED: incidents.filter(i => i.status === 'RESOLVED').length,
  };

  const cards: Array<{
    status: IncidentStatus | 'ALL';
    label: string;
    count: number;
    icon: typeof AlertCircle;
    color: string;
    bg: string;
    border: string;
  }> = [
    {
      status: 'INVESTIGATING',
      label: 'Investigating',
      count: counts.INVESTIGATING,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30'
    },
    {
      status: 'OPEN',
      label: 'Open / Unassigned',
      count: counts.OPEN,
      icon: AlertCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30'
    },
    {
      status: 'ACKNOWLEDGED',
      label: 'Acknowledged',
      count: counts.ACKNOWLEDGED,
      icon: ShieldCheck,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30'
    },
    {
      status: 'RESOLVED',
      label: 'Resolved',
      count: counts.RESOLVED,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const isSelected = selectedStatus === c.status;
        const Icon = c.icon;
        return (
          <button
            key={c.status}
            onClick={() => onSelectStatus(isSelected ? 'ALL' : c.status)}
            className={`flex items-center justify-between rounded-xl border p-3 text-left backdrop-blur-xl transition-all duration-200 shadow-glass-panel ${
              isSelected
                ? `${c.border} ${c.bg} ring-1 ring-precursor-cyan/50 shadow-glow-cyan/20`
                : 'border-white/[0.08] bg-precursor-card-glass hover:border-precursor-purple/40 hover:bg-precursor-surface/60'
            }`}
          >
            <div>
              <span className="text-xs font-semibold text-slate-300">
                {c.label}
              </span>
              <div className={`mt-0.5 font-mono text-2xl font-extrabold ${c.color}`}>
                {c.count}
              </div>
            </div>
            <div className={`rounded-xl p-2 ${c.bg} border ${c.border}`}>
              <Icon className={`h-4 w-4 ${c.color}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
