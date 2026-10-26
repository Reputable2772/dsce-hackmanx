import React from 'react';
import { AlertCircle, Cpu } from 'lucide-react';
import { CurrentFault } from '../types';

interface CurrentFaultListProps {
  faults: CurrentFault[];
}

export const CurrentFaultList: React.FC<CurrentFaultListProps> = ({ faults }) => {
  return (
    <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-rose-900">
            Immediate Faults (Active Outages)
          </h3>
          <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 font-mono text-[11px] text-rose-700 font-bold">
            {faults.length} ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[#687386]">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Zero-latency rule alerts • Isolated from predictive models</span>
        </div>
      </div>

      {/* Fault Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mt-3">
        {faults.map((fault) => (
          <div
            key={fault.id}
            className="flex flex-col justify-between rounded-lg border border-rose-200 bg-rose-50/30 p-3 text-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                  <Cpu className="h-3.5 w-3.5 text-rose-600" />
                  <span>{fault.title}</span>
                </div>
                <span className="rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800 uppercase">
                  {fault.severity}
                </span>
              </div>

              <p className="mt-1.5 text-[#475569] leading-relaxed text-[11px]">
                {fault.summary}
              </p>
            </div>

            <div className="mt-3 space-y-1 border-t border-rose-200/60 pt-2 font-mono text-[11px]">
              <div className="flex justify-between text-[#687386]">
                <span>Target Node / Interface:</span>
                <span className="text-[#5267D8] font-semibold">{fault.targetDevice} [{fault.interfaceId}]</span>
              </div>
              <div className="flex justify-between text-[#687386]">
                <span>Rule Triggered:</span>
                <span className="text-[#202938]">{fault.rule}</span>
              </div>
              <div className="flex justify-between text-[#687386]">
                <span>Observed vs Threshold:</span>
                <span className="text-rose-700 font-bold">{fault.observedValue} (limit: {fault.threshold})</span>
              </div>
              <div className="flex justify-between text-[#94A3B8] text-[10px] pt-1">
                <span>Detected At:</span>
                <span>{fault.detectedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
