import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Scale
} from 'lucide-react';
import { VerifiedHypothesis, AuditedAssumption, HypothesisStatus } from '../types';

interface HypothesisEntailmentMatrixProps {
  hypotheses?: (VerifiedHypothesis | any)[];
  assumptions?: AuditedAssumption[];
  isCompact?: boolean;
}

export const HypothesisEntailmentMatrix: React.FC<HypothesisEntailmentMatrixProps> = ({
  hypotheses = [],
  assumptions = [],
  isCompact = false,
}) => {
  const [expandedHypothesisId, setExpandedHypothesisId] = useState<string | null>(null);
  const [selectedAssumptionId, setSelectedAssumptionId] = useState<string | null>(null);

  // Normalize hypotheses to standard schema
  const normalizedHypotheses: VerifiedHypothesis[] = hypotheses.map((h, idx) => {
    const id = h.id || `H${idx + 1}`;
    const statement = h.statement || h.title || h.detail || 'Operational diagnostic hypothesis';
    const confidence = typeof h.confidence === 'number' 
      ? h.confidence 
      : h.confidence === 'High' ? 0.9 : h.confidence === 'Moderate' ? 0.7 : 0.4;
    
    // Derive status if not explicitly given
    let status: HypothesisStatus = h.status || 'UNVERIFIED';
    const supporting = Array.isArray(h.supporting_assumptions) ? h.supporting_assumptions : [];

    if (!h.status && supporting.length > 0 && assumptions.length > 0) {
      const matched = assumptions.filter(a => a.id && supporting.includes(a.id));
      if (matched.length > 0) {
        if (matched.some(a => a.status === 'VIOLATED')) {
          status = 'REFUTED';
        } else if (matched.every(a => a.status === 'VALIDATED')) {
          status = 'VALIDATED';
        }
      }
    }

    let entailment_explanation = h.entailment_explanation;
    if (!entailment_explanation) {
      if (status === 'VALIDATED') {
        entailment_explanation = supporting.length > 0
          ? `Strictly entailed by validated assumptions (${supporting.join(', ')}) matching physical telemetry.`
          : 'Logically consistent with observed telemetry baseline.';
      } else if (status === 'REFUTED') {
        entailment_explanation = `Refuted: Contradicted by ground-truth telemetry in supporting assumption audit.`;
      } else {
        entailment_explanation = 'Heuristic assessment; pending definitive telemetry validation.';
      }
    }

    return {
      id,
      statement,
      confidence,
      rationale: h.rationale || h.detail,
      supporting_assumptions: supporting,
      status,
      entailment_explanation,
    };
  });

  const getStatusBadge = (status: HypothesisStatus, supporting?: string[]) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>VALIDATED {supporting && supporting.length > 0 ? `(${supporting.join(', ')})` : ''}</span>
          </span>
        );
      case 'REFUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-500/30">
            <XCircle className="h-3 w-3 text-rose-400" />
            <span>REFUTED</span>
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span>UNVERIFIED</span>
          </span>
        );
    }
  };

  const getAssumptionBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded px-1.5 py-0.2">
            VALIDATED
          </span>
        );
      case 'VIOLATED':
        return (
          <span className="text-[9px] font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 rounded px-1.5 py-0.2">
            VIOLATED
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 rounded px-1.5 py-0.2">
            UNTESTABLE
          </span>
        );
    }
  };

  if (normalizedHypotheses.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-400 font-mono">
        No structured hypotheses synthesized for this event.
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans">
      {!isCompact && (
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Hypothesis-Assumption Entailment Matrix
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Automated Mathematical Verification
          </span>
        </div>
      )}

      <div className="space-y-2">
        {normalizedHypotheses.map((hyp) => {
          const isExpanded = expandedHypothesisId === hyp.id;
          const linkedAssumptions = assumptions.filter(
            (a) => a.id && hyp.supporting_assumptions?.includes(a.id)
          );

          return (
            <div
              key={hyp.id}
              className={`rounded-xl border transition-all ${
                hyp.status === 'VALIDATED'
                  ? 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50'
                  : hyp.status === 'REFUTED'
                  ? 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              } p-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                      {hyp.id}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {hyp.statement}
                    </span>
                    {getStatusBadge(hyp.status, hyp.supporting_assumptions)}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pt-0.5">
                    {hyp.entailment_explanation}
                  </p>

                  {/* Supporting Assumptions Tags */}
                  {hyp.supporting_assumptions && hyp.supporting_assumptions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                      <span className="text-[10px] font-mono text-slate-500">Supporting Claims:</span>
                      {hyp.supporting_assumptions.map((assId) => {
                        const ass = assumptions.find((a) => a.id === assId);
                        const isAssSelected = selectedAssumptionId === assId;
                        return (
                          <button
                            key={assId}
                            onClick={() => setSelectedAssumptionId(isAssSelected ? null : assId)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition ${
                              ass?.status === 'VALIDATED'
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                                : ass?.status === 'VIOLATED'
                                ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:border-rose-400'
                                : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <span>{assId}</span>
                            {ass && getAssumptionBadge(ass.status)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400">
                    Conf: <strong className="text-slate-200">{Math.round(hyp.confidence * 100)}%</strong>
                  </span>
                  {(linkedAssumptions.length > 0 || hyp.rationale) && (
                    <button
                      onClick={() => setExpandedHypothesisId(isExpanded ? null : hyp.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 transition"
                      title={isExpanded ? 'Collapse audit details' : 'Expand audit details'}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Audit Card */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                  {hyp.rationale && (
                    <div className="rounded bg-black/40 border border-slate-800 p-2 text-[11px] text-slate-300">
                      <span className="text-slate-500 block mb-0.5 text-[10px] uppercase font-bold">
                        Ground Truth Rationale
                      </span>
                      {hyp.rationale}
                    </div>
                  )}

                  {linkedAssumptions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        Linked Mathematical Telemetry Predicates
                      </span>
                      {linkedAssumptions.map((ass) => (
                        <div
                          key={ass.id}
                          className={`rounded border p-2 flex items-center justify-between gap-3 text-[11px] ${
                            ass.status === 'VALIDATED'
                              ? 'border-emerald-500/30 bg-emerald-950/20'
                              : ass.status === 'VIOLATED'
                              ? 'border-rose-500/30 bg-rose-950/20'
                              : 'border-slate-800 bg-slate-900/60'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">{ass.id}:</span>
                              <span className="text-slate-300 font-sans">{ass.statement}</span>
                            </div>
                            {ass.metric_id && (
                              <div className="text-[10px] text-slate-400">
                                Predicate: <code className="text-indigo-300">{ass.metric_id} {ass.operator} {ass.expected_value}</code>
                                {ass.actual_value !== undefined && ass.actual_value !== null && (
                                  <span className="ml-2">
                                    Observed: <strong className={ass.status === 'VALIDATED' ? 'text-emerald-400' : 'text-rose-400'}>{ass.actual_value}</strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>{getAssumptionBadge(ass.status)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
