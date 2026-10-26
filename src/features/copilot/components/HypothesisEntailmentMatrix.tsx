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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>VALIDATED {supporting && supporting.length > 0 ? `(${supporting.join(', ')})` : ''}</span>
          </span>
        );
      case 'REFUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" />
            <span>REFUTED</span>
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span>UNVERIFIED</span>
          </span>
        );
    }
  };

  const getAssumptionBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.2">
            VALIDATED
          </span>
        );
      case 'VIOLATED':
        return (
          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.2">
            VIOLATED
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2">
            UNTESTABLE
          </span>
        );
    }
  };

  if (normalizedHypotheses.length === 0) {
    return (
      <div className="rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-4 text-center text-xs text-[#687386] font-mono">
        No structured hypotheses synthesized for this event.
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans">
      {!isCompact && (
        <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-2">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#5267D8]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#202938] font-mono">
              Hypothesis-Assumption Entailment Matrix
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[#687386]">
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
                  ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                  : hyp.status === 'REFUTED'
                  ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                  : 'border-[#E3E8F0] bg-[#F8FAFC] hover:border-[#5267D8]'
              } p-3 shadow-xs`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#5267D8] bg-[#EEF2FF] border border-[#CBD5E1] px-1.5 py-0.5 rounded">
                      {hyp.id}
                    </span>
                    <span className="text-xs font-semibold text-[#202938]">
                      {hyp.statement}
                    </span>
                    {getStatusBadge(hyp.status, hyp.supporting_assumptions)}
                  </div>

                  <p className="text-[11px] text-[#475569] leading-relaxed pt-0.5">
                    {hyp.entailment_explanation}
                  </p>

                  {/* Supporting Assumptions Tags */}
                  {hyp.supporting_assumptions && hyp.supporting_assumptions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                      <span className="text-[10px] font-mono text-[#687386]">Supporting Claims:</span>
                      {hyp.supporting_assumptions.map((assId) => {
                        const ass = assumptions.find((a) => a.id === assId);
                        const isAssSelected = selectedAssumptionId === assId;
                        return (
                          <button
                            key={assId}
                            onClick={() => setSelectedAssumptionId(isAssSelected ? null : assId)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition ${
                              ass?.status === 'VALIDATED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400'
                                : ass?.status === 'VIOLATED'
                                ? 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-400'
                                : 'bg-white text-[#202938] border-[#CBD5E1] hover:border-[#5267D8]'
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
                  <span className="text-[10px] font-mono text-[#687386]">
                    Conf: <strong className="text-[#202938]">{Math.round(hyp.confidence * 100)}%</strong>
                  </span>
                  {(linkedAssumptions.length > 0 || hyp.rationale) && (
                    <button
                      onClick={() => setExpandedHypothesisId(isExpanded ? null : hyp.id)}
                      className="p-1 text-[#687386] hover:text-[#202938] transition"
                      title={isExpanded ? 'Collapse audit details' : 'Expand audit details'}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Audit Card */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[#E3E8F0] space-y-2 text-xs font-mono">
                  {hyp.rationale && (
                    <div className="rounded-lg bg-white border border-[#E3E8F0] p-2.5 text-[11px] text-[#334155] shadow-xs">
                      <span className="text-[#687386] block mb-0.5 text-[10px] uppercase font-bold">
                        Ground Truth Rationale
                      </span>
                      {hyp.rationale}
                    </div>
                  )}

                  {linkedAssumptions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[#687386] block text-[10px] uppercase font-bold">
                        Linked Mathematical Telemetry Predicates
                      </span>
                      {linkedAssumptions.map((ass) => (
                        <div
                          key={ass.id}
                          className={`rounded-lg border p-2.5 flex items-center justify-between gap-3 text-[11px] bg-white shadow-xs ${
                            ass.status === 'VALIDATED'
                              ? 'border-emerald-200'
                              : ass.status === 'VIOLATED'
                              ? 'border-rose-200'
                              : 'border-[#E3E8F0]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#202938]">{ass.id}:</span>
                              <span className="text-[#334155] font-sans">{ass.statement}</span>
                            </div>
                            {ass.metric_id && (
                              <div className="text-[10px] text-[#687386]">
                                Predicate: <code className="text-[#5267D8] bg-[#EEF2FF] px-1 py-0.2 rounded font-mono">{ass.metric_id} {ass.operator} {ass.expected_value}</code>
                                {ass.actual_value !== undefined && ass.actual_value !== null && (
                                  <span className="ml-2 font-mono">
                                    Observed: <strong className={ass.status === 'VALIDATED' ? 'text-emerald-700' : 'text-rose-700'}>{ass.actual_value}</strong>
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
