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

  const containerClass = isAbstain
    ? 'border-rose-200 bg-rose-50/60'
    : isDegraded
    ? 'border-amber-200 bg-amber-50/60'
    : 'border-emerald-200 bg-emerald-50/60';

  const iconContainerClass = isAbstain
    ? 'border-rose-300 bg-rose-100 text-rose-700'
    : isDegraded
    ? 'border-amber-300 bg-amber-100 text-amber-700'
    : 'border-emerald-300 bg-emerald-100 text-emerald-700';

  const gateTextColor = isAbstain
    ? 'text-rose-700'
    : isDegraded
    ? 'text-amber-700'
    : 'text-emerald-700';

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-all duration-200 ${containerClass}`}>
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E8F0] pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconContainerClass}`}>
            {isAbstain ? (
              <ShieldX className="h-5 w-5" />
            ) : isDegraded ? (
              <ShieldAlert className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs font-semibold text-[#687386]">
                RELIABILITY GATE:
              </span>
              <span className={`text-sm font-extrabold tracking-wider ${gateTextColor}`}>
                {activeGateState}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-[#202938]">
              {isAbstain
                ? 'Predictions suppressed. High sensor drift or packet loss residual breach detected.'
                : isDegraded
                ? 'High uncertainty detected. Forward horizons are flagged with reduced confidence.'
                : 'Residual variance within nominal bounds. Predictions fully enabled.'}
            </p>
          </div>
        </div>

        {/* State Override Pills */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white p-1 shadow-xs">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 text-[10px] font-mono text-[#687386]">
            <Sliders className="h-3 w-3" />
            <span>GATE MODE:</span>
          </span>
          {(['PREDICT', 'DEGRADED', 'ABSTAIN'] as GateState[]).map((state) => {
            const isSelected = activeGateState === state;
            const activeClass =
              state === 'PREDICT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : state === 'DEGRADED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-rose-600 text-white shadow-xs';
            return (
              <button
                key={state}
                onClick={() => onGateStateChange(state)}
                className={`rounded px-2.5 py-1 text-xs font-mono font-bold transition ${
                  isSelected
                    ? activeClass
                    : 'text-[#687386] hover:bg-[#F8FAFC] hover:text-[#202938]'
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>
      </div>

      {/* Decision Metrics & Reasons Row */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs font-mono">
        <div className="rounded-lg border border-[#E3E8F0] bg-white p-2.5 shadow-xs">
          <div className="text-[11px] text-[#687386]">Sensor Health Score</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-base font-bold ${
              decision.sensorHealthScore >= 0.9 ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {(decision.sensorHealthScore * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] text-[#94A3B8]">(Target &ge; 90%)</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#E3E8F0] bg-white p-2.5 shadow-xs">
          <div className="text-[11px] text-[#687386]">Distribution Drift (PSI)</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-base font-bold ${
              decision.driftScore < 0.15 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {decision.driftScore.toFixed(3)}
            </span>
            <span className="text-[10px] text-[#94A3B8]">(Threshold &lt; 0.20)</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#E3E8F0] bg-white p-2.5 shadow-xs">
          <div className="text-[11px] text-[#687386]">Residual Variance Ratio</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-base font-bold ${
              decision.residualErrorScore < 2.0 ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {decision.residualErrorScore.toFixed(2)}x
            </span>
            <span className="text-[10px] text-[#94A3B8]">(Nominal 1.0x)</span>
          </div>
        </div>
      </div>

      {/* Immediate Alert Bypass Notice */}
      {decision.immediateAlertsActive && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-[#687386]">
          <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
          <span>Immediate physical fault rules remain actively monitored independent of gate state.</span>
        </div>
      )}
    </div>
  );
};
