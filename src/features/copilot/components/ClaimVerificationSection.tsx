import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Scale
} from 'lucide-react';
import { ClaimVerificationRecord } from '../types';
import { PREDEFINED_CLAIMS } from '../fixtures/copilotFixture';

export const ClaimVerificationSection: React.FC = () => {
  const [claimInput, setClaimInput] = useState('');
  const [evaluatedResult, setEvaluatedResult] = useState<ClaimVerificationRecord | null>(PREDEFINED_CLAIMS[0]);

  const handleVerify = (textToVerify: string) => {
    const trimmed = textToVerify.trim();
    if (!trimmed) return;

    // Check if matching any predefined demonstration claims
    const matched = PREDEFINED_CLAIMS.find(c => 
      trimmed.toLowerCase().includes(c.claimText.toLowerCase().slice(0, 30)) ||
      c.claimText.toLowerCase().includes(trimmed.toLowerCase().slice(0, 30))
    );

    if (matched) {
      setEvaluatedResult(matched);
    } else {
      // Custom claim: honestly return UNVERIFIED
      setEvaluatedResult({
        id: `custom-${Date.now()}`,
        claimText: trimmed,
        metricId: 'unknown_or_custom',
        claimedValue: 'Extracted phrase',
        actualValue: null,
        status: 'UNVERIFIED',
        explanation: 'UNVERIFIED: This custom claim could not be matched to an active demonstration telemetry fixture. The backend Numerical Claim Verifier is not connected in this frontend preview phase.',
        limitations: 'Numerical assertion cannot be checked without live telemetry buffer ingestion and statistical tolerance matching.',
        evidenceTimestamp: 'N/A'
      });
    }
  };

  const handleSelectExample = (claim: ClaimVerificationRecord) => {
    setClaimInput(claim.claimText);
    setEvaluatedResult(claim);
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-precursor-card-glass p-5 backdrop-blur-xl shadow-glass-panel">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-precursor-cyan" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Numerical Claim Verifier
          </h3>
          <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 font-mono text-[10px] text-cyan-300 font-bold">
            EVIDENCE CHECKING
          </span>
        </div>

        <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
          DEMO VERIFICATION — STANDALONE EVIDENCE CHECK
        </div>
      </div>

      <p className="text-xs text-slate-300">
        Submit any numerical operational claim (e.g., latency limits, packet loss figures, throughput stats). The verifier parses metric assertions and validates them against the ground-truth telemetry observation buffer within ±10% tolerance.
      </p>

      {/* Predefined Claim Examples */}
      <div>
        <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
          Select Predefined Example Claim to Verify:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PREDEFINED_CLAIMS.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectExample(c)}
              className="flex items-center justify-between gap-2 rounded-lg border border-violet-900/40 bg-navy-950/70 p-2.5 text-left text-xs transition hover:border-cyan-400/50 hover:bg-navy-800/60"
            >
              <div className="line-clamp-2 text-[11px] text-slate-300">
                "{c.claimText}"
              </div>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                c.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                c.status === 'CONTRADICTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {c.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input & Submit Form */}
      <div className="flex gap-2">
        <textarea
          rows={2}
          value={claimInput}
          onChange={(e) => setClaimInput(e.target.value)}
          placeholder="Enter a numerical assertion to check against telemetry (e.g. 'Latency on spine-01 is 48.6 ms')..."
          className="flex-1 rounded-lg border border-violet-800/60 bg-navy-950 p-2.5 text-xs text-slate-200 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
        />
        <button
          onClick={() => handleVerify(claimInput)}
          disabled={!claimInput.trim()}
          className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-4 text-xs font-mono font-bold text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-50"
        >
          <Scale className="h-4 w-4 mb-0.5" />
          <span>Check Claim</span>
        </button>
      </div>

      {/* Evaluation Result Card */}
      {evaluatedResult && (
        <div className={`rounded-xl border p-4 backdrop-blur-md transition-all ${
          evaluatedResult.status === 'VERIFIED'
            ? 'border-emerald-500/50 bg-emerald-950/20 ring-1 ring-emerald-500/20'
            : evaluatedResult.status === 'CONTRADICTED'
            ? 'border-rose-500/50 bg-rose-950/20 ring-1 ring-rose-500/20'
            : 'border-amber-500/50 bg-amber-950/20 ring-1 ring-amber-500/20'
        }`}>
          {/* Header with Verdict */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">
                VERIFICATION VERDICT:
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 font-mono text-xs font-bold uppercase ${
                evaluatedResult.status === 'VERIFIED'
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  : evaluatedResult.status === 'CONTRADICTED'
                  ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                  : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
              }`}>
                {evaluatedResult.status === 'VERIFIED' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                {evaluatedResult.status === 'CONTRADICTED' && <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                {evaluatedResult.status === 'UNVERIFIED' && <HelpCircle className="h-3.5 w-3.5 text-amber-400" />}
                <span>{evaluatedResult.status}</span>
              </span>
            </div>

            <div className="font-mono text-[10px] text-slate-400">
              Evidence Timestamp: <span className="text-slate-300">{evaluatedResult.evidenceTimestamp}</span>
            </div>
          </div>

          {/* Submitted Claim Quote */}
          <div className="my-2.5 rounded bg-black/30 p-2.5 font-mono text-xs text-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase">Evaluated Claim:</span>
            "{evaluatedResult.claimText}"
          </div>

          {/* Metric Comparison Values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 font-mono text-xs">
            <div className="rounded border border-white/5 bg-black/20 p-2 text-slate-300">
              <span className="text-slate-400 text-[10px] block">Claimed Assertion Value:</span>
              <strong className="text-slate-100">{evaluatedResult.claimedValue}</strong>
            </div>
            <div className="rounded border border-white/5 bg-black/20 p-2 text-slate-300">
              <span className="text-slate-400 text-[10px] block">Actual Ground-Truth Telemetry:</span>
              <strong className={
                evaluatedResult.status === 'VERIFIED' ? 'text-emerald-400' :
                evaluatedResult.status === 'CONTRADICTED' ? 'text-rose-400' :
                'text-amber-400'
              }>
                {evaluatedResult.actualValue !== null ? evaluatedResult.actualValue : 'N/A (Missing from buffer)'}
              </strong>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-xs text-slate-200 leading-relaxed mt-2">
            {evaluatedResult.explanation}
          </p>

          {/* Limitations and Disclaimers */}
          <div className="mt-3 border-t border-white/10 pt-2 text-[11px] text-slate-400 space-y-1">
            <div>
              <strong className="text-slate-300">Data Limitations:</strong> {evaluatedResult.limitations}
            </div>
            <div className="text-[10px] italic text-slate-400/80">
              * Important Epistemic Invariant: Numerical agreement alone does not establish causality or prove underlying network conditions.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
