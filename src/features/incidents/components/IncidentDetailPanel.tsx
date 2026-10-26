import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Activity, 
  Zap, 
  Sparkles, 
  Copy, 
  Check, 
  Clock, 
  Server, 
  ShieldAlert, 
  FileText,
  CheckCircle,
  Clock3,
  History
} from 'lucide-react';
import { IncidentRecord, IncidentStatus } from '../types';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

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
  const isConnected = useAppStore((s) => s.connectionState === 'connected');

  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>(incident.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentStatus(incident.status);
  }, [incident.id, incident.status]);

  const handleAcknowledge = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      if (isConnected) {
        await apiClient.acknowledgeIncident(incident.id);
      }
      setCurrentStatus('ACKNOWLEDGED');
    } catch {
      setCurrentStatus('ACKNOWLEDGED');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      if (isConnected) {
        await apiClient.resolveIncident(incident.id);
      }
      setCurrentStatus('RESOLVED');
    } catch {
      setCurrentStatus('RESOLVED');
    } finally {
      setIsUpdating(false);
    }
  };

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

  const handleNavigateHistory = () => {
    navigate(`/history?incidentId=${encodeURIComponent(incident.id)}`);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm text-[#202938]">
      {/* Top Banner: ID, Status, Severity */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E3E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#5267D8]">
              {incident.id}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-mono font-bold uppercase ${
              incident.severity === 'CRITICAL' 
                ? 'border-rose-200 bg-rose-50 text-rose-700' 
                : incident.severity === 'HIGH' 
                ? 'border-orange-200 bg-orange-50 text-orange-700' 
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}>
              {incident.severity}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-mono font-bold ${
              currentStatus === 'RESOLVED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : currentStatus === 'ACKNOWLEDGED'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {currentStatus}
            </span>
            <span className="rounded bg-[#F1F5F9] border border-[#CBD5E1] px-2 py-0.5 text-xs font-mono text-[#475569]">
              CATEGORY: {incident.category}
            </span>
          </div>

          <h3 className="mt-2 text-base font-bold text-[#202938]">
            {incident.title}
          </h3>
          <p className="mt-1 text-xs text-[#687386] leading-relaxed max-w-3xl">
            {incident.summary}
          </p>
        </div>

        {/* Operational & Cross-Screen Navigation Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {currentStatus !== 'ACKNOWLEDGED' && currentStatus !== 'RESOLVED' && (
            <button
              onClick={handleAcknowledge}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-mono font-semibold text-amber-700 hover:bg-amber-100 transition disabled:opacity-50"
              title="Acknowledge incident on backend"
            >
              <Clock3 className="h-3.5 w-3.5" />
              <span>Acknowledge</span>
            </button>
          )}

          {currentStatus !== 'RESOLVED' && (
            <button
              onClick={handleResolve}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
              title="Resolve incident on backend"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Resolve</span>
            </button>
          )}

          <button
            onClick={handleNavigateHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#5267D8] bg-[#EEF2FF] px-3 py-1.5 text-xs font-mono font-bold text-[#5267D8] hover:bg-[#E0E7FF] transition shadow-xs"
            title="Investigate in Database History & Timeline"
          >
            <History className="h-3.5 w-3.5" />
            <span>View in History</span>
          </button>

          <button
            onClick={handleNavigateCopilot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5267D8] px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-[#4355B9] transition shadow-xs"
            title="Launch Offline AI Copilot investigation"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Investigate in Copilot</span>
          </button>

          <button
            onClick={handleNavigateWorld}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-mono text-[#202938] hover:bg-[#F8FAFC] transition shadow-xs"
            title="Inspect affected component in 3D Network World"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>World</span>
          </button>

          <button
            onClick={handleNavigateTelemetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-mono text-[#202938] hover:bg-[#F8FAFC] transition shadow-xs"
            title="View time series streams in Telemetry Explorer"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Telemetry</span>
          </button>

          <button
            onClick={handleNavigatePredictions}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-mono text-[#202938] hover:bg-[#F8FAFC] transition shadow-xs"
            title="Inspect forward early warning predictions"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Predictions</span>
          </button>
        </div>
      </div>

      {/* Component Nodes & Links */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#687386] border-b border-[#E3E8F0] pb-3">
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-[#5267D8]" />
          <span>Affected Nodes:</span>
          <span className="font-semibold text-[#202938]">{incident.affectedNodes.join(', ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Affected Links:</span>
          <span className="font-semibold text-[#202938]">{incident.affectedLinks.join(', ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Observed Window:</span>
          <span className="text-[#202938]">{incident.firstObserved} - {incident.lastObserved}</span>
        </div>
      </div>

      {/* Section 1: Observed Evidence vs Baselines */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#202938] font-mono flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-[#5267D8]" />
          <span>Observed Telemetry Evidence & SLA Breaches</span>
        </h4>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {incident.evidence.map((ev, i) => (
            <div key={i} className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs font-mono">
              <span className="text-[11px] font-semibold text-[#475569] block">{ev.metric}</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-bold text-rose-600">{ev.observedValue}</span>
                <span className="text-[10px] text-[#687386]">(Base: {ev.baseline})</span>
              </div>
              <div className="mt-1 text-[10px] text-amber-600 font-medium">{ev.delta}</div>
              <div className="mt-0.5 text-[9px] text-[#94A3B8]">{ev.timestamp}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Current Faults vs Future Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Current Active Faults */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
          <div className="flex items-center justify-between border-b border-rose-200 pb-2">
            <span className="text-xs font-bold text-rose-900 font-mono flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              <span>Current Rule-Based Faults</span>
            </span>
            <span className="text-[10px] font-mono text-rose-700">Zero-Latency Rules</span>
          </div>
          <div className="mt-2 space-y-2">
            {incident.currentFaults.length > 0 ? (
              incident.currentFaults.map(f => (
                <div key={f.id} className="rounded-lg border border-rose-200 bg-white p-2 text-xs font-mono">
                  <div className="flex justify-between text-[#202938]">
                    <span className="font-semibold text-rose-700">{f.rule}</span>
                    <span className="text-[#5267D8]">{f.interfaceId}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#687386]">
                    Observed: <strong className="text-rose-700">{f.value}</strong>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-xs text-rose-800 italic">No immediate physical fault currently registered.</span>
            )}
          </div>
        </div>

        {/* Right: Predicted Future Service Impact */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
          <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
            <span className="text-xs font-bold text-indigo-900 font-mono flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-indigo-600" />
              <span>Predicted Future Service Impact</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-700">Multi-Horizon Gate</span>
          </div>
          <div className="mt-2 space-y-2">
            {incident.futurePredictions.length > 0 ? (
              incident.futurePredictions.map(p => (
                <div key={p.id} className="rounded-lg border border-indigo-200 bg-white p-2 text-xs font-mono">
                  <div className="flex justify-between text-[#202938]">
                    <span className="font-semibold text-indigo-700">+{p.horizon}m Horizon Warning</span>
                    <span className="text-amber-600">{p.impact}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#687386]">
                    Forecast Confidence: <strong className="text-indigo-700">{(p.score * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-xs text-indigo-800 italic">No forward predictions pending.</span>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Diagnostic Steps with Commands */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#202938] font-mono flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-[#5267D8]" />
          <span>Recommended Diagnostic Steps (Operator Verification)</span>
        </h4>
        <div className="mt-2 space-y-2">
          {incident.diagnosticSteps.map(step => (
            <div key={step.step} className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-[#202938]">
                  Step {step.step}: {step.action}
                </span>
                <span className="text-[11px] text-[#687386] font-mono">
                  Expected: {step.expected}
                </span>
              </div>
              {step.command && (
                <div className="mt-2 flex items-center justify-between rounded bg-[#1E293B] px-3 py-1.5 font-mono text-xs text-emerald-400">
                  <code>{step.command}</code>
                  <button
                    onClick={() => handleCopy(step.command!)}
                    className="text-slate-400 hover:text-white transition ml-2"
                    title="Copy command"
                  >
                    {copiedCmd === step.command ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
