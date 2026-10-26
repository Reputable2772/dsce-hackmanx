import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Scale,
  Loader2
} from 'lucide-react';
import { ClaimVerificationRecord, ClaimStatus } from '../types';
import { PREDEFINED_CLAIMS } from '../fixtures/copilotFixture';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/useAppStore';

export const ClaimVerificationSection: React.FC = () => {
  const [claimInput, setClaimInput] = useState('');
  const [evaluatedResult, setEvaluatedResult] = useState<ClaimVerificationRecord | null>(PREDEFINED_CLAIMS[0]);
  const [isVerifying, setIsVerifying] = useState(false);

  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  const handleVerify = async (textToVerify: string) => {
    const trimmed = textToVerify.trim();
    if (!trimmed) return;

    if (isConnected) {
      setIsVerifying(true);
      try {
        const res = await apiClient.verifyClaim(trimmed);
        if (res && res.verifications && res.verifications.length > 0) {
          const v = res.verifications[0];
          setEvaluatedResult({
            id: `claim-${Date.now()}`,
            claimText: v.claim_text || trimmed,
            metricId: v.metric_id || 'telemetry',
            claimedValue: String(v.claimed_value),
            actualValue: v.actual_value !== null && v.actual_value !== undefined ? String(v.actual_value) : null,
            status: v.status as ClaimStatus,
            explanation: v.explanation || 'Verified against live engine telemetry buffer.',
            limitations: 'Calculated against live engine telemetry buffer with ±10% relative tolerance.',
            evidenceTimestamp: new Date().toLocaleTimeString(),
          });
          setIsVerifying(false);
          return;
        }
      } catch {
        // Fall back gracefully to local matching
      } finally {
        setIsVerifying(false);
      }
    }

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
        explanation: 'UNVERIFIED: No numerical metric assertion detected, or backend verifier is unreachable.',
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
    <div className="space-y-4 rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E8F0] pb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-[#5267D8]" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#202938]">
            Numerical Claim Verifier
          </h3>
          <span className="rounded bg-[#EEF2FF] border border-[#CBD5E1] px-2 py-0.5 font-mono text-[10px] text-[#5267D8] font-bold">
            EVIDENCE CHECKING
          </span>
        </div>

        <div className={`rounded-lg border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
          isConnected
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          {isConnected ? 'LIVE ENGINE VERIFIER (±10% TOLERANCE)' : 'DEMO VERIFICATION — STANDALONE EVIDENCE CHECK'}
        </div>
      </div>

      <p className="text-xs text-[#687386] leading-relaxed">
        Submit any numerical operational claim (e.g., latency limits, packet loss figures, throughput stats). The verifier parses metric assertions and validates them against the ground-truth telemetry observation buffer within ±10% tolerance.
      </p>

      {/* Predefined Claim Examples */}
      <div>
        <span className="text-[11px] font-mono text-[#687386] block mb-1.5 font-semibold">
          Select Predefined Example Claim to Verify:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PREDEFINED_CLAIMS.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectExample(c)}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-2.5 text-left text-xs transition hover:border-[#5267D8] hover:bg-white shadow-xs group"
            >
              <div className="line-clamp-2 text-[11px] text-[#334155] group-hover:text-[#202938]">
                "{c.claimText}"
              </div>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border ${
                c.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                c.status === 'CONTRADICTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
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
          className="flex-1 rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-xs text-[#202938] placeholder-[#94A3B8] outline-none transition focus:border-[#5267D8] focus:ring-1 focus:ring-[#5267D8]"
        />
        <button
          onClick={() => handleVerify(claimInput)}
          disabled={!claimInput.trim() || isVerifying}
          className="flex flex-col items-center justify-center rounded-xl bg-[#5267D8] px-4 text-xs font-mono font-bold text-white transition hover:bg-[#4355B9] shadow-sm disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mb-0.5 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <Scale className="h-4 w-4 mb-0.5" />
              <span>Check Claim</span>
            </>
          )}
        </button>
      </div>

      {/* Evaluation Result Card */}
      {evaluatedResult && (
        <div className={`rounded-xl border p-4 transition-all shadow-xs ${
          evaluatedResult.status === 'VERIFIED'
            ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
            : evaluatedResult.status === 'CONTRADICTED'
            ? 'border-rose-200 bg-rose-50/40 text-rose-950'
            : 'border-amber-200 bg-amber-50/40 text-amber-950'
        }`}>
          {/* Header with Verdict */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#687386]">
                VERIFICATION VERDICT:
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 font-mono text-xs font-bold uppercase ${
                evaluatedResult.status === 'VERIFIED'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : evaluatedResult.status === 'CONTRADICTED'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}>
                {evaluatedResult.status === 'VERIFIED' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                {evaluatedResult.status === 'CONTRADICTED' && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                {evaluatedResult.status === 'UNVERIFIED' && <HelpCircle className="h-3.5 w-3.5 text-amber-600" />}
                <span>{evaluatedResult.status}</span>
              </span>
            </div>

            <div className="font-mono text-[10px] text-[#687386]">
              Evidence Timestamp: <span className="font-semibold text-[#202938]">{evaluatedResult.evidenceTimestamp}</span>
            </div>
          </div>

          {/* Submitted Claim Quote */}
          <div className="my-2.5 rounded-lg bg-white border border-[#E3E8F0] p-2.5 font-mono text-xs text-[#202938] shadow-xs">
            <span className="text-[#687386] block text-[10px] uppercase font-bold">Evaluated Claim:</span>
            "{evaluatedResult.claimText}"
          </div>

          {/* Metric Comparison Values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 font-mono text-xs">
            <div className="rounded-lg border border-[#E3E8F0] bg-white p-2.5 text-[#334155] shadow-xs">
              <span className="text-[#687386] text-[10px] block font-bold uppercase">Claimed Assertion Value:</span>
              <strong className="text-[#202938] text-sm">{evaluatedResult.claimedValue}</strong>
            </div>
            <div className="rounded-lg border border-[#E3E8F0] bg-white p-2.5 text-[#334155] shadow-xs">
              <span className="text-[#687386] text-[10px] block font-bold uppercase">Actual Ground-Truth Telemetry:</span>
              <strong className={`text-sm ${
                evaluatedResult.status === 'VERIFIED' ? 'text-emerald-700' :
                evaluatedResult.status === 'CONTRADICTED' ? 'text-rose-700' :
                'text-amber-700'
              }`}>
                {evaluatedResult.actualValue !== null ? evaluatedResult.actualValue : 'N/A (Missing from buffer)'}
              </strong>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-xs text-[#334155] leading-relaxed mt-2 font-sans">
            {evaluatedResult.explanation}
          </p>

          {/* Limitations and Disclaimers */}
          <div className="mt-3 border-t border-[#E3E8F0] pt-2 text-[11px] text-[#687386] space-y-1">
            <div>
              <strong className="text-[#202938]">Data Limitations:</strong> {evaluatedResult.limitations}
            </div>
            <div className="text-[10px] italic text-[#94A3B8]">
              * Important Epistemic Invariant: Numerical agreement alone does not establish causality or prove underlying network conditions.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
