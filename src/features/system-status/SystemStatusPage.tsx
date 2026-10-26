import React from 'react';
import { Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

export const SystemStatusPage: React.FC = () => {
  return (
    <PageContainer
      title="System Status & Architecture Boundaries"
      subtitle="Operational health, local microservice endpoints, and MCP synchronization telemetry."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-precursor-border bg-precursor-card p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Frontend Foundation</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">Vite + React 19</div>
            <div className="mt-1 text-xs text-emerald-400">Operational & Active</div>
          </div>

          <div className="rounded-xl border border-precursor-border bg-precursor-card p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Backend Pipeline</span>
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">Python Core</div>
            <div className="mt-1 text-xs text-amber-400">Phase 2 Orchestration</div>
          </div>

          <div className="rounded-xl border border-precursor-border bg-precursor-card p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Local Ollama Bridge</span>
              <AlertCircle className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">Offline LLM</div>
            <div className="mt-1 text-xs text-slate-400">Unconfigured (Demo Mode)</div>
          </div>
        </div>

        <div className="rounded-xl border border-precursor-border bg-precursor-card/60 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-precursor-cyan" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              Subsystem Status Matrix
            </h3>
          </div>
          <div className="divide-y divide-precursor-border text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="font-medium text-slate-300">3D Digital Twin (Three.js / R3F)</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-400">Stage Initialized</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="font-medium text-slate-300">Telemetry Ingestion & Ring Buffer</span>
              <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-mono">Backend Built & Verified</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="font-medium text-slate-300">Reliability Gate Engine</span>
              <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 font-mono">Peer Agent Implementing</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="font-medium text-slate-300">Numerical Claim Verifier</span>
              <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 font-mono">Peer Agent Implementing</span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
