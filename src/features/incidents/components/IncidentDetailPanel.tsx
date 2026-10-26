import React, { useState, useEffect } from 'react';
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
  History,
  Layers,
  BarChart3,
  Terminal,
  AlertCircle,
  FileCode,
  X
} from 'lucide-react';
import { IncidentRecord, IncidentStatus } from '../types';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';
import { PacketForensicsTab } from './PacketForensicsTab';
import { HypothesisEntailmentMatrix } from '@/features/copilot/components/HypothesisEntailmentMatrix';

interface IncidentDetailPanelProps {
  incident: IncidentRecord;
  onClose?: () => void;
}

export const IncidentDetailPanel: React.FC<IncidentDetailPanelProps> = ({
  incident: rawIncident,
  onClose,
}) => {
  const navigate = useNavigate();
  const setSelectedNodeId = useAppStore((s) => s.setSelectedNodeId);
  const setSelectedIncidentId = useAppStore((s) => s.setSelectedIncidentId);
  const isConnected = useAppStore((s) => s.connectionState === 'connected');

  // Defensive array extractions guaranteeing no undefined.join() or undefined.map()
  const incident = rawIncident || ({} as IncidentRecord);
  const affectedNodes = Array.isArray(incident.affectedNodes) ? incident.affectedNodes : [];
  const affectedLinks = Array.isArray(incident.affectedLinks) ? incident.affectedLinks : [];
  const primaryMetrics = Array.isArray(incident.primaryMetrics) ? incident.primaryMetrics : [];
  const evidence = Array.isArray(incident.evidence) ? incident.evidence : [];
  const currentFaults = Array.isArray(incident.currentFaults) ? incident.currentFaults : [];
  const futurePredictions = Array.isArray(incident.futurePredictions) ? incident.futurePredictions : [];
  const diagnosticSteps = Array.isArray(incident.diagnosticSteps) ? incident.diagnosticSteps : [];
  const hypotheses = Array.isArray(incident.hypotheses) ? incident.hypotheses : [];
  const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];

  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'packets' | 'gate' | 'copilot' | 'timeline'>('overview');
  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>(incident.status || 'OPEN');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Historical telemetry points state for telemetry tab
  const [telemetryPoints, setTelemetryPoints] = useState<any[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  useEffect(() => {
    setCurrentStatus(incident.status || 'OPEN');
  }, [incident.id, incident.status]);

  // Load telemetry when telemetry tab is opened
  useEffect(() => {
    if (activeTab === 'telemetry' && incident.id && isConnected) {
      setLoadingTelemetry(true);
      const now = Math.floor(Date.now() / 1000);
      apiClient.fetchHistoricalTelemetry(now - 600, now, primaryMetrics[0] || 'latency_ms', 50)
        .then((res) => {
          setTelemetryPoints(Array.isArray(res?.points) ? res.points : []);
        })
        .catch(() => {
          setTelemetryPoints([]);
        })
        .finally(() => {
          setLoadingTelemetry(false);
        });
    }
  }, [activeTab, incident.id, isConnected]);

  const handleAcknowledge = async () => {
    if (isUpdating || !incident.id) return;
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
    if (isUpdating || !incident.id) return;
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
    if (affectedNodes.length > 0) {
      setSelectedNodeId(affectedNodes[0]);
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
    if (incident.id) {
      setSelectedIncidentId(incident.id);
    }
    navigate('/copilot');
  };

  const handleNavigateHistory = () => {
    if (incident.id) {
      navigate(`/history?incidentId=${encodeURIComponent(incident.id)}`);
    } else {
      navigate('/history');
    }
  };

  const severityBadgeClass = 
    incident.severity === 'CRITICAL' 
      ? 'border-rose-200 bg-rose-50 text-rose-700' 
      : incident.severity === 'HIGH' 
      ? 'border-orange-200 bg-orange-50 text-orange-700' 
      : incident.severity === 'INFO'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

  const statusBadgeClass =
    currentStatus === 'RESOLVED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : currentStatus === 'ACKNOWLEDGED'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : currentStatus === 'INVESTIGATING'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="space-y-4 rounded-xl border border-[#E3E8F0] bg-white p-5 shadow-sm text-[#202938]">
      {/* Top Banner: ID, Status, Severity, Category */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E3E8F0] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#5267D8]">
              {incident.id || 'INC-UNKNOWN'}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${severityBadgeClass}`}>
              {incident.severity || 'WARNING'}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${statusBadgeClass}`}>
              {currentStatus}
            </span>
            <span className="rounded-md bg-[#F1F5F9] border border-[#CBD5E1] px-2 py-0.5 text-[11px] font-mono font-medium text-[#475569]">
              CATEGORY: {incident.category || 'ANOMALY'}
            </span>
            {incident.isActiveFault && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                ACTIVE FAULT
              </span>
            )}
          </div>

          <h3 className="mt-2 text-base font-bold text-[#202938]">
            {incident.title || 'Untitled Incident'}
          </h3>
          <p className="mt-1 text-xs text-[#687386] leading-relaxed max-w-3xl">
            {incident.summary || 'No incident summary available.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {currentStatus !== 'ACKNOWLEDGED' && currentStatus !== 'RESOLVED' && (
            <button
              onClick={handleAcknowledge}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-mono font-semibold text-amber-800 hover:bg-amber-100 transition shadow-xs disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-xs disabled:opacity-50"
              title="Resolve incident on backend"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Resolve</span>
            </button>
          )}

          <button
            onClick={handleNavigateCopilot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5267D8] px-3 py-1.5 text-xs font-mono font-semibold text-white hover:bg-[#4355B9] transition shadow-xs"
            title="Launch Offline AI Copilot investigation"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Investigate</span>
          </button>

          <button
            onClick={handleNavigateHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs font-mono text-[#202938] hover:bg-[#F8FAFC] transition shadow-xs"
            title="View in History"
          >
            <History className="h-3.5 w-3.5 text-[#5267D8]" />
            <span>History</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-[#E3E8F0] bg-white p-1.5 text-xs text-[#687386] hover:bg-[#F8FAFC] hover:text-[#202938] transition shadow-xs"
              title="Close Panel"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Structured Navigation Tabs: Overview, Telemetry, Gate & Predictions, Copilot, Timeline */}
      <div className="flex items-center gap-1 border-b border-[#E3E8F0] text-xs font-medium text-[#687386]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 font-semibold transition ${
            activeTab === 'overview'
              ? 'border-[#5267D8] text-[#5267D8]'
              : 'border-transparent hover:border-slate-300 hover:text-[#202938]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 font-semibold transition ${
            activeTab === 'telemetry'
              ? 'border-[#5267D8] text-[#5267D8]'
              : 'border-transparent hover:border-slate-300 hover:text-[#202938]'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Telemetry ({evidence.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('packets')}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 font-semibold transition ${
            activeTab === 'packets'
              ? 'border-[#5267D8] text-[#5267D8]'
              : 'border-transparent hover:border-slate-300 hover:text-[#202938]'
          }`}
        >
          <FileCode className="h-3.5 w-3.5" />
          <span>Packet Forensics</span>
        </button>
        <button
          onClick={() => setActiveTab('gate')}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 font-semibold transition ${
            activeTab === 'gate'
              ? 'border-[#5267D8] text-[#5267D8]'
              : 'border-transparent hover:border-slate-300 hover:text-[#202938]'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Gate & Predictions</span>
        </button>
        <button
          onClick={() => setActiveTab('copilot')}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 font-semibold transition ${
            activeTab === 'copilot'
              ? 'border-[#5267D8] text-[#5267D8]'
              : 'border-transparent hover:border-slate-300 hover:text-[#202938]'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Copilot Runbook</span>
        </button>
        {timeline.length > 0 && (
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 font-semibold transition ${
              activeTab === 'timeline'
                ? 'border-[#5267D8] text-[#5267D8]'
                : 'border-transparent hover:border-slate-300 hover:text-[#202938]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Timeline</span>
          </button>
        )}
      </div>

      {/* Component Meta Metadata Summary */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#687386] rounded-lg bg-[#F8FAFC] border border-[#E3E8F0] p-2.5">
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-[#5267D8]" />
          <span>Affected Nodes:</span>
          <span className="font-semibold text-[#202938]">
            {affectedNodes.length > 0 ? affectedNodes.join(', ') : <span className="italic text-[#94A3B8]">None specified</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Affected Links:</span>
          <span className="font-semibold text-[#202938]">
            {affectedLinks.length > 0 ? affectedLinks.join(', ') : <span className="italic text-[#94A3B8]">None specified</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Observed Window:</span>
          <span className="text-[#202938]">
            {incident.firstObserved || 'N/A'} - {incident.lastObserved || 'N/A'}
          </span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Observed Evidence vs Baselines */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#202938] font-mono flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[#5267D8]" />
                <span>Observed Telemetry Evidence & SLA Breaches</span>
              </h4>
              <button
                onClick={handleNavigateTelemetry}
                className="text-[11px] font-semibold text-[#5267D8] hover:underline flex items-center gap-1"
              >
                <span>View Full Telemetry</span>
                <span>&rarr;</span>
              </button>
            </div>

            {evidence.length === 0 ? (
              <div className="mt-2 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-4 text-center text-xs text-[#687386]">
                No specific numerical SLA breaches registered for this incident.
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {evidence.map((ev, i) => (
                  <div key={i} className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs font-mono">
                    <span className="text-[11px] font-semibold text-[#475569] block truncate">{ev.metric}</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-base font-bold text-rose-600">{ev.observedValue}</span>
                      <span className="text-[10px] text-[#687386]">(Base: {ev.baseline})</span>
                    </div>
                    <div className="mt-1 text-[10px] text-amber-600 font-medium">{ev.delta}</div>
                    <div className="mt-0.5 text-[9px] text-[#94A3B8]">{ev.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Faults & Forecasts 2-Col Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Active Faults */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <span className="text-xs font-bold text-rose-900 font-mono flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                  <span>Current Rule-Based Faults</span>
                </span>
                <span className="text-[10px] font-mono text-rose-700">Immediate</span>
              </div>
              <div className="mt-2 space-y-2">
                {currentFaults.length > 0 ? (
                  currentFaults.map((f) => (
                    <div key={f.id} className="rounded-lg border border-rose-200 bg-white p-2.5 text-xs font-mono shadow-xs">
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
                  <span className="text-xs text-rose-800 italic block py-2">
                    No immediate physical rule breaches logged on active interfaces.
                  </span>
                )}
              </div>
            </div>

            {/* Right: Predicted Service Impact */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                <span className="text-xs font-bold text-indigo-900 font-mono flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Predicted Future Service Impact</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-700">Horizon Lookahead</span>
              </div>
              <div className="mt-2 space-y-2">
                {futurePredictions.length > 0 ? (
                  futurePredictions.map((p) => (
                    <div key={p.id} className="rounded-lg border border-indigo-200 bg-white p-2.5 text-xs font-mono shadow-xs">
                      <div className="flex justify-between text-[#202938]">
                        <span className="font-semibold text-indigo-700">+{p.horizon}m Forecast</span>
                        <span className="text-amber-600 font-semibold">{p.impact}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-[#687386]">
                        Detector Model Confidence: <strong className="text-indigo-700">{(p.score * 100).toFixed(0)}%</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-indigo-800 italic block py-2">
                    No pending future impact predictions for this incident.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Cross-Screen Links */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E3E8F0]">
            <span className="text-xs font-mono text-[#687386]">Correlated Views:</span>
            <button
              onClick={handleNavigateWorld}
              className="inline-flex items-center gap-1 rounded-md border border-[#E3E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-mono text-[#202938] hover:bg-white hover:border-[#5267D8] transition"
            >
              <Globe className="h-3 w-3 text-[#5267D8]" />
              <span>3D Network World</span>
            </button>
            <button
              onClick={handleNavigateTelemetry}
              className="inline-flex items-center gap-1 rounded-md border border-[#E3E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-mono text-[#202938] hover:bg-white hover:border-[#5267D8] transition"
            >
              <Activity className="h-3 w-3 text-[#5267D8]" />
              <span>Telemetry Explorer</span>
            </button>
            <button
              onClick={handleNavigatePredictions}
              className="inline-flex items-center gap-1 rounded-md border border-[#E3E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-mono text-[#202938] hover:bg-white hover:border-[#5267D8] transition"
            >
              <Zap className="h-3 w-3 text-[#5267D8]" />
              <span>Predictions & Horizons</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: TELEMETRY */}
      {activeTab === 'telemetry' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#202938] font-mono">
              Associated Telemetry Signals & Metrics
            </h4>
            <span className="text-[11px] font-mono text-[#687386]">
              Observed Metrics: {primaryMetrics.length > 0 ? primaryMetrics.join(', ') : 'None'}
            </span>
          </div>

          {loadingTelemetry ? (
            <div className="flex h-36 items-center justify-center rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] text-xs text-[#687386]">
              Loading historical telemetry points from backend...
            </div>
          ) : telemetryPoints.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-[#E3E8F0]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F8FAFC] text-[11px] text-[#687386] border-b border-[#E3E8F0]">
                  <tr>
                    <th className="px-3 py-2">Timestamp (UTC)</th>
                    <th className="px-3 py-2">Metric</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8F0] bg-white">
                  {telemetryPoints.slice(0, 8).map((pt, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-1.5 text-[#687386]">{pt.timestamp_iso ? pt.timestamp_iso.substring(11, 19) : '—'}</td>
                      <td className="px-3 py-1.5 font-semibold text-[#202938]">{pt.metric_id}</td>
                      <td className="px-3 py-1.5 font-bold text-[#5267D8]">{typeof pt.value === 'number' ? pt.value.toFixed(2) : pt.value}</td>
                      <td className="px-3 py-1.5 text-[#687386]">{pt.unit || '—'}</td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          pt.quality === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {pt.quality || 'nominal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : evidence.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {evidence.map((ev, i) => (
                <div key={i} className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs font-mono">
                  <div className="flex justify-between font-semibold text-[#202938]">
                    <span>{ev.metric}</span>
                    <span className="text-rose-600">{ev.observedValue}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-[#687386]">
                    <span>Baseline: {ev.baseline}</span>
                    <span className="text-amber-600 font-medium">{ev.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-8 text-center text-xs text-[#687386]">
              <AlertCircle className="mx-auto h-6 w-6 text-slate-400 mb-2" />
              <span>No direct telemetry samples found for this incident window.</span>
            </div>
          )}
        </div>
      )}

      {/* TAB: PACKET FORENSICS */}
      {activeTab === 'packets' && (
        <PacketForensicsTab incidentId={incident.id} />
      )}

      {/* TAB 3: GATE & PREDICTIONS */}
      {activeTab === 'gate' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3.5">
            <h5 className="text-xs font-bold text-[#202938] font-mono flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#5267D8]" />
              <span>Reliability Gate Status & Forward Horizon Evaluator</span>
            </h5>
            <p className="mt-1 text-xs text-[#687386]">
              PRECURSOR evaluates multi-signal residuals using EWMA adaptive drift thresholds.
              Uncalibrated metrics are never converted to speculative probabilities.
            </p>
          </div>

          <div className="space-y-2">
            <HypothesisEntailmentMatrix
              hypotheses={hypotheses}
              assumptions={[]}
            />
          </div>
        </div>
      )}

      {/* TAB 4: COPILOT RUNBOOK */}
      {activeTab === 'copilot' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#202938] font-mono flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#5267D8]" />
              <span>Recommended Diagnostic & Verification Steps</span>
            </h4>
            <button
              onClick={handleNavigateCopilot}
              className="text-[11px] font-semibold text-[#5267D8] hover:underline"
            >
              Open in Copilot &rarr;
            </button>
          </div>

          {diagnosticSteps.length === 0 ? (
            <div className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-6 text-center text-xs text-[#687386]">
              No diagnostic runbook steps available for this incident category.
            </div>
          ) : (
            <div className="space-y-2.5">
              {diagnosticSteps.map((step) => (
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
          )}
        </div>
      )}

      {/* TAB 5: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#202938] font-mono flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#5267D8]" />
            <span>Incident Audit Progression</span>
          </h4>
          <div className="space-y-2">
            {timeline.map((evt) => (
              <div key={evt.id} className="flex items-start gap-2.5 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-2.5 text-xs">
                <span className="font-mono text-[11px] font-bold text-[#5267D8] shrink-0 mt-0.5">
                  {evt.time}
                </span>
                <span className="text-[#202938] leading-snug">{evt.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
