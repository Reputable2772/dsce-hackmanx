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
  Cpu, 
  Activity, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  Pause
} from 'lucide-react';
import { useSimulationStore } from '../useSimulationStore';
import { useAppStore } from '@/stores/useAppStore';

export const SimulationConfigPanel: React.FC = () => {
  const isConnected = useAppStore((s) => s.connectionState) === 'connected';
  const {
    operatingMode,
    targetHost,
    targetPort,
    interfaceId,
    isAutoStreaming,
    setOperatingMode,
    triggerSampleProbe,
    toggleAutoStreaming,
  } = useAppStore();

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

  // Local state for segmented mode and inputs
  const [activeMode, setActiveMode] = useState<'synthetic' | 'live'>(operatingMode);
  const [liveHost, setLiveHost] = useState(targetHost);
  const [livePort, setLivePort] = useState(targetPort);
  const [liveIface, setLiveIface] = useState(interfaceId);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSampling, setIsSampling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync mode if changed from header
  React.useEffect(() => {
    setActiveMode(operatingMode);
  }, [operatingMode]);

  const handleConnectLive = async () => {
    setIsConnecting(true);
    setFeedback(null);
    try {
      const res = await setOperatingMode('live', liveHost, livePort, liveIface);
      setFeedback({
        type: 'success',
        message: `Connected live probe target ${liveHost}:${livePort} on ${liveIface}! Status: ${res?.status || 'Active'}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Probe configuration saved: ${err?.message || 'Ready for live hardware stream'}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSampleLive = async () => {
    setIsSampling(true);
    setFeedback(null);
    try {
      const res = await triggerSampleProbe(5.0);
      const metrics = res?.snapshot?.latest_telemetry;
      const latency = metrics?.latency_ms != null ? `${metrics.latency_ms.toFixed(1)}ms` : 'Recorded';
      setFeedback({
        type: 'success',
        message: `Sampled live socket probe (Step +5s) — Latency: ${latency}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Probe sample error: ${err?.message || 'Check local network socket'}`,
      });
    } finally {
      setIsSampling(false);
    }
  };

  const handleSwitchToSynthetic = async () => {
    try {
      await setOperatingMode('synthetic');
      setActiveMode('synthetic');
      setFeedback({
        type: 'success',
        message: 'Switched back to Synthetic Simulation mode.',
      });
    } catch {
      setActiveMode('synthetic');
    }
  };

  return (
    <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm text-[#202938]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-[#E3E8F0] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#202938]">Telemetry Ingestion Controls</h3>
          <p className="text-[11px] text-[#687386]">Toggle between synthetic scenario engines and real-time Linux hardware probes.</p>
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

      {/* Segmented Mode Toggle */}
      <div className="mb-5">
        <label className="mb-1.5 block font-mono text-[10px] uppercase font-bold tracking-wider text-[#687386]">
          Operation Mode
        </label>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] p-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode('synthetic');
              if (operatingMode !== 'synthetic') {
                handleSwitchToSynthetic();
              }
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 font-mono text-xs font-bold transition ${
              activeMode === 'synthetic'
                ? 'bg-white text-[#5267D8] shadow-xs'
                : 'text-[#687386] hover:text-[#202938]'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Synthetic Simulation</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('live');
              if (operatingMode !== 'live') {
                handleConnectLive();
              }
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 font-mono text-xs font-bold transition ${
              activeMode === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[#687386] hover:text-[#202938]'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Live Hardware Probe</span>
          </button>
        </div>
      </div>

      {/* Mode-Specific Content */}
      {activeMode === 'live' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-600" />
                Live Linux Socket Probe Parameters
              </span>
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Active: {targetHost}:{targetPort}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase font-bold text-slate-600">
                  Target Host / IP
                </label>
                <input
                  type="text"
                  value={liveHost}
                  onChange={(e) => setLiveHost(e.target.value)}
                  placeholder="1.1.1.1"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 font-mono text-xs text-[#202938] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase font-bold text-slate-600">
                  Target Port
                </label>
                <input
                  type="number"
                  value={livePort}
                  onChange={(e) => setLivePort(parseInt(e.target.value, 10) || 80)}
                  placeholder="80"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 font-mono text-xs text-[#202938] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase font-bold text-slate-600">
                  Local Interface
                </label>
                <input
                  type="text"
                  value={liveIface}
                  onChange={(e) => setLiveIface(e.target.value)}
                  placeholder="eth0"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 font-mono text-xs text-[#202938] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons for Live Probe */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isConnecting}
              onClick={handleConnectLive}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-mono text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Live Probe'}</span>
            </button>

            <button
              type="button"
              disabled={isSampling}
              onClick={handleSampleLive}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 font-mono text-xs font-semibold text-[#202938] shadow-xs transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#5267D8] ${isSampling ? 'animate-spin' : ''}`} />
              <span>Sample Live Probe (Step +5s)</span>
            </button>

            <button
              type="button"
              onClick={() => toggleAutoStreaming()}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 font-mono text-xs font-bold transition shadow-xs cursor-pointer ${
                isAutoStreaming
                  ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                  : 'border-[#E3E8F0] bg-white text-[#687386] hover:bg-slate-50 hover:text-[#202938]'
              }`}
            >
              {isAutoStreaming ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Streaming Live (5s)</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-[#5267D8]" />
                  <span>Auto-Stream (5s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Synthetic Simulation Configuration */
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

          {/* Action Buttons for Synthetic Mode */}
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
      )}

      {/* Operational Feedback Banner */}
      {feedback && (
        <div className={`mt-4 flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};

