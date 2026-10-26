import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  badgeText?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  badgeText = 'AWAITING CONNECTION',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-precursor-border bg-precursor-surface/30 p-10 text-center backdrop-blur-sm ${className}`}
    >
      {badgeText && (
        <span className="mb-4 inline-flex items-center rounded-full border border-precursor-border bg-precursor-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-precursor-lavender/80">
          {badgeText}
        </span>
      )}

      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-precursor-border-active bg-precursor-violet/40 text-precursor-cyan shadow-glow-cyan/15">
          <Icon className="h-6 w-6" />
        </div>
      )}

      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg border border-precursor-purple/40 bg-precursor-purple/15 px-4 py-2 text-xs font-semibold text-precursor-lavender transition-all hover:border-precursor-purple hover:bg-precursor-purple/25 hover:shadow-glow-purple/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
