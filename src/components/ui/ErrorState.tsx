import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Telemetry Pipeline Fault',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-precursor-coral/30 bg-precursor-coral/10 p-6 text-left backdrop-blur-md ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-precursor-coral/20 p-2 text-precursor-coral">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white">{title}</h4>
          <p className="mt-1 font-mono text-xs text-rose-300/80">{message}</p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-precursor-coral/40 bg-precursor-coral/20 px-3 py-1.5 font-mono text-xs font-semibold text-rose-200 transition-colors hover:bg-precursor-coral/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry Diagnostic Sweep</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
