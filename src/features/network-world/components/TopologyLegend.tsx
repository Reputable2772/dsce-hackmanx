import React from 'react';

export const TopologyLegend: React.FC = () => {
  return (
    <div className="rounded-xl border border-precursor-border bg-precursor-card/70 p-4 backdrop-blur-md">
      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
        Topology Legend
      </h4>

      <div className="mt-3 space-y-2 text-xs">
        <div className="text-[11px] font-semibold uppercase text-slate-500">Node Types</div>
        <div className="grid grid-cols-2 gap-2 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-precursor-cyan" />
            <span>Edge Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-precursor-purple" />
            <span>Core Switch</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-precursor-teal" />
            <span>Aggregator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            <span>Server / Host</span>
          </div>
        </div>

        <div className="pt-2 text-[11px] font-semibold uppercase text-slate-500">Link Telemetry State</div>
        <div className="space-y-1.5 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-1 w-4 rounded bg-emerald-400" />
              <span>Nominal Link</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">&lt; 35ms RTT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-1 w-4 rounded bg-amber-400" />
              <span>Degraded Flow</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">Jitter / Queue Spill</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-1 w-4 rounded bg-rose-500" />
              <span>Critical / Cut</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">Link Severed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
