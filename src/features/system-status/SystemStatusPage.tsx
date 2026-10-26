import React from 'react';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Layers,
  Database,
  Radio,
  FileCode2,
  Bot,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAppStore } from '@/stores/useAppStore';

type SubsystemStatus = 'AVAILABLE' | 'DEMO ONLY' | 'NOT CONNECTED' | 'UNAVAILABLE';

interface SubsystemItem {
  name: string;
  category: 'Frontend Core' | 'Backend Service' | 'Intelligence & ML' | 'Persistence';
  status: SubsystemStatus;
  technology: string;
  notes: string;
}

const subsystems: SubsystemItem[] = [
  // Frontend Modules
  {
    name: '3D Network World Digital Twin',
    category: 'Frontend Core',
    status: 'AVAILABLE',
    technology: 'Three.js / React Three Fiber',
    notes: 'Operational in browser with client-side physics, interactive spine-leaf nodes, and visual telemetry links.',
  },
  {
    name: 'Telemetry Explorer UI',
    category: 'Frontend Core',
    status: 'DEMO ONLY',
    technology: 'Recharts / Client Ring Buffer',
    notes: 'Rendering client-side deterministic fixtures. Real hardware telemetry collector is not connected.',
  },
  {
    name: 'Predictions & Early Warning Views',
    category: 'Frontend Core',
    status: 'DEMO ONLY',
    technology: 'React 19 / TypeScript 5.8',
    notes: 'Interactive degradation horizons powered by pre-calculated simulation scenarios.',
  },
  {
    name: 'Incident Management & Runbooks',
    category: 'Frontend Core',
    status: 'DEMO ONLY',
    technology: 'Client State / Runbook Fixtures',
    notes: 'Interactive incident catalog with deterministic root cause hypotheses and simulated actions.',
  },
  {
    name: 'AI Copilot & Claim Verifier',
    category: 'Frontend Core',
    status: 'DEMO ONLY',
    technology: 'Client Heuristics & RegEx Verifier',
    notes: 'Demonstration chat interface with client-side verification of numerical claims against telemetry fixtures.',
  },
  {
    name: 'Simulation Lab & Evaluation',
    category: 'Frontend Core',
    status: 'DEMO ONLY',
    technology: 'Client Scenario Engine',
    notes: 'Deterministic timeline player with 8 failure scenarios and gate-on vs gate-off metric comparison.',
  },

  // Backend Components
  {
    name: 'FastAPI Backend Core',
    category: 'Backend Service',
    status: 'NOT CONNECTED',
    technology: 'Python 3.12 / FastAPI / Uvicorn',
    notes: 'Backend REST API not connected to frontend. Future boundary prepared via typed API service interfaces.',
  },
  {
    name: 'Telemetry Collector Daemon',
    category: 'Backend Service',
    status: 'NOT CONNECTED',
    technology: 'Python TelemetryBuffer',
    notes: 'Live switch / router telemetry collectors and hardware probes are not connected.',
  },
  {
    name: 'Prediction & Detector Engine',
    category: 'Intelligence & ML',
    status: 'NOT CONNECTED',
    technology: 'EWMA / Residual ML Models',
    notes: 'Real-time statistical drift and forecaster models not executing against live data.',
  },
  {
    name: 'Reliability Gate Engine',
    category: 'Intelligence & ML',
    status: 'NOT CONNECTED',
    technology: 'Tri-State Gate Invariant Engine',
    notes: 'Active gate logic suppressing uncalibrated forecasts during sensor drift or buffer gaps.',
  },
  {
    name: 'Incident Processing Daemon',
    category: 'Backend Service',
    status: 'NOT CONNECTED',
    technology: 'Deterministic Incident Correlator',
    notes: 'Categorizes raw telemetry breaches into actionable operator incidents.',
  },
  {
    name: 'Local Ollama AI Model (Llama-3 / Mistral)',
    category: 'Intelligence & ML',
    status: 'NOT CONNECTED',
    technology: 'Ollama REST / Local LLM',
    notes: 'Offline Copilot assistant using local weights. No external third-party API dependencies.',
  },
  {
    name: 'Runbook Vector Search / RAG',
    category: 'Intelligence & ML',
    status: 'NOT CONNECTED',
    technology: 'Local Semantic Retrieval',
    notes: 'Dynamic runbook indexing not connected. Using static frontend incident runbooks.',
  },
  {
    name: 'Backend Numerical Claim Verifier',
    category: 'Intelligence & ML',
    status: 'NOT CONNECTED',
    technology: 'AST / Telemetry Ground-Truthing',
    notes: 'Backend claim audit engine not running. Frontend demonstrates verification using local regex pattern matcher.',
  },
  {
    name: 'Persistent Telemetry & Run Storage',
    category: 'Persistence',
    status: 'NOT CONNECTED',
    technology: 'Local SQLite / Parquet Runs',
    notes: 'No persistent backend database connected. UI state persists only within browser session or localStorage.',
  },
  {
    name: 'WebSocket Live Telemetry Stream',
    category: 'Backend Service',
    status: 'NOT CONNECTED',
    technology: 'WebSocket (ws://localhost:8000/ws)',
    notes: 'No active socket connection. Demonstrations operate using browser timer ticks.',
  },
];

export const SystemStatusPage: React.FC = () => {
  const location = useLocation();
  const { demoMode, reducedMotion } = useSettingsStore();
  const { connectionState, backendVersion } = useAppStore();
  const isBackendLive = connectionState === 'connected';

  const displayedSubsystems: SubsystemItem[] = subsystems.map((sub) => {
    if (isBackendLive) {
      if (sub.name === 'FastAPI Backend Core') {
        return {
          ...sub,
          name: 'PRECURSOR REST API Service',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: `Operational and connected at http://127.0.0.1:8000 (v${backendVersion || '1.0.0'}). Serving /health, /ready, /api/status, /api/telemetry, /api/gate, /api/predictions, /api/incidents, /api/evaluation.`,
        };
      }
      if (sub.name === 'Telemetry Collector Daemon') {
        return {
          ...sub,
          name: 'Telemetry Ingestion & Ring Buffer',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Active 20,000-point sliding window buffer with automated sensor data-quality auditing (good/stale/missing/invalid).',
        };
      }
      if (sub.name === 'Prediction & Detector Engine') {
        return {
          ...sub,
          name: 'Multi-Horizon Detector Suite',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Connected to live PrecursorEngine detectors (Fixed SLA, EWMA, Forecast Residual, Immediate Hardware Cut) across 5m, 15m, 30m lookaheads.',
        };
      }
      if (sub.name === 'Reliability Gate Engine') {
        return {
          ...sub,
          name: 'Deterministic Reliability Gate Engine',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Active tri-state controller (PREDICT, DEGRADED, ABSTAIN) with two-sample Kolmogorov-Smirnov drift test and residual variance expansion check.',
        };
      }
      if (sub.name === 'Incident Processing Daemon') {
        return {
          ...sub,
          name: 'Incident Correlator & Lifecycle Manager',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Connected to live IncidentGrouper with active hardware fault vs forward early-warning separation and acknowledge/resolve lifecycle support.',
        };
      }
      if (sub.name === 'Local Ollama AI Model (Llama-3 / Mistral)') {
        return {
          ...sub,
          name: 'Offline Diagnostic Copilot Engine',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Local-first offline diagnostic engine with Ollama runtime auto-detection and deterministic heuristic fallback.',
        };
      }
      if (sub.name === 'Runbook Vector Search / RAG') {
        return {
          ...sub,
          name: 'Bundled Runbook Matcher Engine',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Deterministic keyword and incident tag matcher over bundled Markdown operational runbooks.',
        };
      }
      if (sub.name === 'Backend Numerical Claim Verifier') {
        return {
          ...sub,
          name: 'Numerical Claim Verifier Service',
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Deterministic ground-truth verifier validating numerical assertions against telemetry buffer within ±10% tolerance band.',
        };
      }
    }
    return sub;
  });

  const getStatusBadge = (status: SubsystemStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            AVAILABLE
          </span>
        );
      case 'DEMO ONLY':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#5267D8]">
            <HelpCircle className="h-3 w-3" />
            DEMO ONLY
          </span>
        );
      case 'NOT CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">
            <XCircle className="h-3 w-3 text-slate-500" />
            NOT CONNECTED
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-700">
            <ShieldAlert className="h-3 w-3" />
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <PageContainer
      title="System Status & Service Boundaries"
      subtitle="Architectural inventory of current frontend features and backend service integration state."
      action={
        <div className="flex items-center gap-2">
          {isBackendLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700">
              <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>Live Backend Connected (8000)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-xs font-medium text-slate-600">
              <Info className="h-3.5 w-3.5" />
              <span>Demonstration Fixtures Active</span>
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-6 text-[#202938]">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#687386]">
              <span>Frontend App</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-xl font-bold text-[#202938]">Online (Browser)</div>
            <div className="mt-1 text-xs text-emerald-700 font-mono">React 19 + Three.js / R3F</div>
          </div>

          <div className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#687386]">
              <span>Execution Context</span>
              <Layers className="h-4 w-4 text-[#5267D8]" />
            </div>
            <div className="mt-2 text-xl font-bold text-[#202938] capitalize">{demoMode.replace('_', ' ')}</div>
            <div className="mt-1 text-xs text-[#5267D8] font-mono">
              {isBackendLive ? 'Live Synchronized' : 'Deterministic Fixtures'}
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#687386]">
              <span>Backend Core</span>
              {isBackendLive ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div className="mt-2 text-xl font-bold text-[#202938]">
              {isBackendLive ? 'Live Connected' : 'Not Connected'}
            </div>
            <div className="mt-1 text-xs font-mono text-emerald-700">
              {isBackendLive ? 'REST API (127.0.0.1:8000)' : 'FastAPI Offline'}
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#687386]">
              <span>Active Route</span>
              <FileCode2 className="h-4 w-4 text-[#5267D8]" />
            </div>
            <div className="mt-2 text-xl font-bold text-[#202938] font-mono">{location.pathname}</div>
            <div className="mt-1 text-xs text-[#687386] font-mono">
              Motion: {reducedMotion ? 'Reduced' : 'Full Atmospheric'}
            </div>
          </div>
        </div>

        {/* Integration Boundary Banner */}
        {isBackendLive ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-800 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-emerald-900">Live Backend Service Active & Synchronized</h4>
                <p className="text-emerald-800 leading-relaxed">
                  The frontend client is actively connected to the PRECURSOR REST API service running on <strong className="font-mono text-emerald-950">http://127.0.0.1:8000</strong>.
                  Telemetry points, multi-horizon predictive detectors, Kolmogorov-Smirnov drift gates, and incident records are streaming live from the Python engine.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-amber-950">Operational Architecture & Connectivity Boundaries</h4>
                <p className="text-amber-800 leading-relaxed">
                  This frontend application runs with offline fallback demonstration fixtures when the backend service is offline.
                  Unconnected backend services are explicitly labeled <strong className="font-mono text-slate-700">NOT CONNECTED</strong> below.
                  We do not simulate fake green uptime pings or falsified system health.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subsystem Matrix Table */}
        <div className="rounded-xl border border-[#E3E8F0] bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E3E8F0] bg-[#F8FAFC] px-6 py-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-[#5267D8]" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#202938]">
                Subsystem Inventory & Connectivity Matrix
              </h3>
            </div>
            <span className="font-mono text-xs text-[#687386]">
              {displayedSubsystems.filter((s) => s.status === 'NOT CONNECTED').length} Unconnected Services
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E3E8F0] bg-[#F8FAFC] font-mono text-[11px] uppercase tracking-wider text-[#687386]">
                <tr>
                  <th className="px-6 py-3">Subsystem / Feature</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Technology Stack</th>
                  <th className="px-6 py-3">Operational Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8F0]">
                {displayedSubsystems.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-[#202938]">
                      <div className="flex items-center gap-2">
                        {sub.category === 'Frontend Core' && <Layers className="h-3.5 w-3.5 text-[#5267D8]" />}
                        {sub.category === 'Backend Service' && <Server className="h-3.5 w-3.5 text-slate-500" />}
                        {sub.category === 'Intelligence & ML' && <Bot className="h-3.5 w-3.5 text-indigo-500" />}
                        {sub.category === 'Persistence' && <Database className="h-3.5 w-3.5 text-amber-600" />}
                        <span>{sub.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[#687386]">{sub.category}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-3.5 font-mono text-[#475569]">{sub.technology}</td>
                    <td className="px-6 py-3.5 text-[#687386] max-w-md leading-relaxed">{sub.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Readiness Verification Card */}
        <div className="rounded-xl border border-[#E3E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4 text-emerald-600" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#202938]">
              Integration Boundary Checklist
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-3 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#202938]">Typed Service Contracts Established</div>
                <div className="text-[#687386] mt-1">
                  Presentation layers consume abstract data interfaces in <code className="font-mono text-[#5267D8]">src/services/apiBoundary.ts</code>. No hardcoded mock implementations leaked into components.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#202938]">Zero Simulated Green Indicators</div>
                <div className="text-[#687386] mt-1">
                  Backend, LLM, and persistent database connections correctly reflect offline status instead of misleading green checks.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#202938]">Telemetry Storage Contract Aligned</div>
                <div className="text-[#687386] mt-1">
                  Export contract coordinated: CSV (<code className="font-mono text-[#5267D8]">/api/export/csv</code>) and structured JSON run archive (<code className="font-mono text-[#5267D8]">/api/export/json</code>).
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#202938]">Standalone Offline Execution</div>
                <div className="text-[#687386] mt-1">
                  Application functions completely autonomously without network roundtrips, suitable for air-gapped network operations centers.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
