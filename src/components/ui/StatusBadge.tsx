import React from 'react';

export type StatusVariant =
  | 'predict'
  | 'degraded'
  | 'abstain'
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'offline'
  | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string; dot: string }> = {
    predict: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
    },
    degraded: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400',
    },
    abstain: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400',
    },
    healthy: {
      bg: 'bg-precursor-teal/10',
      text: 'text-precursor-teal',
      border: 'border-precursor-teal/30',
      dot: 'bg-precursor-teal',
    },
    warning: {
      bg: 'bg-precursor-amber/10',
      text: 'text-precursor-amber',
      border: 'border-precursor-amber/30',
      dot: 'bg-precursor-amber',
    },
    critical: {
      bg: 'bg-precursor-coral/10',
      text: 'text-precursor-coral',
      border: 'border-precursor-coral/30',
      dot: 'bg-precursor-coral',
    },
    offline: {
      bg: 'bg-slate-800/60',
      text: 'text-slate-400',
      border: 'border-slate-700/50',
      dot: 'bg-slate-500',
    },
    neutral: {
      bg: 'bg-precursor-surface',
      text: 'text-precursor-lavender',
      border: 'border-precursor-border',
      dot: 'bg-precursor-purple',
    },
  };

  const style = variantStyles[variant];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium uppercase tracking-wider ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot} ${pulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
};
