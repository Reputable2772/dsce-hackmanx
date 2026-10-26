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
            className={`flex items-center justify-between rounded-xl border p-3.5 text-left backdrop-blur-md transition-all duration-200 ${
              isSelected
                ? `${c.border} ${c.bg} ring-1 ring-cyan-400/50 shadow-[0_0_12px_rgba(72,221,245,0.15)]`
                : 'border-violet-900/40 bg-navy-900/60 hover:border-violet-700/60 hover:bg-navy-800/40'
            }`}
          >
            <div>
              <span className="text-xs font-semibold text-slate-300">
                {c.label}
              </span>
              <div className={`mt-1 font-mono text-2xl font-bold ${c.color}`}>
                {c.count}
              </div>
            </div>
            <div className={`rounded-lg p-2 ${c.bg} border ${c.border}`}>
              <Icon className={`h-5 w-5 ${c.color}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
