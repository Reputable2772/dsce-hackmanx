import React, { useState, useEffect } from 'react';
import { Sliders, Shield, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface ThresholdsSettingsSectionProps {
  isConnected: boolean;
}

export const ThresholdsSettingsSection: React.FC<ThresholdsSettingsSectionProps> = ({ isConnected }) => {
  const [latencyMs, setLatencyMs] = useState<number>(60.0);
  const [packetLossPct, setPacketLossPct] = useState<number>(2.0);
  const [jitterMs, setJitterMs] = useState<number>(10.0);
  const [driftAlpha, setDriftAlpha] = useState<number>(0.05);
  const [minPoints, setMinPoints] = useState<number>(15);
  const [abstainOnFailure, setAbstainOnFailure] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConfig = async () => {
    if (!isConnected) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cfg = await apiClient.fetchConfig();
      if (cfg) {
        if (cfg.sla_thresholds) {
          if (cfg.sla_thresholds.latency_ms != null) setLatencyMs(Number(cfg.sla_thresholds.latency_ms));
          if (cfg.sla_thresholds.packet_loss_pct != null) setPacketLossPct(Number(cfg.sla_thresholds.packet_loss_pct));
          if (cfg.sla_thresholds.jitter_ms != null) setJitterMs(Number(cfg.sla_thresholds.jitter_ms));
        }
        if (cfg.reliability_gate) {
          if (cfg.reliability_gate.drift_alpha != null) setDriftAlpha(Number(cfg.reliability_gate.drift_alpha));
          if (cfg.reliability_gate.min_points != null) setMinPoints(Number(cfg.reliability_gate.min_points));
          if (cfg.reliability_gate.abstain_on_sensor_failure != null) {
            setAbstainOnFailure(Boolean(cfg.reliability_gate.abstain_on_sensor_failure));
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch detection configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [isConnected]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setStatusMessage('Thresholds saved in demonstration memory (connect backend for persistent runtime effect).');
      return;
    }
    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await apiClient.updateConfig({
        sla_thresholds: {
          latency_ms: latencyMs,
          packet_loss_pct: packetLossPct,
          jitter_ms: jitterMs,
        },
        reliability_gate: {
          drift_alpha: driftAlpha,
          min_points: minPoints,
          abstain_on_sensor_failure: abstainOnFailure,
        },
      });
      setStatusMessage('Operational SLA & Reliability Gate thresholds successfully applied to backend.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setLatencyMs(60.0);
    setPacketLossPct(2.0);
    setJitterMs(10.0);
    setDriftAlpha(0.05);
    setMinPoints(15);
    setAbstainOnFailure(true);
  };

  return (
    <div className="rounded-xl border border-[#E3E8F0] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-[#5267D8]" />
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#202938]">
              Detection Engine & Reliability Gate Thresholds
            </h3>
            <p className="text-xs text-[#687386] mt-0.5">
              Configure dynamic SLA limits, drift sensitivity (alpha), and gating parameters used by PRECURSOR.
            </p>
          </div>
        </div>

        {isConnected && (
          <button
            type="button"
            onClick={loadConfig}
            disabled={isLoading}
            className="rounded-lg border border-[#CBD5E1] bg-white p-1.5 text-[#687386] hover:bg-slate-50 transition"
            title="Reload from backend"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SLA Thresholds Column */}
          <div className="space-y-3 rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-4">
            <h4 className="font-bold text-[#202938] flex items-center gap-1.5 mb-2">
              <Shield className="h-3.5 w-3.5 text-[#5267D8]" />
              <span>SLA Anomaly Thresholds</span>
            </h4>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">
                RTT Latency Limit (ms)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={latencyMs}
                onChange={(e) => setLatencyMs(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
              <span className="text-[10px] text-slate-400">Triggers DEGRADED alert when rolling RTT exceeds this baseline</span>
            </div>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">
                Packet Loss Limit (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={packetLossPct}
                onChange={(e) => setPacketLossPct(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
              <span className="text-[10px] text-slate-400">Maximum acceptable interface transit drop percentage</span>
            </div>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">
                Transit Jitter Limit (ms)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={jitterMs}
                onChange={(e) => setJitterMs(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
              <span className="text-[10px] text-slate-400">Variance ceiling before flagging queue microburst instability</span>
            </div>
          </div>

          {/* Reliability Gate Settings Column */}
          <div className="space-y-3 rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-4">
            <h4 className="font-bold text-[#202938] flex items-center gap-1.5 mb-2">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              <span>Reliability Gate Decision Matrix</span>
            </h4>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">
                Distribution Drift Significance Level (Alpha)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.001"
                max="0.5"
                value={driftAlpha}
                onChange={(e) => setDriftAlpha(parseFloat(e.target.value) || 0.05)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
              <span className="text-[10px] text-slate-400">Two-sample Kolmogorov-Smirnov hypothesis rejection threshold</span>
            </div>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">
                Minimum Window Observations (Points)
              </label>
              <input
                type="number"
                step="1"
                min="5"
                max="500"
                value={minPoints}
                onChange={(e) => setMinPoints(parseInt(e.target.value, 10) || 15)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
              <span className="text-[10px] text-slate-400">Observations required in rolling buffer before issuing PREDICT verdict</span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={abstainOnFailure}
                  onChange={(e) => setAbstainOnFailure(e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#5267D8] focus:ring-[#5267D8]"
                />
                <span className="font-semibold text-[#202938]">Abstain on Sensor Quality Failure</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1 pl-5">
                Automatically transition gate to ABSTAIN when missing or stale data ratio breaches 20%
              </p>
            </div>
          </div>
        </div>

        {/* Feedback messages */}
        {statusMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E3E8F0]">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#687386] hover:bg-slate-50 transition"
          >
            Reset to Recommended Defaults
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#5267D8] px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Applying...' : 'Apply Thresholds to Backend'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
