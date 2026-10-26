import React from 'react';
import { Network, Server, ShieldCheck, Activity } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

export const ContextualDetailsPanel: React.FC = () => {
  const { selectedNodeId } = useAppStore();

  return (
    <div className="rounded-xl border border-[#E3E8F0] bg-white p-5 shadow-sm text-[#202938]">
      <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-[#5267D8]" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#202938]">
            Node / Link Inspector
          </h3>
        </div>
        <span className="rounded bg-[#EEF2FF] border border-indigo-100 px-2 py-0.5 font-mono text-[10px] text-[#5267D8] font-semibold">
          CONTEXT
        </span>
      </div>

      {selectedNodeId ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#202938]">{selectedNodeId}</span>
            <span className="text-xs text-emerald-700 font-mono font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              STATUS: MONITORED
            </span>
          </div>
          <div className="space-y-2 text-xs text-[#687386]">
            <div className="flex justify-between">
              <span>Primary IP:</span>
              <span className="font-mono text-[#202938] font-semibold">10.0.1.1</span>
            </div>
            <div className="flex justify-between">
              <span>Interface Queue:</span>
              <span className="font-mono text-[#202938] font-semibold">eth0 (fq_codel)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8FAFC] border border-[#E3E8F0] text-[#687386]">
            <Server className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-bold text-[#202938]">No Network Element Selected</h4>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-[#687386]">
            Click any network node or link conduit inside the 3D topology canvas to inspect telemetry queues, route hops, and early warning horizons.
          </p>
        </div>
      )}

      {/* Supporting diagnostic readiness indicators */}
      <div className="mt-6 border-t border-[#E3E8F0] pt-4">
        <div className="text-[11px] font-semibold uppercase text-[#94A3B8] mb-2 font-mono">
          Inspection Capabilities
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#687386] font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Reliability Gate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-[#5267D8]" />
            <span>Residual Drift</span>
          </div>
        </div>
      </div>
    </div>
  );
};
