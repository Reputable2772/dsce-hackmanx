import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  AlertOctagon, 
  Sliders
} from 'lucide-react';
import { GateDecisionRecord } from '../types';
import { GateState } from '@/types';

interface ReliabilityGateBannerProps {
  decision: GateDecisionRecord;
  activeGateState: GateState;
  onGateStateChange: (state: GateState) => void;
}

export const ReliabilityGateBanner: React.FC<ReliabilityGateBannerProps> = ({
  decision,
  activeGateState,
  onGateStateChange
}) => {
  const isAbstain = activeGateState === 'ABSTAIN';
  const isDegraded = activeGateState === 'DEGRADED';

  return (
    <div className={`rounded-xl border p-4 backdrop-blur-md transition-all duration-300 ${
      isAbstain
        ? 'border-rose-500/50 bg-rose-950/30 ring-1 ring-rose-500/30'
        : isDegraded
        ? 'border-amber-500/50 bg-amber-950/30 ring-1 ring-amber-500/30'
        : 'border-emerald-500/40 bg-emerald-950/20'
    }`}>
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
            isAbstain
              ? 'border-rose-500/40 bg-rose-500/20 text-rose-400'
              : isDegraded
              ? 'border-amber-500/40 bg-amber-500/20 text-amber-400'
              : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
          }`}>
            {isAbstain ? (
              <ShieldX className="h-6 w-6" />
            ) : isDegraded ? (
              <ShieldAlert className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-400">
                RELIABILITY GATE DECISION:
              </span>
              <span className={`font-mono text-sm font-bold tracking-wider ${
                isAbstain
                  ? 'text-rose-400'
                  : isDegraded
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {activeGateState}
              </span>
              <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                DEMO SCENARIO SWITCHABLE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isAbstain
                ? 'Predictions suppressed: Hard invalidation condition triggered (KS distribution drift / telemetry buffer gap).'
                : isDegraded
                ? 'Predictions permitted with cautionary restrictions: Increased uncertainty detected in recent sensor window.'
                : 'High Trust: Ingestion completeness and statistical baseline distribution tests passed.'}
            </p>
          </div>
        </div>

        {/* Gate State Simulator Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Sliders className="h-3 w-3 text-cyan-400" />
            <span>Simulate Gate:</span>
          </span>
          <div className="flex rounded-lg border border-violet-800/60 bg-navy-950 p-0.5">
            {(['PREDICT', 'DEGRADED', 'ABSTAIN'] as GateState[]).map((state) => (
              <button
                key={state}
                onClick={() => onGateStateChange(state)}
                className={`rounded px-2.5 py-1 text-xs font-mono font-bold transition ${
                  activeGateState === state
                    ? state === 'PREDICT'
                      ? 'bg-emerald-500 text-navy-950 shadow-sm'
                      : state === 'DEGRADED'
                      ? 'bg-amber-500 text-navy-950 shadow-sm'
                      : 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Decision metrics and reasons */}
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Verification metrics */}
        <div className="flex flex-col justify-center space-y-1.5 rounded-lg border border-white/5 bg-black/20 p-3 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Sensor Completeness:</span>
            <span className={`font-bold ${decision.sensorHealthScore >= 0.85 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {(decision.sensorHealthScore * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">KS Distribution Drift:</span>
            <span className={`font-bold ${decision.driftScore < 0.25 ? 'text-emerald-400' : decision.driftScore < 0.5 ? 'text-amber-400' : 'text-rose-400'}`}>
              {decision.driftScore.toFixed(2)} {decision.driftScore > 0.5 ? '(CRITICAL)' : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Immediate Alerts:</span>
            <span className="font-bold text-cyan-400">ACTIVE (Unconditional)</span>
          </div>
        </div>

        {/* Reasons list */}
        <div className="lg:col-span-2 rounded-lg border border-white/5 bg-black/20 p-3 text-xs">
          <span className="font-mono text-[11px] font-semibold uppercase text-slate-400">
            Active Gate Decision Rationales:
          </span>
          <ul className="mt-1.5 space-y-1 text-slate-300">
            {decision.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                  isAbstain ? 'bg-rose-400' : isDegraded ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* When ABSTAIN: prominent warning notice */}
      {isAbstain && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/15 p-2.5 text-xs text-rose-200">
          <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
          <span>
            <strong>PREDICTIONS STRICTLY WITHHELD:</strong> The Reliability Gate has suppressed all forward forecasting models. Rule-based fault detection remains active below.
          </span>
        </div>
      )}
    </div>
  );
};
