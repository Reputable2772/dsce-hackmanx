import React from 'react';
import { AlertCircle, Cpu } from 'lucide-react';
import { CurrentFault } from '../types';

interface CurrentFaultListProps {
  faults: CurrentFault[];
}

export const CurrentFaultList: React.FC<CurrentFaultListProps> = ({ faults }) => {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-precursor-card-glass p-4 backdrop-blur-xl shadow-glass-panel">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-rose-200">
            Immediate Faults (Active Outages)
          </h3>
          <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 font-mono text-[11px] text-rose-300 font-bold">
            {faults.length} ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
          <span>Zero-latency rule alerts • Isolated from predictive models</span>
        </div>
      </div>

      {/* Fault Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mt-3">
        {faults.map((fault) => (
          <div
            key={fault.id}
            className="flex flex-col justify-between rounded-lg border border-rose-500/30 bg-navy-950/70 p-3 text-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                  <Cpu className="h-3.5 w-3.5 text-rose-400" />
                  <span>{fault.title}</span>
                </div>
                <span className="rounded border border-rose-500/40 bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300 uppercase">
                  {fault.severity}
                </span>
              </div>

              <p className="mt-1.5 text-slate-300 leading-relaxed text-[11px]">
                {fault.summary}
              </p>
            </div>

            <div className="mt-3 space-y-1 border-t border-rose-500/20 pt-2 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Target Node / Interface:</span>
                <span className="text-cyan-300 font-semibold">{fault.targetDevice} [{fault.interfaceId}]</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rule Triggered:</span>
                <span className="text-slate-200">{fault.rule}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Observed vs Threshold:</span>
                <span className="text-rose-400 font-bold">{fault.observedValue} (limit: {fault.threshold})</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Detected At:</span>
                <span className="text-slate-300">{fault.detectedAt} UTC</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
