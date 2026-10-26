import React from 'react';
import { Compass, Sparkles, Layers } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

export const ScenarioToolbar: React.FC = () => {
  const { demoMode, setDemoMode, activeScenario } = useAppStore();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-precursor-border bg-precursor-navy/70 px-6 py-2.5 backdrop-blur-md">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Interaction Mode:
        </span>
        <div className="inline-flex rounded-lg border border-precursor-border bg-precursor-surface p-0.5">
          <button
            type="button"
            onClick={() => setDemoMode('guided_demo')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              demoMode === 'guided_demo'
                ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Guided Demo</span>
          </button>
          <button
            type="button"
            onClick={() => setDemoMode('explore')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              demoMode === 'explore'
                ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="h-3 w-3" />
            <span>Explore Mode</span>
          </button>
        </div>
      </div>

      {/* Scenario & Foundation Badge */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400">
          <Layers className="h-3.5 w-3.5 text-precursor-cyan" />
          <span>Active Context:</span>
          <span className="font-semibold text-slate-200">{activeScenario}</span>
        </div>
      </div>
    </div>
  );
};
