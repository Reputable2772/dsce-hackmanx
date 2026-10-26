import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Activity, 
  Zap, 
  Sparkles, 
  AlertTriangle, 
  Copy, 
  Check, 
  Clock, 
  Server, 
  ShieldAlert, 
  HelpCircle, 
  FileText
} from 'lucide-react';
import { IncidentRecord } from '../types';
import { useAppStore } from '@/stores/useAppStore';

interface IncidentDetailPanelProps {
  incident: IncidentRecord;
  onClose?: () => void;
}

export const IncidentDetailPanel: React.FC<IncidentDetailPanelProps> = ({
  incident
}) => {
  const navigate = useNavigate();
  const setSelectedNodeId = useAppStore((s) => s.setSelectedNodeId);
  const setSelectedIncidentId = useAppStore((s) => s.setSelectedIncidentId);

  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleNavigateWorld = () => {
    if (incident.affectedNodes.length > 0) {
      setSelectedNodeId(incident.affectedNodes[0]);
    }
    navigate('/');
  };

  const handleNavigateTelemetry = () => {
    navigate('/telemetry');
  };

  const handleNavigatePredictions = () => {
    navigate('/predictions');
  };

  const handleNavigateCopilot = () => {
    setSelectedIncidentId(incident.id);
    navigate('/copilot');
  };

  return (
    <div className="space-y-4 rounded-xl border border-violet-900/50 bg-navy-900/80 p-5 backdrop-blur-md">
      {/* Top Banner: ID, Status, Severity */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-cyan-400">
              {incident.id}
            </span>
            <span className={`rounded border px-2 py-0.5 text-xs font-mono font-bold uppercase ${
              incident.severity === 'CRITICAL' 
                ? 'border-rose-500/40 bg-rose-500/20 text-rose-300' 
                : incident.severity === 'HIGH' 
                ? 'border-amber-500/40 bg-amber-500/20 text-amber-300' 
                : 'border-yellow-500/40 bg-yellow-500/20 text-yellow-300'
            }`}>
              {incident.severity}
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300">
              {incident.status}
            </span>
            <span className="rounded bg-purple-900/40 border border-purple-500/30 px-2 py-0.5 text-xs font-mono text-purple-300">
              CATEGORY: {incident.category}
            </span>
          </div>

          <h3 className="mt-2 text-lg font-bold text-slate-100">
            {incident.title}
          </h3>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-3xl">
            {incident.summary}
          </p>
        </div>

        {/* Cross-Screen Navigation Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleNavigateWorld}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-mono text-cyan-300 transition hover:bg-cyan-500/20"
            title="Inspect affected component in 3D Network World"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>View in Network World</span>
          </button>

          <button
            onClick={handleNavigateTelemetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-700 bg-violet-800/30 px-3 py-1.5 text-xs font-mono text-violet-200 transition hover:bg-violet-800/50"
            title="View time series streams in Telemetry Explorer"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>View Telemetry</span>
          </button>

          <button
            onClick={handleNavigatePredictions}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-mono text-purple-300 transition hover:bg-purple-500/20"
            title="Inspect forward early warning predictions"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>View Prediction</span>
          </button>

          <button
            onClick={handleNavigateCopilot}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400 bg-cyan-400/20 px-3 py-1.5 text-xs font-mono font-bold text-cyan-200 transition hover:bg-cyan-400/30 shadow-[0_0_10px_rgba(72,221,245,0.2)]"
            title="Launch Offline AI Copilot investigation"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Investigate in Copilot</span>
          </button>
        </div>
      </div>

      {/* Component Nodes & Links */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 border-b border-violet-900/30 pb-3">
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-purple-400" />
          <span>Affected Nodes:</span>
          <span className="font-semibold text-cyan-300">{incident.affectedNodes.join(', ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Affected Links:</span>
          <span className="font-semibold text-slate-200">{incident.affectedLinks.join(', ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>Observed Window:</span>
          <span className="text-slate-300">{incident.firstObserved} - {incident.lastObserved}</span>
        </div>
      </div>

      {/* Section 1: Observed Evidence vs Baselines */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span>Observed Telemetry Evidence & SLA Breaches</span>
        </h4>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {incident.evidence.map((ev, i) => (
            <div key={i} className="rounded-lg border border-violet-900/50 bg-navy-950/70 p-3 text-xs font-mono">
              <span className="text-[11px] font-semibold text-slate-300 block">{ev.metric}</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-bold text-rose-400">{ev.observedValue}</span>
                <span className="text-[10px] text-slate-400">(Base: {ev.baseline})</span>
              </div>
              <div className="mt-1 text-[10px] text-amber-300 font-medium">{ev.delta}</div>
              <div className="mt-0.5 text-[9px] text-slate-400">{ev.timestamp}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Current Faults vs Future Predictions (ISOLATED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Current Active Faults */}
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/15 p-3.5">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
            <span className="text-xs font-bold text-rose-300 font-mono flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>Current Rule-Based Faults</span>
            </span>
            <span className="text-[10px] font-mono text-rose-400">Zero-Latency Rules</span>
          </div>
          <div className="mt-2 space-y-2">
            {incident.currentFaults.length > 0 ? (
              incident.currentFaults.map(f => (
                <div key={f.id} className="rounded border border-rose-500/20 bg-black/30 p-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-rose-300">{f.rule}</span>
                    <span className="text-cyan-300">{f.interfaceId}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Observed: <strong className="text-rose-400">{f.value}</strong>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No immediate physical fault currently registered.</span>
            )}
          </div>
        </div>

        {/* Right: Predicted Future Service Impact */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-950/15 p-3.5">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
            <span className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>Predicted Future Service Impact</span>
            </span>
            <span className="text-[10px] font-mono text-purple-400">Early Warning Horizons</span>
          </div>
          <div className="mt-2 space-y-2">
            {incident.futurePredictions.map(p => (
              <div key={p.id} className="rounded border border-purple-500/20 bg-black/30 p-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[10px] text-purple-300 font-bold">
                    +{p.horizon}M LOOKAHEAD
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Score: <strong className="text-amber-400">{p.score.toFixed(2)}</strong> (Illustrative)
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-200">{p.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Contributing Factors (EXPLICITLY HYPOTHESES) */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
          <span>Contributing Factors (Hypotheses — Not Established Facts)</span>
        </h4>
        <div className="mt-2 space-y-2">
          {incident.hypotheses.map(h => (
            <div key={h.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-200">
                  [HYPOTHESIS] {h.title}
                </span>
                <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-mono text-amber-300">
                  Likelihood: {h.likelihood}
                </span>
              </div>
              <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">
                {h.rationale}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Suggested Diagnostic Steps */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-purple-400" />
          <span>Suggested Diagnostic Steps & Operational Commands</span>
        </h4>
        <div className="mt-2 space-y-2">
          {incident.diagnosticSteps.map(step => (
            <div key={step.step} className="rounded-lg border border-violet-900/40 bg-navy-950/70 p-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                  {step.step}
                </span>
                <span>{step.action}</span>
              </div>

              {step.command && (
                <div className="mt-2 flex items-center justify-between rounded bg-black/50 px-3 py-1.5 font-mono text-[11px] text-cyan-300">
                  <code>{step.command}</code>
                  <button
                    onClick={() => handleCopy(step.command!)}
                    className="text-slate-400 hover:text-white transition ml-2"
                    title="Copy command to clipboard"
                  >
                    {copiedCmd === step.command ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}

              <div className="mt-1.5 text-[10px] font-mono text-slate-400">
                Expected Result: {step.expected}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Potential Remediations, Risks & Rollback */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <span>Potential Remediation Options (Operator Verification Required)</span>
        </h4>

        <div className="my-1.5 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
          <strong>Safety Invariant:</strong> Remediation options below are advisory proposals only. No command or traffic change has been executed automatically.
        </div>

        <div className="space-y-2.5 mt-2">
          {incident.remediations.map((rem, i) => (
            <div key={i} className="rounded-lg border border-violet-900/50 bg-navy-950/60 p-3 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200">
                Option {i + 1}: {rem.action}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="rounded bg-rose-950/30 border border-rose-500/20 p-2 text-rose-300">
                  <span className="font-bold block text-[10px] uppercase">Associated Risks:</span>
                  {rem.risk}
                </div>
                <div className="rounded bg-cyan-950/30 border border-cyan-500/20 p-2 text-cyan-300">
                  <span className="font-bold block text-[10px] uppercase">Rollback Considerations:</span>
                  {rem.rollback}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
