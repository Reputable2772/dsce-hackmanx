import React from 'react';

export const TopologyLegend: React.FC = () => {
  return (
    <div className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm text-[#202938]">
      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#687386]">
        Topology Legend
      </h4>

      <div className="mt-3 space-y-2 text-xs">
        <div className="text-[11px] font-semibold uppercase text-[#94A3B8]">Node Types</div>
        <div className="grid grid-cols-2 gap-2 text-[#475569]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#159E98]" />
            <span>Edge Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5267D8]" />
            <span>Core Switch</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
            <span>Aggregator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span>Server / Host</span>
          </div>
        </div>

        <div className="pt-2 text-[11px] font-semibold uppercase text-[#94A3B8]">Link Telemetry State</div>
        <div className="space-y-1.5 text-[#475569]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-4 rounded bg-emerald-500" />
              <span>Nominal Link</span>
            </span>
            <span className="font-mono text-[10px] text-[#94A3B8]">&lt; 35ms RTT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-4 rounded bg-amber-500" />
              <span>Degraded Flow</span>
            </span>
            <span className="font-mono text-[10px] text-[#94A3B8]">Jitter / Queue Spill</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-4 rounded bg-rose-500" />
              <span>Critical / Cut</span>
            </span>
            <span className="font-mono text-[10px] text-[#94A3B8]">Link Severed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
