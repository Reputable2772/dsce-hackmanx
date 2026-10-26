import React, { useState } from 'react';
import { 
  Hash, 
  Clock, 
  Percent, 
  Shield, 
  Play, 
  RotateCcw, 
  AlertTriangle, 
  Radio, 
  FastForward,
  Activity
} from 'lucide-react';
import { useSimulationStore } from '../useSimulationStore';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const SimulationConfigPanel: React.FC = () => {
  const isConnected = useAppStore((s) => s.connectionState) === 'connected';
  const operatingMode = useAppStore((s) => s.operatingMode);
  const targetHost = useAppStore((s) => s.targetHost);
  const targetPort = useAppStore((s) => s.targetPort);
  const interfaceId = useAppStore((s) => s.interfaceId);

  const [fastForwarding, setFastForwarding] = useState<number | null>(null);
  const [ffMessage, setFfMessage] = useState<string | null>(null);

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

  const handleFastForward = async (seconds: number) => {
    setFastForwarding(seconds);
    setFfMessage(null);
    try {
      const res = await apiClient.fastForward(seconds);
      setFfMessage(`Advanced timeline +${seconds}s (Gate: ${res.gate_state || 'STABLE'})`);
      useAppStore.getState().checkLiveConnection();
    } catch (err: any) {
      setFfMessage(`Fast-forward failed: ${err.message}`);
    } finally {
      setFastForwarding(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm text-[#202938]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-[#E3E8F0] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#202938]">Scenario Simulation & Evaluation Controls</h3>
          <p className="text-[11px] text-[#687386]">
            Configure deterministic seed parameters, timeline duration, and fast-forward jumps.
          </p>
        </div>
        {isConnected ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
            <Radio className="h-3 w-3 animate-pulse text-emerald-600" />
            <span>Python Core Online</span>
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-medium text-slate-600">
            Local Fixture Mode
          </span>
        )}
      </div>

      {/* Live Probe Notice Banner (if operating in live mode) */}
      {operatingMode === 'live' && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Live Hardware Probing Active:</strong> Target socket <code className="font-mono font-bold text-emerald-800">{targetHost}:{targetPort}</code> on interface <code className="font-mono text-emerald-800">{interfaceId}</code>.
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium shrink-0">
            Managed via top header mode controls
          </span>
        </div>
      )}

      {/* Synthetic Simulation Configuration Form */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Seed */}
          <div>
            <label
              htmlFor="sim-seed"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#687386]"
            >
              <Hash className="h-3 w-3 text-[#5267D8]" />
              Deterministic Seed
            </label>
            <input
              id="sim-seed"
              type="number"
              min={0}
              max={999999}
              value={config.seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
              className={`w-full rounded-lg border bg-white px-3 py-1.5 font-mono text-xs text-[#202938] placeholder-slate-400 transition-colors focus:border-[#5267D8] focus:outline-none focus:ring-1 focus:ring-[#5267D8] ${
                validationErrors.seed
                  ? 'border-rose-400'
                  : 'border-[#CBD5E1]'
              }`}
              placeholder="42"
            />
            {validationErrors.seed && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {validationErrors.seed}
              </p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label
              htmlFor="sim-duration"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#687386]"
            >
              <Clock className="h-3 w-3 text-[#5267D8]" />
              Duration (minutes)
            </label>
            <input
              id="sim-duration"
              type="number"
              min={5}
              max={120}
              value={config.durationMinutes}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 5)}
              className={`w-full rounded-lg border bg-white px-3 py-1.5 font-mono text-xs text-[#202938] placeholder-slate-400 transition-colors focus:border-[#5267D8] focus:outline-none focus:ring-1 focus:ring-[#5267D8] ${
                validationErrors.duration
                  ? 'border-rose-400'
                  : 'border-[#CBD5E1]'
              }`}
              placeholder="30"
            />
            {validationErrors.duration && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {validationErrors.duration}
              </p>
            )}
          </div>

          {/* Event Start Position */}
          <div>
            <label
              htmlFor="sim-event-start"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#687386]"
            >
              <Percent className="h-3 w-3 text-[#5267D8]" />
              Event Start (%)
            </label>
            <input
              id="sim-event-start"
              type="number"
              min={5}
              max={80}
              value={config.eventStartPercent}
              onChange={(e) => setEventStartPercent(parseInt(e.target.value, 10) || 5)}
              className={`w-full rounded-lg border bg-white px-3 py-1.5 font-mono text-xs text-[#202938] placeholder-slate-400 transition-colors focus:border-[#5267D8] focus:outline-none focus:ring-1 focus:ring-[#5267D8] ${
                validationErrors.eventStart
                  ? 'border-rose-400'
                  : 'border-[#CBD5E1]'
              }`}
              placeholder="25"
            />
            {validationErrors.eventStart && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {validationErrors.eventStart}
              </p>
            )}
          </div>

          {/* Gate Mode */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#687386]">
              <Shield className="h-3 w-3 text-[#5267D8]" />
              Reliability Gate
            </label>
            <div className="inline-flex w-full rounded-lg border border-[#CBD5E1] bg-[#F6F8FB] p-0.5">
              <button
                type="button"
                onClick={() => setGateMode('gate_on')}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  config.gateMode === 'gate_on'
                    ? 'bg-[#5267D8] text-white shadow-xs'
                    : 'text-[#687386] hover:text-[#202938]'
                }`}
              >
                Gate On
              </button>
              <button
                type="button"
                onClick={() => setGateMode('gate_off')}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  config.gateMode === 'gate_off'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[#687386] hover:text-[#202938]'
                }`}
              >
                Gate Off
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={runDemo}
            className="inline-flex items-center gap-2 rounded-lg bg-[#5267D8] px-5 py-2 font-mono text-xs font-bold text-white shadow-xs transition hover:bg-[#4353B3] focus-visible:ring-2 focus-visible:ring-[#5267D8] cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Run Scenario Simulation</span>
          </button>
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 font-mono text-xs font-semibold text-[#687386] shadow-xs transition hover:bg-slate-50 hover:text-[#202938] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Scenario</span>
          </button>
          {phase === 'completed' && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Demo Complete
            </span>
          )}
        </div>
      </div>

      {/* Simulation Fast-Forward Controls */}
      <div className="mt-5 border-t border-[#E3E8F0] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#687386]">
            <FastForward className="h-3.5 w-3.5 text-[#5267D8]" />
            <span>Timeline Fast-Forward:</span>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: '+15s', sec: 15 },
              { label: '+1m', sec: 60 },
              { label: '+5m', sec: 300 },
              { label: '+15m', sec: 900 },
            ].map((p) => (
              <button
                key={p.sec}
                type="button"
                onClick={() => handleFastForward(p.sec)}
                disabled={fastForwarding !== null || !isConnected}
                className="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 font-mono text-xs font-semibold text-[#202938] hover:border-[#5267D8] hover:text-[#5267D8] transition disabled:opacity-50 cursor-pointer"
              >
                {fastForwarding === p.sec ? 'Jumping...' : p.label}
              </button>
            ))}
          </div>
        </div>

        {ffMessage && (
          <p className="mt-2 text-xs font-mono text-emerald-600">
            {ffMessage}
          </p>
        )}
      </div>

      <p className="mt-3 text-[11px] text-[#687386]">
        These controls operate the frontend demonstration experience and timeline jumps against the live PRECURSOR backend engine.
      </p>
    </div>
  );
};

