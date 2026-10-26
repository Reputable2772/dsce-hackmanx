import React, { useState, useEffect } from 'react';
import { 
  Send, 
  RotateCcw, 
  Activity, 
  HelpCircle, 
  FileText, 
  Copy, 
  Check, 
  BookOpen, 
  Scale, 
  Bot,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { SuggestedPromptList } from './SuggestedPromptList';
import { 
  ChatMessage, 
  CopilotStructuredResponse, 
  SuggestedPrompt 
} from '../types';
import { SUGGESTED_PROMPTS } from '../fixtures/copilotFixture';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const CopilotWorkspace: React.FC = () => {
  const selectedIncidentId = useAppStore((s) => s.selectedIncidentId);
  const gateState = useAppStore((s) => s.gateState);
  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  const [inputMessage, setInputMessage] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);

  // Active incident context loaded from backend
  const [incidentContext, setIncidentContext] = useState<any>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<Record<string, number | null>>({});

  // Clean initial messages — STRICTLY USER-TRIGGERED: No automatic pre-generated advice!
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      text: 'PRECURSOR Air-Gapped Diagnostic Copilot is ready. Guidance is strictly user-triggered. Click "Explain this incident" or ask a specific question below.',
      isDemo: false,
    },
  ]);

  // Load active incident context and telemetry snapshot when incident changes
  useEffect(() => {
    let isMounted = true;
    const fetchContext = async () => {
      try {
        const [statusRes, incRes] = await Promise.all([
          apiClient.fetchStatus().catch(() => null),
          apiClient.fetchIncidents().catch(() => null),
        ]);

        if (!isMounted) return;

        if (statusRes && statusRes.latest_metrics) {
          setLatestTelemetry(statusRes.latest_metrics);
        }

        if (incRes && incRes.incidents) {
          const match = selectedIncidentId
            ? incRes.incidents.find((i: any) => i.id === selectedIncidentId)
            : incRes.incidents[0];
          setIncidentContext(match || null);
        }
      } catch {
        // Safe fallback
      }
    };

    fetchContext();
  }, [selectedIncidentId]);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Explicit user action: Explain selected incident
  const handleExplainIncident = async () => {
    const incId = incidentContext?.id || selectedIncidentId;
    if (!incId) {
      setLastError('No active incident selected to explain.');
      return;
    }

    const action = () => handleExplainIncident();
    setLastAction(() => action);
    setLastError(null);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      text: `Explain incident ${incId}`,
      isDemo: !isConnected,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const resp = await apiClient.explainIncident(incId);
      if (!resp || !resp.summary) {
        throw new Error('Received empty response from Copilot service.');
      }

      const structured: CopilotStructuredResponse = {
        summary: resp.summary,
        observedEvidence: Object.entries(latestTelemetry)
          .filter(([_, v]) => v !== null)
          .map(([k, v]) => ({
            label: k.replace('_', ' ').toUpperCase(),
            value: String(v),
            context: 'Latest Telemetry Buffer Observation',
          })),
        hypotheses: (resp.hypotheses || []).map((h: string, idx: number) => ({
          title: `Diagnostic Hypothesis ${idx + 1}`,
          detail: h,
          confidence: 'Moderate' as const,
        })),
        diagnosticSteps: (resp.diagnostic_commands || []).map((cmd: string, idx: number) => ({
          step: idx + 1,
          command: cmd,
          explanation: 'Targeted CLI diagnostic command for operator execution',
        })),
        riskAndImpact: (resp.risks_and_rollback && resp.risks_and_rollback[0]) || 'Potential latency elevation or packet loss if unmitigated',
        verificationSteps: resp.verification_steps || ['Confirm latency returns below SLA', 'Verify zero packet drops'],
        rollbackConsiderations: (resp.risks_and_rollback && resp.risks_and_rollback[1]) || 'Restore standard BGP/ECMP egress paths if rerouting is applied',
        runbookReferences: (resp.matched_runbooks || []).map((rb: any) => ({
          id: rb.id || 'RB-REC',
          title: rb.title || 'Offline Diagnostic Runbook',
          source: 'precursor/copilot/runbooks',
          sampleOnly: false,
        })),
        claims: (resp.claim_verifications || []).map((c: any, idx: number) => ({
          id: `clm-${idx}`,
          claimText: c.statement || c.claim_text || '',
          claimedValue: String(c.claimed_value ?? ''),
          actualValue: String(c.observed_value ?? ''),
          metricId: c.metric_id || 'latency_ms',
          status: (c.verdict || c.status || 'UNVERIFIED') as any,
          explanation: c.explanation || '',
          limitations: `Checked within ${c.tolerance_pct || 5}% tolerance band`,
          evidenceTimestamp: new Date().toISOString(),
        })),
        modelUsed: resp.model_used || 'offline_heuristic_fallback',
      };

      const copilotMsg: ChatMessage = {
        id: `cop-${Date.now()}`,
        sender: 'copilot',
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        text: resp.summary,
        structuredResponse: structured,
        isDemo: !isConnected,
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      setLastError(err?.message || 'Failed to generate guidance from Copilot engine. Check backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const action = () => handleSendMessage(text);
    setLastAction(() => action);
    setLastError(null);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      text,
      isDemo: !isConnected,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const resp = await apiClient.queryCopilot(text);
      if (!resp || !resp.summary) {
        throw new Error('Copilot query returned empty response.');
      }

      const structured: CopilotStructuredResponse = {
        summary: resp.summary,
        observedEvidence: Object.entries(latestTelemetry)
          .filter(([_, v]) => v !== null)
          .map(([k, v]) => ({
            label: k.replace('_', ' ').toUpperCase(),
            value: String(v),
            context: 'Latest Telemetry Buffer Observation',
          })),
        hypotheses: (resp.hypotheses || []).map((h: string, idx: number) => ({
          title: `Hypothesis ${idx + 1}`,
          detail: h,
          confidence: 'Moderate' as const,
        })),
        diagnosticSteps: (resp.diagnostic_commands || []).map((cmd: string, idx: number) => ({
          step: idx + 1,
          command: cmd,
          explanation: 'Targeted CLI diagnostic command for operator execution',
        })),
        riskAndImpact: (resp.risks_and_rollback && resp.risks_and_rollback[0]) || 'Potential latency elevation if unmitigated',
        verificationSteps: resp.verification_steps || [],
        rollbackConsiderations: (resp.risks_and_rollback && resp.risks_and_rollback[1]) || 'Verify link state before resetting routes',
        runbookReferences: (resp.matched_runbooks || []).map((rb: any) => ({
          id: rb.id || 'RB-DOC',
          title: rb.title || 'Diagnostic Runbook Reference',
          source: 'precursor/copilot',
          sampleOnly: false,
        })),
        claims: (resp.claims || []).map((c: any, idx: number) => ({
          id: `clm-${idx}`,
          claimText: c.claim_text || '',
          claimedValue: String(c.claimed_value ?? ''),
          actualValue: String(c.actual_value ?? ''),
          metricId: 'latency_ms',
          status: (c.status || 'UNVERIFIED') as any,
          explanation: c.explanation || '',
          limitations: 'Checked against latest telemetry buffer',
          evidenceTimestamp: new Date().toISOString(),
        })),
        modelUsed: resp.model_used || 'offline_heuristic_fallback',
      };

      const copilotMsg: ChatMessage = {
        id: `cop-${Date.now()}`,
        sender: 'copilot',
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        text: resp.summary,
        structuredResponse: structured,
        isDemo: !isConnected,
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      setLastError(err?.message || 'Failed to query Copilot service. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestedPrompt = (p: SuggestedPrompt) => {
    handleSendMessage(p.prompt);
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'copilot',
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        text: 'New inquiry session started. Guidance is strictly user-triggered.',
        isDemo: false,
      },
    ]);
    setLastError(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. Context Banner: Active Incident & Relevant Telemetry */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#5267D8]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#202938]">
                  Offline Network Operations Copilot
                </span>
                <span className="rounded bg-[#EEF2FF] border border-[#CBD5E1] px-1.5 py-0.2 text-[10px] font-mono text-[#5267D8] font-semibold">
                  AIR-GAPPED
                </span>
                <span className={`rounded-full border px-2 py-0.2 text-[10px] font-mono font-bold ${
                  gateState === 'PREDICT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  GATE: {gateState}
                </span>
              </div>
              <p className="text-[11px] text-[#687386]">
                Context: <strong className="font-mono text-[#202938]">{incidentContext?.id || selectedIncidentId || 'None Selected'}</strong>
                {incidentContext?.title && <span> — {incidentContext.title}</span>}
              </p>
            </div>
          </div>

          {/* Explicit User Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExplainIncident}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5267D8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#4355B9] transition shadow-sm disabled:opacity-50"
              title="Explicitly generate AI explanation for active incident"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Explain this incident</span>
            </button>

            <button
              onClick={handleClearConversation}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#687386] hover:bg-[#F8FAFC] transition shadow-xs"
              title="Reset conversation"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Telemetry Snapshot Row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl bg-[#F8FAFC] border border-[#E3E8F0] p-2.5 text-xs font-mono">
          <div>
            <span className="text-[10px] text-[#687386] uppercase">Latency</span>
            <p className="font-bold text-[#202938]">
              {latestTelemetry.latency_ms !== null ? `${latestTelemetry.latency_ms} ms` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-[#687386] uppercase">Packet Loss</span>
            <p className={`font-bold ${(latestTelemetry.packet_loss_pct || 0) > 0 ? 'text-rose-600' : 'text-[#202938]'}`}>
              {latestTelemetry.packet_loss_pct !== null ? `${latestTelemetry.packet_loss_pct}%` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-[#687386] uppercase">Jitter</span>
            <p className="font-bold text-[#202938]">
              {latestTelemetry.jitter_ms !== null ? `${latestTelemetry.jitter_ms} ms` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-[#687386] uppercase">Throughput</span>
            <p className="font-bold text-[#202938]">
              {latestTelemetry.throughput_mbps !== null ? `${latestTelemetry.throughput_mbps} Mbps` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Prompts Toolbar */}
      <SuggestedPromptList
        prompts={SUGGESTED_PROMPTS}
        onSelectPrompt={handleSelectSuggestedPrompt}
      />

      {/* Error Banner with Retry */}
      {lastError && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{lastError}</span>
          </div>
          {lastAction && (
            <button
              onClick={() => lastAction()}
              className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-900 hover:bg-rose-200 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Message Bubble */}
            <div className={`max-w-3xl rounded-2xl border p-4 text-xs shadow-sm ${
              msg.sender === 'user'
                ? 'border-[#5267D8] bg-[#EEF2FF] text-[#202938] rounded-br-sm'
                : 'border-[#E3E8F0] bg-white text-[#202938] rounded-bl-sm'
            }`}>
              {/* Header row */}
              <div className="flex items-center justify-between gap-4 border-b border-[#E3E8F0] pb-2 mb-2 font-mono text-[10px] text-[#687386]">
                <span className="font-bold text-[#5267D8]">
                  {msg.sender === 'user' ? 'Network Operator' : 'PRECURSOR Offline Copilot'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Main Text */}
              <p className="text-xs leading-relaxed text-[#202938] font-medium mb-3">
                {msg.text}
              </p>

              {/* Structured Response Sections if available */}
              {msg.structuredResponse && (
                <div className="space-y-3.5 border-t border-[#E3E8F0] pt-3">
                  {/* 1. Measured Facts / Observed Evidence */}
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5267D8] flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>Measured Facts & Observed Evidence:</span>
                    </span>
                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                      {msg.structuredResponse.observedEvidence.map((ev, i) => (
                        <div key={i} className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-2">
                          <div className="flex justify-between">
                            <span className="text-[#687386]">{ev.label}:</span>
                            <span className="font-bold text-[#202938]">{ev.value}</span>
                          </div>
                          <div className="text-[10px] text-[#94A3B8] mt-0.5">{ev.context}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Diagnostic Hypotheses (EXPLICITLY HYPOTHESES) */}
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                      <HelpCircle className="h-3 w-3 text-amber-600" />
                      <span>Diagnostic Hypotheses (Unconfirmed Explanations):</span>
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {msg.structuredResponse.hypotheses.map((h, i) => (
                        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[11px]">
                          <div className="flex justify-between items-center text-amber-900 font-semibold">
                            <span>[HYPOTHESIS] {h.title}</span>
                            <span className="rounded bg-amber-100 border border-amber-200 px-1.5 py-0.2 text-[9px] font-mono text-amber-800">
                              Confidence: {h.confidence}
                            </span>
                          </div>
                          <p className="mt-0.5 text-amber-900/80 text-[10px] leading-relaxed">{h.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Recommended Checks & Diagnostic Steps (NEVER AUTO-EXECUTED) */}
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#202938] flex items-center gap-1">
                      <FileText className="h-3 w-3 text-[#5267D8]" />
                      <span>Recommended Diagnostic Commands (Operator Verification Required):</span>
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {msg.structuredResponse.diagnosticSteps.map((s) => (
                        <div key={s.step} className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-2 text-[11px]">
                          <div className="text-[#202938] font-medium">
                            Step {s.step}: {s.explanation}
                          </div>
                          <div className="mt-1 flex items-center justify-between rounded bg-[#1E293B] px-2.5 py-1 font-mono text-[10px] text-emerald-400">
                            <code>{s.command}</code>
                            <button
                              onClick={() => handleCopy(s.command)}
                              className="text-slate-400 hover:text-white transition ml-2"
                              title="Copy command"
                            >
                              {copiedCmd === s.command ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Potential Risks & Rollback Considerations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-2 text-rose-900">
                      <span className="font-mono text-[10px] font-bold uppercase block text-rose-700">
                        Operational Risk Analysis:
                      </span>
                      <p className="mt-0.5 text-[10px] text-rose-800 leading-relaxed">
                        {msg.structuredResponse.riskAndImpact}
                      </p>
                    </div>

                    <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-2 text-teal-900">
                      <span className="font-mono text-[10px] font-bold uppercase block text-teal-700">
                        Rollback Considerations:
                      </span>
                      <p className="mt-0.5 text-[10px] text-teal-800 leading-relaxed">
                        {msg.structuredResponse.rollbackConsiderations}
                      </p>
                    </div>
                  </div>

                  {/* 5. Bundled Runbook References */}
                  {msg.structuredResponse.runbookReferences.length > 0 && (
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#687386] flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-[#5267D8]" />
                        <span>Bundled Runbook References:</span>
                      </span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {msg.structuredResponse.runbookReferences.map((rb) => (
                          <div key={rb.id} className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E8F0] bg-[#F8FAFC] px-2.5 py-1 font-mono text-[10px] text-[#202938]">
                            <span className="font-bold text-[#5267D8]">{rb.id}</span>
                            <span>•</span>
                            <span>{rb.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. Embedded Numerical Claim Verification Results */}
                  {msg.structuredResponse.claims.length > 0 && (
                    <div className="border-t border-[#E3E8F0] pt-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#687386] flex items-center gap-1">
                        <Scale className="h-3 w-3 text-[#5267D8]" />
                        <span>Numerical Claim Verification Verdicts:</span>
                      </span>
                      <div className="mt-1.5 space-y-1 font-mono text-[10px]">
                        {msg.structuredResponse.claims.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[#202938]">
                            <span className="truncate max-w-md">"{c.claimText}"</span>
                            <span className={`font-bold ml-2 rounded px-1.5 py-0.2 border ${
                              c.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              c.status === 'CONTRADICTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              [{c.status}]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model mode tag */}
                  <div className="text-[10px] font-mono text-[#94A3B8] pt-1">
                    Provider Mode: {msg.structuredResponse.modelUsed}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] bg-white p-3 text-xs text-[#687386] shadow-sm">
            <RefreshCw className="h-4 w-4 animate-spin text-[#5267D8]" />
            <span>Analyzing incident context, checking numerical claims, and matching runbooks...</span>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage(inputMessage)}
          disabled={isLoading}
          placeholder="Ask Copilot a specific diagnostic question or request verification..."
          className="flex-1 rounded-xl border border-[#E3E8F0] bg-white px-3.5 py-2.5 text-xs text-[#202938] placeholder-[#94A3B8] shadow-xs outline-none transition focus:border-[#5267D8] focus:ring-1 focus:ring-[#5267D8] disabled:opacity-50"
        />
        <button
          onClick={() => handleSendMessage(inputMessage)}
          disabled={!inputMessage.trim() || isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#5267D8] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4355B9] shadow-sm disabled:opacity-50"
        >
          <Send className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analyzing...' : 'Ask Copilot'}</span>
        </button>
      </div>
    </div>
  );
};
