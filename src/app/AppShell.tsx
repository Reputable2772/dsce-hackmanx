import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { ScenarioToolbar } from '@/components/layout/ScenarioToolbar';

export const AppShell: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-precursor-navy bg-radial-atmosphere bg-grid-pattern text-slate-100">
      {/* Top Application Header */}
      <TopNavigation />

      {/* Mode & Context Control Bar */}
      <ScenarioToolbar />

      {/* Main Routed Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Application Footer */}
      <footer className="border-t border-precursor-border bg-precursor-card/40 py-4 text-center text-xs text-slate-500 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p>
            PRECURSOR — Hybrid Digital Twin Network Intelligence • Offline Verified AI Copilot
          </p>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-precursor-purple" />
            <span>Phase 1 Architecture Foundation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
