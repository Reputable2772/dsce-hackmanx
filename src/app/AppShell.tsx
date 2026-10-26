import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { ScenarioToolbar } from '@/components/layout/ScenarioToolbar';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAppStore } from '@/stores/useAppStore';

export const AppShell: React.FC = () => {
  const { theme, density } = useSettingsStore();

  useEffect(() => {
    // Mount live health polling against backend service
    const stopPolling = useAppStore.getState().startLivePolling(4000);
    return () => {
      stopPolling();
    };
  }, []);

  const themeClass = theme === 'dark-slate' ? 'bg-[#0F141C]' : 'bg-precursor-navy';
  const densityClass = density === 'compact' ? 'text-xs' : '';

  return (
    <div className={`flex min-h-screen flex-col ${themeClass} bg-radial-atmosphere bg-grid-pattern text-slate-100 ${densityClass}`}>
      {/* Top Application Header */}
      <TopNavigation />

      {/* Mode & Context Control Bar */}
      <ScenarioToolbar />

      {/* Main Routed Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Application Footer */}
      <footer className="border-t border-precursor-border bg-precursor-navy-deep/80 py-3 text-center text-xs text-slate-500 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p className="font-mono text-[11px] text-slate-400">
            <span className="font-bold text-slate-300">PRECURSOR</span> — Reliability-Gated Network Intelligence • Verified Offline AI Copilot
          </p>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span>Air-Gapped Client Runtime • Zero Uncalibrated Hypotheses</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
