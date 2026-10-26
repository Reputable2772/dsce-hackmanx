import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Initializing network stream...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-precursor-purple" />
      <p className="mt-3 font-mono text-xs text-slate-400">{message}</p>
    </div>
  );
};
