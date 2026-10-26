import React, { useState } from 'react';
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
  Bot
} from 'lucide-react';
import { SuggestedPromptList } from './SuggestedPromptList';
import { 
  ChatMessage, 
  CopilotStructuredResponse, 
  SuggestedPrompt 
} from '../types';
import { 
  SUGGESTED_PROMPTS, 
  DEFAULT_COPILOT_RESPONSES 
} from '../fixtures/copilotFixture';
import { useAppStore } from '@/stores/useAppStore';

export const CopilotWorkspace: React.FC = () => {
  const selectedIncidentId = useAppStore((s) => s.selectedIncidentId);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);

  const [inputMessage, setInputMessage] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Initial demonstration chat history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'copilot',
      timestamp: '14:04:45 UTC',
      text: 'PRECURSOR Copilot initialised in offline heuristic mode. Active incident context: ' + (selectedIncidentId || 'INC-2026-0842') + '. What would you like to investigate?',
      structuredResponse: DEFAULT_COPILOT_RESPONSES['p-1'],
      isDemo: true
    }
  ]);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSendMessage = (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    // User message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      text,
      isDemo: true
    };

    // Determine matched response from fixture
    let response: CopilotStructuredResponse;
    const lower = text.toLowerCase();
    if (lower.includes('p-2') || lower.includes('claim') || lower.includes('verify')) {
      response = DEFAULT_COPILOT_RESPONSES['p-2'];
    } else if (lower.includes('p-1') || lower.includes('spine') || lower.includes('root cause') || lower.includes('saturation')) {
      response = DEFAULT_COPILOT_RESPONSES['p-1'];
    } else {
      response = {
        ...DEFAULT_COPILOT_RESPONSES['default'],
        summary: `Analysis of query: "${text}". Grounded strictly in active 5-second telemetry observations and bundled diagnostic runbooks.`
      };
    }

    const copilotMsg: ChatMessage = {
      id: `cop-${Date.now()}`,
      sender: 'copilot',
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      text: response.summary,
      structuredResponse: response,
      isDemo: true
    };

    setMessages(prev => [...prev, userMsg, copilotMsg]);
    setInputMessage('');
  };

  const handleSelectSuggestedPrompt = (p: SuggestedPrompt) => {
    handleSendMessage(p.prompt);
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'copilot',
        timestamp: '14:05:00 UTC',
        text: 'New demonstration conversation started. Grounded strictly in offline telemetry evidence.',
        structuredResponse: DEFAULT_COPILOT_RESPONSES['p-1'],
        isDemo: true
      }
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Context Banner & Demo Disclaimer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-900/40 bg-navy-900/60 p-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/20 text-purple-300">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-200">
                OFFLINE COPILOT PREVIEW
              </span>
              <span className="rounded bg-violet-900/60 border border-violet-800 px-1.5 py-0.2 text-[10px] font-mono text-purple-300">
                HEURISTIC RUNBOOK MATCHER
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Active Context: <span className="text-cyan-300">{selectedIncidentId || 'INC-2026-0842'}</span>
              {selectedNodeId && <span> • Target Node: <strong className="text-purple-300">{selectedNodeId}</strong></span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-mono text-amber-300">
            PREVIEW ONLY — NOT LIVE ADVICE
          </div>
          <button
            onClick={handleClearConversation}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            title="Reset conversation"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Suggested Prompts Accordion / Toolbar */}
      <SuggestedPromptList
        prompts={SUGGESTED_PROMPTS}
        onSelectPrompt={handleSelectSuggestedPrompt}
      />

      {/* Chat Messages Stream */}
      <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Message Bubble */}
            <div className={`max-w-3xl rounded-xl border p-4 text-xs backdrop-blur-md ${
              msg.sender === 'user'
                ? 'border-purple-500/40 bg-purple-950/40 text-slate-100 rounded-br-sm'
                : 'border-violet-900/40 bg-navy-900/80 text-slate-200 rounded-bl-sm'
            }`}>
              {/* Header row */}
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 mb-2 font-mono text-[10px] text-slate-400">
                <span className="font-bold text-cyan-300">
                  {msg.sender === 'user' ? 'Operator' : 'PRECURSOR Copilot (Offline Heuristic)'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Main Text */}
              <p className="text-xs leading-relaxed text-slate-200 font-medium mb-3">
                {msg.text}
              </p>

              {/* Structured Response Sections if available */}
              {msg.structuredResponse && (
                <div className="space-y-3.5 border-t border-violet-900/40 pt-3">
                  {/* 1. Observed Evidence */}
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>Observed Telemetry Evidence:</span>
                    </span>
                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                      {msg.structuredResponse.observedEvidence.map((ev, i) => (
                        <div key={i} className="rounded border border-violet-900/50 bg-black/30 p-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{ev.label}:</span>
                            <span className="font-bold text-rose-400">{ev.value}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{ev.context}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Hypotheses (EXPLICITLY HYPOTHESES) */}
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />
                      <span>Possible Explanations (Hypotheses — Not Confirmed Facts):</span>
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {msg.structuredResponse.hypotheses.map((h, i) => (
                        <div key={i} className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[11px]">
                          <div className="flex justify-between items-center text-amber-200 font-semibold">
                            <span>[HYPOTHESIS] {h.title}</span>
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono text-amber-300">
                              Confidence: {h.confidence}
                            </span>
                          </div>
                          <p className="mt-0.5 text-slate-300 text-[10px] leading-relaxed">{h.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Recommended Diagnostic Steps with Copyable Commands */}
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Recommended Diagnostic Steps:</span>
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {msg.structuredResponse.diagnosticSteps.map((s) => (
                        <div key={s.step} className="rounded border border-violet-900/40 bg-navy-950 p-2 text-[11px]">
                          <div className="text-slate-300 font-medium">
                            Step {s.step}: {s.explanation}
                          </div>
                          <div className="mt-1 flex items-center justify-between rounded bg-black/60 px-2.5 py-1 font-mono text-[10px] text-cyan-300">
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

                  {/* 4. Risk, Impact & Rollback */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded border border-rose-500/20 bg-rose-950/20 p-2 text-rose-200">
                      <span className="font-mono text-[10px] font-bold uppercase block text-rose-300">
                        Risk & Impact Analysis:
                      </span>
                      <p className="mt-0.5 text-[10px] text-slate-300 leading-relaxed">
                        {msg.structuredResponse.riskAndImpact}
                      </p>
                    </div>

                    <div className="rounded border border-cyan-500/20 bg-cyan-950/20 p-2 text-cyan-200">
                      <span className="font-mono text-[10px] font-bold uppercase block text-cyan-300">
                        Rollback Considerations:
                      </span>
                      <p className="mt-0.5 text-[10px] text-slate-300 leading-relaxed">
                        {msg.structuredResponse.rollbackConsiderations}
                      </p>
                    </div>
                  </div>

                  {/* 5. Supporting Runbook References (Sample Only) */}
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-purple-400" />
                      <span>Supporting Runbook References (Sample Documentation):</span>
                    </span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {msg.structuredResponse.runbookReferences.map((rb) => (
                        <div key={rb.id} className="inline-flex items-center gap-1.5 rounded border border-violet-800/40 bg-navy-950 px-2.5 py-1 font-mono text-[10px] text-slate-300">
                          <span className="font-bold text-cyan-400">{rb.id}</span>
                          <span>•</span>
                          <span>{rb.title}</span>
                          <span className="text-[9px] text-slate-500">(Sample)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Embedded Verified Claims */}
                  {msg.structuredResponse.claims.length > 0 && (
                    <div className="border-t border-violet-900/30 pt-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Scale className="h-3 w-3 text-cyan-400" />
                        <span>Numerical Claims Checked in Response:</span>
                      </span>
                      <div className="mt-1.5 space-y-1 font-mono text-[10px]">
                        {msg.structuredResponse.claims.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded bg-black/40 px-2.5 py-1 text-slate-300">
                            <span className="truncate max-w-md">"{c.claimText}"</span>
                            <span className={`font-bold ml-2 ${
                              c.status === 'VERIFIED' ? 'text-emerald-400' :
                              c.status === 'CONTRADICTED' ? 'text-rose-400' :
                              'text-amber-400'
                            }`}>
                              [{c.status}]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model tag */}
                  <div className="text-[9px] font-mono text-slate-400/80 pt-1">
                    Engine: {msg.structuredResponse.modelUsed}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
          placeholder="Ask Copilot to investigate an incident, verify a numerical claim, or explain gate state..."
          className="flex-1 rounded-lg border border-violet-800/60 bg-navy-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
        />
        <button
          onClick={() => handleSendMessage(inputMessage)}
          disabled={!inputMessage.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-4 py-2 text-xs font-mono font-bold text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
