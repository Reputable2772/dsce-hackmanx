import React from 'react';
import { Hash, Clock, Percent, Shield, Play, RotateCcw, AlertTriangle } from 'lucide-react';
import { useSimulationStore } from '../useSimulationStore';

export const SimulationConfigPanel: React.FC = () => {
  const {
    config,
    phase,
    validationErrors,
    setSeed,
    setDuration,
    setEventStartPercent,
    setGateMode,
    runDemo,
    resetDemo,
  } = useSimulationStore();

  return (
    <div className="rounded-xl border border-precursor-border bg-precursor-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Scenario Configuration</h3>
        <span className="rounded border border-precursor-border bg-precursor-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-precursor-lavender">
          Frontend Only
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Seed */}
        <div>
          <label
            htmlFor="sim-seed"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400"
          >
            <Hash className="h-3 w-3" />
            Deterministic Seed
          </label>
          <input
            id="sim-seed"
            type="number"
            min={0}
            max={999999}
            value={config.seed}
            onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
            className={`w-full rounded-lg border bg-precursor-surface px-3 py-2 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-precursor-purple focus:outline-none focus:ring-1 focus:ring-precursor-purple ${
              validationErrors.seed
                ? 'border-precursor-coral'
                : 'border-precursor-border'
            }`}
            placeholder="42"
          />
          {validationErrors.seed && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-precursor-coral">
              <AlertTriangle className="h-3 w-3" />
              {validationErrors.seed}
            </p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label
            htmlFor="sim-duration"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400"
          >
            <Clock className="h-3 w-3" />
            Duration (minutes)
          </label>
          <input
            id="sim-duration"
            type="number"
            min={5}
            max={120}
            value={config.durationMinutes}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 5)}
            className={`w-full rounded-lg border bg-precursor-surface px-3 py-2 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-precursor-purple focus:outline-none focus:ring-1 focus:ring-precursor-purple ${
              validationErrors.duration
                ? 'border-precursor-coral'
                : 'border-precursor-border'
            }`}
            placeholder="30"
          />
          {validationErrors.duration && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-precursor-coral">
              <AlertTriangle className="h-3 w-3" />
              {validationErrors.duration}
            </p>
          )}
        </div>

        {/* Event Start Position */}
        <div>
          <label
            htmlFor="sim-event-start"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400"
          >
            <Percent className="h-3 w-3" />
            Event Start (%)
          </label>
          <input
            id="sim-event-start"
            type="number"
            min={5}
            max={80}
            value={config.eventStartPercent}
            onChange={(e) => setEventStartPercent(parseInt(e.target.value, 10) || 5)}
            className={`w-full rounded-lg border bg-precursor-surface px-3 py-2 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-precursor-purple focus:outline-none focus:ring-1 focus:ring-precursor-purple ${
              validationErrors.eventStart
                ? 'border-precursor-coral'
                : 'border-precursor-border'
            }`}
            placeholder="25"
          />
          {validationErrors.eventStart && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-precursor-coral">
              <AlertTriangle className="h-3 w-3" />
              {validationErrors.eventStart}
            </p>
          )}
        </div>

        {/* Gate Mode */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Shield className="h-3 w-3" />
            Reliability Gate
          </label>
          <div className="inline-flex w-full rounded-lg border border-precursor-border bg-precursor-surface p-0.5">
            <button
              type="button"
              onClick={() => setGateMode('gate_on')}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                config.gateMode === 'gate_on'
                  ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gate On
            </button>
            <button
              type="button"
              onClick={() => setGateMode('gate_off')}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                config.gateMode === 'gate_off'
                  ? 'bg-precursor-amber text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gate Off
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={runDemo}
          className="inline-flex items-center gap-2 rounded-lg bg-precursor-purple px-5 py-2.5 text-sm font-bold text-white shadow-glow-purple transition-all hover:bg-precursor-purple/90 hover:shadow-glow-purple/40 focus-visible:ring-2 focus-visible:ring-precursor-purple"
        >
          <Play className="h-4 w-4" />
          Run Demo
        </button>
        <button
          type="button"
          onClick={resetDemo}
          className="inline-flex items-center gap-2 rounded-lg border border-precursor-border bg-precursor-surface px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:border-precursor-border-active hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        {phase === 'completed' && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Demo Complete
          </span>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        These controls operate the frontend demonstration experience only. The actual PRECURSOR simulation engine runs in the Python backend.
      </p>
    </div>
  );
};
