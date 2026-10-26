import React from 'react';
import { Network, Server, ShieldCheck, Activity } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

export const ContextualDetailsPanel: React.FC = () => {
  const { selectedNodeId } = useAppStore();

  return (
    <div className="rounded-xl border border-precursor-border bg-precursor-card/70 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-precursor-border pb-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-precursor-cyan" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Node / Link Inspector
          </h3>
        </div>
        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400 font-semibold">
          CONTEXT
        </span>
      </div>

      {selectedNodeId ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">{selectedNodeId}</span>
            <span className="text-xs text-precursor-teal font-mono">STATUS: ACTIVE</span>
          </div>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>IP Address:</span>
              <span className="font-mono text-slate-200">10.0.1.1</span>
            </div>
            <div className="flex justify-between">
              <span>Interface Queue:</span>
              <span className="font-mono text-slate-200">eth0 (fq_codel)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-precursor-surface text-slate-500">
            <Server className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-300">No Network Element Selected</h4>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-400">
            Click any network node or link conduit inside the 3D topology canvas to inspect telemetry queues, route hops, and early warning horizons.
          </p>
        </div>
      )}

      {/* Supporting diagnostic readiness indicators */}
      <div className="mt-6 border-t border-precursor-border pt-4">
        <div className="text-[11px] font-semibold uppercase text-slate-500 mb-2">
          Inspection Capabilities
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Reliability Gate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-precursor-purple" />
            <span>Residual Drift</span>
          </div>
        </div>
      </div>
    </div>
  );
};
