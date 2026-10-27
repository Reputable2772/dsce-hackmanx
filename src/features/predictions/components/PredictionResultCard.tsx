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
    <div className={`rounded-xl border p-4 transition-all duration-200 shadow-sm ${
      isAbstain
        ? 'border-slate-200 bg-slate-50 opacity-80'
        : prediction.predictedImpact
        ? 'border-indigo-200 bg-white hover:border-[#5267D8]'
        : 'border-[#E3E8F0] bg-white'
    }`}>
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E3E8F0] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#EEF2FF] border border-indigo-200 px-2 py-0.5 font-mono text-[10px] font-bold text-[#5267D8]">
              +{prediction.horizonMinutes}M HORIZON
            </span>
            <span className="font-mono text-xs text-[#202938] font-semibold">
              {prediction.targetEntity}
            </span>
          </div>

          <h4 className="mt-1.5 text-sm font-bold text-[#202938]">
            {prediction.targetMetric}
          </h4>
        </div>

        {/* Detector Tag & Score Indicator */}
        <div className="text-right">
          <div className="text-[11px] font-mono text-[#687386]">
            Source: <span className="font-semibold text-[#5267D8]">{prediction.detectorLabel}</span>
          </div>

          {/* If ABSTAIN: Withhold score completely */}
          {isAbstain ? (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-mono font-bold text-rose-700">
              <ShieldX className="h-3.5 w-3.5" />
              <span>OUTPUT WITHHELD</span>
            </div>
          ) : (
            <div className="mt-1 flex items-baseline justify-end gap-1.5">
              <span className="text-[10px] font-mono text-[#687386]">Score:</span>
              <span className={`font-mono text-base font-bold ${
                prediction.detectorScore >= prediction.threshold
                  ? 'text-amber-600'
                  : prediction.detectorScore > 0
                  ? 'text-emerald-600'
                  : 'text-[#94A3B8]'
              }`}>
                {prediction.detectorScore.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                {prediction.detectorScore === 0 ? '(Nominal Baseline)' : `(Limit: ${prediction.threshold.toFixed(2)})`}
              </span>
            </div>
          )}

          <div className="text-[9px] font-mono text-[#687386] mt-0.5">
            {isAbstain
              ? '* SUPPRESSED BY RELIABILITY GATE'
              : prediction.detectorScore === 0
              ? 'ZERO ANOMALY / NOMINAL BASELINE'
              : prediction.scoreBadgeLabel}
          </div>
        </div>
      </div>

      {/* Main Impact Body or Abstain Notice */}
      <div className="my-3">
        {isAbstain ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <span>Prediction Suppressed Due to Reliability Gate Invalidation</span>
            </div>
            <p className="mt-1 text-[11px] text-[#475569]">
              Distribution drift test failed or sensor continuity gap exceeded threshold. No forward forecasts or speculative probabilities are presented for this lookahead window.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[#202938] leading-relaxed font-medium">
              {prediction.potentialImpact}
            </p>

            {/* Host & Interface Context */}
            {(prediction.targetHost || prediction.interfaceId) && (
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#475569] bg-slate-50 border border-slate-200 rounded px-2.5 py-1">
                {prediction.targetHost && <span><strong>Host:</strong> {prediction.targetHost}</span>}
                {prediction.interfaceId && <span>• <strong>Interface:</strong> {prediction.interfaceId}</span>}
              </div>
            )}

            {/* Mathematical Formula / Calculation Breakdown */}
            {prediction.mathFormula && (
              <div className="rounded border border-indigo-100 bg-[#EEF2FF]/60 p-2 font-mono text-[11px] text-indigo-900">
                <span className="font-bold text-[#5267D8]">Equation: </span>
                {prediction.mathFormula}
              </div>
            )}

            {/* Degraded advisory tag if active */}
            {isDegraded && (
              <div className="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>DEGRADED RELIABILITY:</strong> Forecast uncertainty bounds elevated. Use with operational caution.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Evidence & Methodology Section */}
      <div className="border-t border-[#E3E8F0] pt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-xs font-mono text-[#5267D8] hover:underline transition cursor-pointer"
        >
          <span>{expanded ? 'Hide Detector Evidence & Packets Used' : 'Inspect Detector Evidence & Packets Used'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs">
            {/* Real Packets Sample Table */}
            {prediction.samplePackets && prediction.samplePackets.length > 0 && (
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#202938]">
                  Packets Evaluated ({prediction.samplePackets.length} samples):
                </span>
                <div className="mt-1 overflow-x-auto rounded border border-[#E3E8F0] bg-white">
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead className="border-b border-[#E3E8F0] bg-[#F8FAFC] text-[#687386]">
                      <tr>
                        <th className="px-2 py-1">Time</th>
                        <th className="px-2 py-1">Proto</th>
                        <th className="px-2 py-1">Source</th>
                        <th className="px-2 py-1">Destination</th>
                        <th className="px-2 py-1">Size</th>
                        <th className="px-2 py-1">Reading</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E8F0]">
                      {prediction.samplePackets.map((pkt, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-2 py-1 text-slate-500">{pkt.timestamp_iso || `${pkt.timestamp}`}</td>
                          <td className="px-2 py-1 font-bold text-[#5267D8]">{pkt.protocol}</td>
                          <td className="px-2 py-1 text-slate-700">{pkt.source}</td>
                          <td className="px-2 py-1 text-slate-700">{pkt.destination}</td>
                          <td className="px-2 py-1 text-slate-500">{pkt.packet_size ? `${pkt.packet_size}B` : '—'}</td>
                          <td className="px-2 py-1 font-semibold text-amber-700">{pkt.value != null ? `${pkt.value}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Evidence items */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#687386]">
                Detector Evidence Metrics:
              </span>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                {prediction.evidence.baselineMean && (
                  <div className="flex justify-between border-b border-[#E3E8F0] pb-1 text-[#687386]">
                    <span>Baseline Mean:</span>
                    <span className="text-[#202938]">{prediction.evidence.baselineMean}</span>
                  </div>
                )}
                {prediction.evidence.currentValue && (
                  <div className="flex justify-between border-b border-[#E3E8F0] pb-1 text-[#687386]">
                    <span>Observed Value:</span>
                    <span className="text-amber-600 font-semibold">{prediction.evidence.currentValue}</span>
                  </div>
                )}
                {prediction.evidence.residualDelta && (
                  <div className="flex justify-between border-b border-[#E3E8F0] pb-1 text-[#687386]">
                    <span>Residual Delta:</span>
                    <span className="text-[#5267D8] font-bold">{prediction.evidence.residualDelta}</span>
                  </div>
                )}
                {prediction.evidence.consecutiveBreaches !== undefined && (
                  <div className="flex justify-between border-b border-[#E3E8F0] pb-1 text-[#687386]">
                    <span>Consecutive Breaches:</span>
                    <span className="text-rose-600">{prediction.evidence.consecutiveBreaches} cycles</span>
                  </div>
                )}
              </div>
            </div>

            {/* Methodology note */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#687386]">
                Evaluation Methodology:
              </span>
              <p className="mt-0.5 text-[11px] text-[#475569] leading-normal">
                {prediction.evidence.methodology}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
