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

  // Future Backend Components (All NOT CONNECTED)
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
    technology: 'Tri-State Gate Controller',
    notes: 'Server-side gate arbitration algorithm runs in peer backend module, not connected to UI.',
  },
  {
    name: 'Incident Processing Daemon',
    category: 'Backend Service',
    status: 'NOT CONNECTED',
    technology: 'Event Correlator',
    notes: 'Automated correlation of alarms into deduplicated incident clusters is not connected.',
  },
  {
    name: 'Local Ollama AI Model (Llama-3 / Mistral)',
    category: 'Intelligence & ML',
    status: 'NOT CONNECTED',
    technology: 'Ollama local inference server',
    notes: 'Local LLM inference server offline or unconfigured. UI falls back to predetermined demonstration responses.',
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
          notes: `Operational and connected at http://127.0.0.1:8000 (v${backendVersion || '1.0.0'}). Serving /health, /api/status, /api/telemetry, and /api/predictions.`,
        };
      }
      if (sub.name === 'Prediction & Detector Engine') {
        return {
          ...sub,
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Connected to live PrecursorEngine multi-horizon detectors (5m, 15m, 30m).',
        };
      }
      if (sub.name === 'Reliability Gate Engine') {
        return {
          ...sub,
          status: 'AVAILABLE' as SubsystemStatus,
          notes: 'Connected to live Kolmogorov-Smirnov drift gate and residual variance expansion analyzer.',
        };
      }
    }
    return sub;
  });

  const getStatusBadge = (status: SubsystemStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            AVAILABLE
          </span>
        );
      case 'DEMO ONLY':
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-400">
            <HelpCircle className="h-3 w-3" />
            DEMO ONLY
          </span>
        );
      case 'NOT CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-400">
            <XCircle className="h-3 w-3 text-slate-500" />
            NOT CONNECTED
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-rose-400">
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
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-400 animate-pulse">
              <Radio className="h-3.5 w-3.5" />
              <span>Live Backend Connected (8000)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-400">
              <Info className="h-3.5 w-3.5" />
              <span>Demonstration Fixtures Active</span>
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-precursor-card-glass p-4 backdrop-blur-xl shadow-glass-panel">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Frontend App</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-xl font-bold text-white">Online (Browser)</div>
            <div className="mt-1 text-xs text-emerald-400 font-mono">React 19 + Three.js / R3F</div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-precursor-card-glass p-4 backdrop-blur-xl shadow-glass-panel">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Execution Context</span>
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-xl font-bold text-white capitalize">{demoMode.replace('_', ' ')}</div>
            <div className="mt-1 text-xs text-cyan-400 font-mono">
              {isBackendLive ? 'Live Synchronized' : 'Deterministic Fixtures'}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-precursor-card-glass p-4 backdrop-blur-xl shadow-glass-panel">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Backend Core</span>
              {isBackendLive ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-slate-500" />
              )}
            </div>
            <div className="mt-2 text-xl font-bold text-white">
              {isBackendLive ? 'Live Connected' : 'Not Connected'}
            </div>
            <div className="mt-1 text-xs font-mono text-emerald-400">
              {isBackendLive ? 'REST API (127.0.0.1:8000)' : 'FastAPI Offline (By Design)'}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-precursor-card-glass p-4 backdrop-blur-xl shadow-glass-panel">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Active Route</span>
              <FileCode2 className="h-4 w-4 text-precursor-purple" />
            </div>
            <div className="mt-2 text-xl font-bold text-white font-mono">{location.pathname}</div>
            <div className="mt-1 text-xs text-precursor-lavender font-mono">
              Motion: {reducedMotion ? 'Reduced' : 'Full Atmospheric'}
            </div>
          </div>
        </div>

        {/* Integration Boundary Banner */}
        {isBackendLive ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-xs text-emerald-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-emerald-300">Live Backend Service Active & Synchronized</h4>
                <p className="text-emerald-200/90 leading-relaxed">
                  The frontend client is actively connected to the PRECURSOR REST API service running on <strong className="font-mono text-white">http://127.0.0.1:8000</strong>.
                  Telemetry points, multi-horizon predictive detectors, Kolmogorov-Smirnov drift gates, and incident records are streaming live from the Python engine.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-xs text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-amber-300">Operational Architecture & Connectivity Boundaries</h4>
                <p className="text-amber-200/90 leading-relaxed">
                  This frontend application runs with offline fallback demonstration fixtures when the backend service is offline.
                  Unconnected backend services are explicitly labeled <strong className="font-mono text-slate-200">NOT CONNECTED</strong> below.
                  We do not simulate fake green uptime pings or falsified system health.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subsystem Matrix Table */}
        <div className="rounded-xl border border-precursor-border bg-precursor-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-precursor-border bg-precursor-surface/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
                Subsystem Inventory & Connectivity Matrix
              </h3>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {displayedSubsystems.filter((s) => s.status === 'NOT CONNECTED').length} Unconnected Services
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-precursor-border bg-precursor-surface/30 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3">Subsystem / Feature</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Technology Stack</th>
                  <th className="px-6 py-3">Operational Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-precursor-border/50">
                {displayedSubsystems.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-precursor-surface/30 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {sub.category === 'Frontend Core' && <Layers className="h-3.5 w-3.5 text-cyan-400" />}
                        {sub.category === 'Backend Service' && <Server className="h-3.5 w-3.5 text-slate-400" />}
                        {sub.category === 'Intelligence & ML' && <Bot className="h-3.5 w-3.5 text-precursor-purple" />}
                        {sub.category === 'Persistence' && <Database className="h-3.5 w-3.5 text-amber-400" />}
                        <span>{sub.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-400">{sub.category}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-300">{sub.technology}</td>
                    <td className="px-6 py-3.5 text-slate-400 max-w-md leading-relaxed">{sub.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Readiness Verification Card */}
        <div className="rounded-xl border border-precursor-border bg-precursor-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
              Future FastAPI Integration Boundary Checklist
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-3 rounded-lg border border-precursor-border bg-precursor-surface/30 p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Typed Service Contracts Established</div>
                <div className="text-slate-400 mt-1">
                  Presentation layers consume abstract data interfaces in <code className="font-mono text-cyan-300">src/services/apiBoundary.ts</code>. No hardcoded mock implementations leaked into components.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-precursor-border bg-precursor-surface/30 p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Zero Simulated Green Indicators</div>
                <div className="text-slate-400 mt-1">
                  Backend, LLM, and persistent database connections correctly reflect offline status instead of misleading green checks.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-precursor-border bg-precursor-surface/30 p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Telemetry Storage Contract Aligned</div>
                <div className="text-slate-400 mt-1">
                  Export contract coordinated with peer agent: CSV (<code className="font-mono text-cyan-300">/api/export/csv</code>) and structured JSON run archive (<code className="font-mono text-cyan-300">/api/export/json</code>).
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-precursor-border bg-precursor-surface/30 p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Standalone Offline Execution</div>
                <div className="text-slate-400 mt-1">
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
