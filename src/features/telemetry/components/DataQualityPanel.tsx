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
    <div className="rounded-xl border border-violet-900/40 bg-navy-900/60 p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-900/40 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Telemetry Quality & Invalidation Guard
          </h3>
          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] text-amber-300">
            AUDIT ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span>Completeness:</span>
          <span className="font-bold text-emerald-400">
            {(audit.sensorHealthScore * 100).toFixed(1)}%
          </span>
          <span className="text-slate-400">({audit.healthyCount}/{audit.totalObservations} valid observations)</span>
        </div>
      </div>

      {/* Critical Invariant Warning Banner */}
      <div className="my-3 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
        <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
        <div>
          <span className="font-bold tracking-wide text-rose-300 uppercase">
            Core PRECURSOR Reliability Invariant:
          </span>{' '}
          Missing or stale telemetry data must <span className="underline font-bold text-rose-100">NEVER</span> be silently converted to zero or assumed nominal. Incomplete sensor buffers automatically trigger the Reliability Gate down to <span className="font-bold text-amber-300">DEGRADED</span> or <span className="font-bold text-rose-300">ABSTAIN</span> to prevent hallucinations.
        </div>
      </div>

      {/* Grid of the 5 Quality States */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 my-3">
        {/* 1. Healthy */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>Healthy (Good)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-emerald-400">
            {audit.healthyCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-tight">
            Timely packet transit and interface counter deltas verified within 5s window.
          </p>
        </div>

        {/* 2. Stale */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Stale (Frozen)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-amber-400">
            {audit.staleCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-tight">
            Identical counter repeats across 3+ consecutive polls; cache or agent stalled.
          </p>
        </div>

        {/* 3. Missing */}
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
            <FileQuestion className="h-3.5 w-3.5 text-rose-400" />
            <span>Missing (Null)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-rose-400">
            {audit.missingCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-tight">
            Sensor timed out without returning observation. Continuity gap preserved.
          </p>
        </div>

        {/* 4. Invalid */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
            <AlertOctagon className="h-3.5 w-3.5 text-purple-400" />
            <span>Invalid (Corrupt)</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-purple-400">
            {audit.invalidCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-tight">
            Physical counter overflow, negative delta, or schema validation rejection.
          </p>
        </div>

        {/* 5. Unavailable */}
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/20 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Unavailable</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-400">
            0
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-tight">
            Metric disabled or interface down administratively; excluded from detector math.
          </p>
        </div>
      </div>

      {/* Recent Quality Audit Events List */}
      <div className="mt-4 border-t border-violet-900/30 pt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Recent Sensor Quality Invalidation Logs (Fixture Audit Trail)
        </h4>

        <div className="space-y-1.5 font-mono text-xs">
          {audit.recentAuditEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-900/30 bg-navy-950/60 px-3 py-2 text-slate-300"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{ev.timeLabel}</span>
                <span className="font-semibold text-cyan-300">[{ev.metric}]</span>
                <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                  ev.status === 'missing' ? 'bg-rose-500/20 text-rose-300' :
                  ev.status === 'stale' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-purple-500/20 text-purple-300'
                }`}>
                  {ev.status}
                </span>
                <span className="text-slate-300">{ev.detail}</span>
              </div>

              <span className="text-[10px] text-slate-400">
                Action: Gap Withheld from Baseline
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
