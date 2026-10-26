import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { IncidentRecord, IncidentStatus, IncidentSeverity } from '../types';

interface IncidentSummaryCardsProps {
  incidents: IncidentRecord[];
  selectedStatus: IncidentStatus | 'ALL';
  onSelectStatus: (status: IncidentStatus | 'ALL') => void;
  selectedSeverity?: IncidentSeverity | 'ALL';
  onSelectSeverity?: (sev: IncidentSeverity | 'ALL') => void;
}

export const IncidentSummaryCards: React.FC<IncidentSummaryCardsProps> = ({
  incidents,
  selectedStatus,
  onSelectStatus,
  selectedSeverity,
  onSelectSeverity,
}) => {
  const safeIncidents = Array.isArray(incidents) ? incidents : [];

  // Strict calculations directly from real records
  const totalCount = safeIncidents.length;
  const activeCount = safeIncidents.filter((i) => i.status !== 'RESOLVED').length;
  const warningCount = safeIncidents.filter((i) => i.severity === 'WARNING').length;
  const resolvedCount = safeIncidents.filter((i) => i.status === 'RESOLVED').length;

  const cards = [
    {
      id: 'active',
      label: 'Active Incidents',
      count: totalCount > 0 ? activeCount : 0,
      icon: ShieldAlert,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      isActive: selectedStatus === 'OPEN' || selectedStatus === 'INVESTIGATING',
      onClick: () => {
        onSelectStatus(selectedStatus === 'OPEN' ? 'ALL' : 'OPEN');
      },
    },
    {
      id: 'warnings',
      label: 'Warnings',
      count: totalCount > 0 ? warningCount : 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      isActive: selectedSeverity === 'WARNING',
      onClick: () => {
        if (onSelectSeverity) {
          onSelectSeverity(selectedSeverity === 'WARNING' ? 'ALL' : 'WARNING');
        }
      },
    },
    {
      id: 'resolved',
      label: 'Resolved Incidents',
      count: totalCount > 0 ? resolvedCount : 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      isActive: selectedStatus === 'RESOLVED',
      onClick: () => {
        onSelectStatus(selectedStatus === 'RESOLVED' ? 'ALL' : 'RESOLVED');
      },
    },
    {
      id: 'total',
      label: 'Total Incidents',
      count: totalCount > 0 ? totalCount : 0,
      icon: AlertCircle,
      color: 'text-[#5267D8]',
      bg: 'bg-[#EEF2FF]',
      border: 'border-indigo-200',
      isActive: selectedStatus === 'ALL' && (!selectedSeverity || selectedSeverity === 'ALL'),
      onClick: () => {
        onSelectStatus('ALL');
        if (onSelectSeverity) onSelectSeverity('ALL');
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            onClick={c.onClick}
            className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-150 ${
              c.isActive
                ? `${c.border} ${c.bg} ring-2 ring-[#5267D8]/30 shadow-xs`
                : 'border-[#E3E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-xs'
            }`}
          >
            <div>
              <span className="text-xs font-semibold text-[#687386]">
                {c.label}
              </span>
              <div className={`mt-1 font-mono text-2xl font-extrabold ${c.color}`}>
                {c.count}
              </div>
            </div>
            <div className={`rounded-lg p-2.5 ${c.bg} border ${c.border}`}>
              <Icon className={`h-4 w-4 ${c.color}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
