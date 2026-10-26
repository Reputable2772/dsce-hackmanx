import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  ShieldX
} from 'lucide-react';
import { PredictionRecord } from '../types';
import { GateState } from '@/types';

interface PredictionResultCardProps {
  prediction: PredictionRecord;
  activeGateState: GateState;
}

export const PredictionResultCard: React.FC<PredictionResultCardProps> = ({
  prediction,
  activeGateState
}) => {
  const [expanded, setExpanded] = useState(false);

  const isAbstain = activeGateState === 'ABSTAIN';
  const isDegraded = activeGateState === 'DEGRADED';

  return (
    <div className={`rounded-xl border p-4 backdrop-blur-md transition-all duration-200 ${
      isAbstain
        ? 'border-slate-800 bg-navy-950/40 opacity-75'
        : prediction.predictedImpact
        ? 'border-purple-500/40 bg-navy-900/60 hover:border-purple-500/70'
        : 'border-violet-900/40 bg-navy-900/40'
    }`}>
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-violet-900/30 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-300">
              +{prediction.horizonMinutes}M HORIZON
            </span>
            <span className="font-mono text-xs text-cyan-300">
              {prediction.targetEntity}
            </span>
          </div>

          <h4 className="mt-1.5 text-base font-semibold text-slate-100">
            {prediction.targetMetric}
          </h4>
        </div>

        {/* Detector Tag & Score Indicator */}
        <div className="text-right">
          <div className="text-[11px] font-mono text-slate-400">
            Source: <span className="font-semibold text-purple-300">{prediction.detectorLabel}</span>
          </div>

          {/* If ABSTAIN: Withhold score completely */}
          {isAbstain ? (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-mono font-bold text-rose-300">
              <ShieldX className="h-3.5 w-3.5" />
              <span>OUTPUT WITHHELD</span>
            </div>
          ) : (
            <div className="mt-1 flex items-baseline justify-end gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">Score:</span>
              <span className={`font-mono text-lg font-bold ${
                prediction.detectorScore >= prediction.threshold
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {prediction.detectorScore.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                (Thresh: {prediction.threshold.toFixed(2)})
              </span>
            </div>
          )}

          <div className="text-[9px] font-mono text-slate-400 mt-0.5">
            {isAbstain ? '* SUPPRESSED BY GATE' : prediction.scoreBadgeLabel}
          </div>
        </div>
      </div>

      {/* Main Impact Body or Abstain Notice */}
      <div className="my-3">
        {isAbstain ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">
            <div className="flex items-center gap-1.5 font-semibold text-rose-300">
              <ShieldAlert className="h-4 w-4" />
              <span>Prediction Suppressed Due to Reliability Gate Invalidation</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-300">
              Distribution drift test failed or sensor continuity gap exceeded threshold. No forward forecasts or speculative probabilities are presented for this lookahead window.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {prediction.potentialImpact}
            </p>

            {/* Degraded advisory tag if active */}
            {isDegraded && (
              <div className="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>
                  <strong>DEGRADED RELIABILITY:</strong> Forecast uncertainty bounds elevated (+/- 35%). Use with caution.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Evidence & Methodology Section */}
      <div className="border-t border-violet-900/30 pt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-xs font-mono text-purple-300 hover:text-purple-200 transition"
        >
          <span>{expanded ? 'Hide Detector Evidence & Math' : 'Inspect Detector Evidence & Limitations'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 rounded-lg border border-violet-900/50 bg-navy-950/80 p-3 text-xs">
            {/* Evidence items */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Detector Evidence Metrics:
              </span>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                {prediction.evidence.baselineMean && (
                  <div className="flex justify-between border-b border-violet-900/30 pb-1 text-slate-400">
                    <span>Baseline Mean:</span>
                    <span className="text-slate-200">{prediction.evidence.baselineMean}</span>
                  </div>
                )}
                {prediction.evidence.currentValue && (
                  <div className="flex justify-between border-b border-violet-900/30 pb-1 text-slate-400">
                    <span>Observed Trajectory:</span>
                    <span className="text-amber-300">{prediction.evidence.currentValue}</span>
                  </div>
                )}
                {prediction.evidence.residualDelta && (
                  <div className="flex justify-between border-b border-violet-900/30 pb-1 text-slate-400">
                    <span>Residual Delta:</span>
                    <span className="text-cyan-300 font-bold">{prediction.evidence.residualDelta}</span>
                  </div>
                )}
                {prediction.evidence.consecutiveBreaches !== undefined && (
                  <div className="flex justify-between border-b border-violet-900/30 pb-1 text-slate-400">
                    <span>Consecutive Breaches:</span>
                    <span className="text-rose-400">{prediction.evidence.consecutiveBreaches} cycles</span>
                  </div>
                )}
              </div>
            </div>

            {/* Methodology note */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Evaluation Methodology:
              </span>
              <p className="mt-0.5 text-[11px] text-slate-300 leading-normal">
                {prediction.evidence.methodology}
              </p>
            </div>

            {/* Explicit Limitations */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Known Model & Data Limitations:
              </span>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                {prediction.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
