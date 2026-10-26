import React, { useState, useEffect } from 'react';
import { X, Radio, Activity, RefreshCw, Play, Square, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface LiveProbeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModeChanged?: (mode: string) => void;
}

export const LiveProbeModal: React.FC<LiveProbeModalProps> = ({ isOpen, onClose, onModeChanged }) => {
  const [currentMode, setCurrentMode] = useState<'synthetic' | 'live'>('synthetic');
  const [targetHost, setTargetHost] = useState('1.1.1.1');
  const [targetPort, setTargetPort] = useState(80);
  const [interfaceId, setInterfaceId] = useState('auto');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSampling, setIsSampling] = useState(false);
  const [isAutoPolling, setIsAutoPolling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    apiClient.fetchMode()
      .then((res) => {
        if (res && res.mode) {
          setCurrentMode(res.mode === 'live' ? 'live' : 'synthetic');
          if (res.target_host) setTargetHost(res.target_host);
          if (res.target_port) setTargetPort(Number(res.target_port));
          if (res.interface_id) setInterfaceId(res.interface_id);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Auto-polling interval
  useEffect(() => {
    let interval: any = null;
    if (isAutoPolling && currentMode === 'live') {
      interval = setInterval(async () => {
        try {
          const stepRes = await apiClient.stepSimulation(5.0);
          if (stepRes?.snapshot?.latest_telemetry) {
            setLatestMetrics(stepRes.snapshot.latest_telemetry);
          }
        } catch {
          // ignore transient poll error
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPolling, currentMode]);

  if (!isOpen) return null;

  const handleSwitchMode = async (newMode: 'synthetic' | 'live') => {
    setIsUpdating(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await apiClient.setMode(
        newMode,
        newMode === 'live' ? targetHost : undefined,
        newMode === 'live' ? targetPort : undefined,
        newMode === 'live' ? interfaceId : undefined
      );
      setCurrentMode(newMode);
      if (res?.latest_metrics) {
        setLatestMetrics(res.latest_metrics);
      }
      setStatusMessage(`Mode successfully switched to ${newMode.toUpperCase()}`);
      if (onModeChanged) onModeChanged(newMode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch mode');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSampleNow = async () => {
    setIsSampling(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.stepSimulation(5.0);
      if (res?.snapshot?.latest_telemetry) {
        setLatestMetrics(res.snapshot.latest_telemetry);
      }
      setStatusMessage('Live hardware & network probe sampled (+5.0s)');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sample live probe');
    } finally {
      setIsSampling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#E3E8F0] bg-white p-6 shadow-xl text-[#202938]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#5267D8]" />
            <h3 className="font-mono text-base font-bold text-[#202938]">
              Network Interface & Outbound Probe Target
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#687386] hover:bg-[#F8FAFC] hover:text-[#202938] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mb-5 flex rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-1 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => handleSwitchMode('synthetic')}
            disabled={isUpdating}
            className={`flex-1 rounded-lg py-2 transition ${
              currentMode === 'synthetic'
                ? 'bg-white text-[#5267D8] shadow-xs border border-[#E3E8F0]'
                : 'text-[#687386] hover:text-[#202938]'
            }`}
          >
            Synthetic Simulation
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('live')}
            disabled={isUpdating}
            className={`flex-1 rounded-lg py-2 transition flex items-center justify-center gap-1.5 ${
              currentMode === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[#687386] hover:text-[#202938]'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${currentMode === 'live' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
            Live Hardware Probe
          </button>
        </div>

        {/* Live Mode Configuration Card */}
        {currentMode === 'live' && (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 mb-4 text-xs font-mono">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Interface Ingestion & Outbound Socket Target
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#687386] block mb-1">
                  Outbound Probe Target (IP / Host)
                </label>
                <input
                  type="text"
                  value={targetHost}
                  onChange={(e) => setTargetHost(e.target.value)}
                  placeholder="1.1.1.1"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#687386] block mb-1">
                  Target Port
                </label>
                <input
                  type="number"
                  value={targetPort}
                  onChange={(e) => setTargetPort(Number(e.target.value))}
                  placeholder="80"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#687386] block mb-1">
                Monitored Local Network NIC (/proc/net/dev)
              </label>
              <input
                type="text"
                value={interfaceId}
                onChange={(e) => setInterfaceId(e.target.value)}
                placeholder="auto (e.g. wlp0s20f3)"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
              />
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('live')}
                disabled={isUpdating}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                {isUpdating ? 'Updating...' : 'Apply Live Target'}
              </button>

              <button
                type="button"
                onClick={handleSampleNow}
                disabled={isSampling}
                className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-bold text-[#202938] hover:bg-[#F8FAFC] transition flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isSampling ? 'animate-spin' : ''}`} />
                Sample Now (+5s)
              </button>

              <button
                type="button"
                onClick={() => setIsAutoPolling(!isAutoPolling)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                  isAutoPolling
                    ? 'bg-amber-600 text-white'
                    : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                {isAutoPolling ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isAutoPolling ? 'Stop Auto-Streaming' : 'Stream Every 5s'}
              </button>
            </div>

            {latestMetrics && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-2.5 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-[#687386]">Latency:</span>{' '}
                  <span className="font-bold text-[#202938]">{latestMetrics.latency_ms ?? '--'} ms</span>
                </div>
                <div>
                  <span className="text-[#687386]">Throughput:</span>{' '}
                  <span className="font-bold text-[#202938]">{latestMetrics.throughput_mbps ?? '--'} Mbps</span>
                </div>
                <div>
                  <span className="text-[#687386]">Drops In:</span>{' '}
                  <span className="font-bold text-[#202938]">{latestMetrics.drops_in ?? '--'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Synthetic Mode Note */}
        {currentMode === 'synthetic' && (
          <div className="rounded-xl border border-indigo-100 bg-[#EEF2FF] p-4 text-xs font-mono text-[#5267D8] mb-4">
            Currently running deterministic synthetic scenario generator. Time advances in reproducible steps with calibrated SLA degradations and fault injections.
          </div>
        )}

        {/* Feedback Messages */}
        {statusMessage && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#E3E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 font-mono text-xs font-semibold text-[#202938] hover:bg-[#F8FAFC]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
