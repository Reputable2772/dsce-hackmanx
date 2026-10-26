import React from 'react';
import {
  Wifi,
  Activity,
  Gauge,
  ArrowDownRight,
  Heart,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ShieldOff,
} from 'lucide-react';
import type { TimelineStage } from '../types';
import { useSimulationStore } from '../useSimulationStore';

const gateColors = {
  PREDICT: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
  },
  DEGRADED: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    icon: ShieldAlert,
  },
  ABSTAIN: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    icon: ShieldOff,
  },
};

export const TimelineViewer: React.FC = () => {
  const { timeline, activeStageIndex, setActiveStageIndex, config } =
    useSimulationStore();

  if (timeline.length === 0) return null;

  const activeStage = timeline[activeStageIndex];

  return (
    <div className="space-y-4">
      {/* Timeline Scrubber */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#202938]">Demonstration Timeline</h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#687386]">
              Seed: {config.seed} · {config.gateMode === 'gate_on' ? 'Gate On' : 'Gate Off'}
            </span>
          </div>
        </div>

        {/* Stage selector bar */}
        <div className="flex gap-1.5">
          {timeline.map((stage, idx) => {
            const gc = gateColors[stage.gateState];
            const isActive = idx === activeStageIndex;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStageIndex(idx)}
                aria-label={`Stage ${idx + 1}: ${stage.label}`}
                aria-pressed={isActive}
                className={`group relative flex-1 rounded-xl border px-2 py-2.5 text-center transition-all cursor-pointer ${
                  isActive
                    ? `${gc.bg} ${gc.border} shadow-xs ring-1 ring-indigo-200`
                    : 'border-[#E3E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1]'
                }`}
              >
                <div className={`mx-auto mb-1 h-1.5 w-1.5 rounded-full ${gc.dot} ${isActive ? 'animate-pulse' : 'opacity-60'}`} />
                <span className={`block text-[10px] font-semibold ${isActive ? gc.text : 'text-[#687386] group-hover:text-[#202938]'}`}>
                  {stage.label}
                </span>
                <span className="mt-0.5 block font-mono text-[9px] text-[#687386]">
                  {stage.durationLabel}
                </span>
                {isActive && (
                  <div className={`absolute -bottom-px left-1/2 h-0.5 w-3/4 -translate-x-1/2 rounded-full ${gc.dot}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Stage navigation */}
        <div className="mt-4 flex items-center justify-between border-t border-[#E3E8F0] pt-3">
          <button
            type="button"
            disabled={activeStageIndex === 0}
            onClick={() => setActiveStageIndex(activeStageIndex - 1)}
            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#202938] transition-colors hover:bg-[#F8FAFC] disabled:opacity-30 cursor-pointer"
          >
            ← Previous Stage
          </button>
          <span className="font-mono text-xs font-semibold text-[#687386]">
            Stage {activeStageIndex + 1} of {timeline.length}
          </span>
          <button
            type="button"
            disabled={activeStageIndex >= timeline.length - 1}
            onClick={() => setActiveStageIndex(activeStageIndex + 1)}
            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#202938] transition-colors hover:bg-[#F8FAFC] disabled:opacity-30 cursor-pointer"
          >
            Next Stage →
          </button>
        </div>
      </div>

      {/* Active Stage Detail */}
      {activeStage && <StageDetailPanel stage={activeStage} />}
    </div>
  );
};

/* ─── Stage Detail Panel ─── */

const StageDetailPanel: React.FC<{ stage: TimelineStage }> = ({ stage }) => {
  const gc = gateColors[stage.gateState];
  const GateIcon = gc.icon;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Telemetry Snapshot */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938] lg:col-span-2">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#202938]">
          <Activity className="h-4 w-4 text-[#5267D8]" />
          Illustrative Telemetry — {stage.label}
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <TelemetryMini
            icon={<Wifi className="h-3.5 w-3.5" />}
            label="RTT"
            value={stage.telemetry.rtt_ms}
            unit="ms"
            warn={stage.telemetry.rtt_ms !== null && stage.telemetry.rtt_ms > 50}
          />
          <TelemetryMini
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Jitter"
            value={stage.telemetry.jitter_ms}
            unit="ms"
            warn={stage.telemetry.jitter_ms !== null && stage.telemetry.jitter_ms > 5}
          />
          <TelemetryMini
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            label="Pkt Loss"
            value={stage.telemetry.packet_loss_pct}
            unit="%"
            warn={stage.telemetry.packet_loss_pct !== null && stage.telemetry.packet_loss_pct > 1}
          />
          <TelemetryMini
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Throughput"
            value={stage.telemetry.throughput_mbps}
            unit="Mbps"
            warn={stage.telemetry.throughput_mbps !== null && stage.telemetry.throughput_mbps < 500}
          />
          <TelemetryMini
            icon={<Heart className="h-3.5 w-3.5" />}
            label="Sensor HP"
            value={stage.telemetry.sensorHealth}
            unit="%"
            warn={stage.telemetry.sensorHealth < 70}
          />
        </div>
        <p className="mt-3 font-mono text-[10px] text-[#687386]">
          Illustrative demonstration values — not measured telemetry.
        </p>
      </div>

      {/* Reliability State + Detector Observations */}
      <div className="space-y-4">
        {/* Gate State */}
        <div className={`rounded-2xl border ${gc.border} ${gc.bg} p-4 shadow-xs`}>
          <div className="flex items-center gap-2">
            <GateIcon className={`h-5 w-5 ${gc.text}`} />
            <span className={`font-mono text-sm font-bold uppercase ${gc.text}`}>
              {stage.gateState}
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {stage.reliabilityNotes.map((note, i) => (
              <li key={i} className="text-xs text-[#202938]">
                • {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Detectors */}
        <div className="rounded-2xl border border-[#E3E8F0] bg-white p-4 shadow-xs text-[#202938]">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#687386]">
            Detector Observations
          </h4>
          <div className="space-y-2">
            {stage.detectorObservations.map((obs, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#202938]">{obs.detectorName}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        obs.triggered ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, obs.score * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] text-[#687386]">
                    {obs.score.toFixed(2)}
                  </span>
                  {obs.triggered ? (
                    <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Telemetry Mini Card ─── */

const TelemetryMini: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | null;
  unit: string;
  warn?: boolean;
}> = ({ icon, label, value, unit, warn }) => (
  <div
    className={`rounded-xl border p-3 transition-colors ${
      warn
        ? 'border-amber-300 bg-amber-50/70 text-amber-950'
        : 'border-[#E3E8F0] bg-[#F8FAFC] text-[#202938]'
    }`}
  >
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#687386]">
      <span className={warn ? 'text-amber-600' : 'text-[#5267D8]'}>{icon}</span>
      {label}
    </div>
    <div className="mt-1.5 font-mono text-lg font-bold text-[#202938]">
      {value !== null ? value : '—'}
      <span className="ml-1 text-[10px] font-normal text-[#687386]">{unit}</span>
    </div>
  </div>
);
