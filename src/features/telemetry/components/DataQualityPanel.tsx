import React from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  FileQuestion, 
  AlertOctagon, 
  Info
} from 'lucide-react';
import { DataQualityAudit } from '../types';

interface DataQualityPanelProps {
  audit: DataQualityAudit;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({ audit }) => {
  return (
    <div className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm text-[#202938]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E8F0] pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#202938]">
            Telemetry Quality & Invalidation Guard
          </h3>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700">
            AUDIT ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#687386]">
          <span>Completeness:</span>
          <span className="font-bold text-emerald-700">
            {(audit.sensorHealthScore * 100).toFixed(1)}%
          </span>
          <span className="text-[#94A3B8]">({audit.healthyCount}/{audit.totalObservations} valid observations)</span>
        </div>
      </div>

      {/* Critical Invariant Warning Banner */}
      <div className="my-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <AlertOctagon className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
        <div>
          <span className="font-bold tracking-wide uppercase">
            Core PRECURSOR Reliability Invariant:
          </span>{' '}
          Missing or stale telemetry data must <span className="underline font-bold">NEVER</span> be silently converted to zero or assumed nominal. Incomplete sensor buffers automatically trigger the Reliability Gate down to <span className="font-bold text-amber-800">DEGRADED</span> or <span className="font-bold text-rose-800">ABSTAIN</span> to prevent hallucinations.
        </div>
      </div>

      {/* Grid of the 5 Quality States */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 my-3">
        {/* 1. Healthy */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>Healthy (Good)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-emerald-700">
            {audit.healthyCount}
          </div>
          <p className="mt-1 text-[11px] text-[#687386] leading-tight">
            Timely packet transit and interface counter deltas verified within 5s window.
          </p>
        </div>

        {/* 2. Stale */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Stale (Frozen)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-amber-700">
            {audit.staleCount}
          </div>
          <p className="mt-1 text-[11px] text-[#687386] leading-tight">
            Identical counter repeats across 3+ consecutive polls; cache or agent stalled.
          </p>
        </div>

        {/* 3. Missing */}
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
            <FileQuestion className="h-3.5 w-3.5 text-rose-600" />
            <span>Missing (Null)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-rose-700">
            {audit.missingCount}
          </div>
          <p className="mt-1 text-[11px] text-[#687386] leading-tight">
            Sensor timed out without returning observation. Continuity gap preserved.
          </p>
        </div>

        {/* 4. Invalid */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-800">
            <AlertOctagon className="h-3.5 w-3.5 text-purple-600" />
            <span>Invalid (Corrupt)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-purple-700">
            {audit.invalidCount}
          </div>
          <p className="mt-1 text-[11px] text-[#687386] leading-tight">
            Physical counter overflow, negative delta, or schema validation rejection.
          </p>
        </div>

        {/* 5. Unavailable */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Info className="h-3.5 w-3.5 text-slate-500" />
            <span>Unavailable</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-700">
            0
          </div>
          <p className="mt-1 text-[11px] text-[#687386] leading-tight">
            Metric disabled or interface down administratively; excluded from detector math.
          </p>
        </div>
      </div>

      {/* Recent Quality Audit Events List */}
      <div className="mt-4 border-t border-[#E3E8F0] pt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#687386] font-mono">
          Recent Sensor Quality Invalidation Logs
        </h4>

        <div className="space-y-1.5 font-mono text-xs">
          {audit.recentAuditEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] px-3 py-2 text-[#202938]"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#94A3B8]">{ev.timeLabel}</span>
                <span className="font-semibold text-[#5267D8]">[{ev.metric}]</span>
                <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase border ${
                  ev.status === 'missing' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  ev.status === 'stale' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {ev.status}
                </span>
                <span className="text-[#475569]">{ev.detail}</span>
              </div>

              <span className="text-[10px] text-[#94A3B8]">
                Action: Gap Withheld from Baseline
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
