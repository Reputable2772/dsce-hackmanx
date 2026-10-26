import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { GateState } from '@/types';

interface ReliabilityStatusBadgeProps {
  state?: GateState;
  className?: string;
}

export const ReliabilityStatusBadge: React.FC<ReliabilityStatusBadgeProps> = ({
  state = 'PREDICT',
  className = '',
}) => {
  const configs: Record<GateState, { label: string; icon: typeof ShieldCheck; color: string; border: string; bg: string }> = {
    PREDICT: {
      label: 'PREDICT',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
    },
    DEGRADED: {
      label: 'DEGRADED',
      icon: ShieldAlert,
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
    },
    ABSTAIN: {
      label: 'ABSTAIN',
      icon: ShieldX,
      color: 'text-rose-400',
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
    },
  };

  const current = configs[state];
  const Icon = current.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border ${current.border} ${current.bg} px-3 py-1.5 font-mono text-xs backdrop-blur-md ${className}`}
      title="Reliability Gate State (Evaluated by local backend in Phase 2. Displaying preliminary demo placeholder)."
    >
      <Icon className={`h-3.5 w-3.5 ${current.color}`} />
      <span className="text-slate-400">GATE:</span>
      <span className={`font-bold ${current.color}`}>{current.label}</span>
      <span className="rounded bg-slate-800/80 px-1 py-0.2 text-[10px] text-slate-400 font-normal">
        PLACEHOLDER
      </span>
    </div>
  );
};
