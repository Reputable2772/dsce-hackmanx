import React from 'react';
import { WifiOff, Radio } from 'lucide-react';
import { ConnectionState } from '@/types';

interface ConnectionStatusProps {
  state?: ConnectionState;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state = 'demo_offline',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border border-precursor-border bg-precursor-surface/60 px-3 py-1.5 font-mono text-xs backdrop-blur-md ${className}`}
      title="Backend integration is pending Phase 2. Currently operating in disconnected demo mode."
    >
      {state === 'connected' ? (
        <>
          <Radio className="h-3.5 w-3.5 text-precursor-teal animate-pulse" />
          <span className="text-precursor-teal font-medium">LIVE BACKEND</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">BACKEND UNCONNECTED</span>
          <span className="rounded bg-slate-800 px-1 py-0.2 text-[10px] text-slate-400 font-bold">
            DEMO
          </span>
        </>
      )}
    </div>
  );
};
