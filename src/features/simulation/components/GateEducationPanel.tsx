import React from 'react';
import { CheckCircle2, ShieldAlert, ShieldOff, Info } from 'lucide-react';
import { gateStateExplanations } from '../fixtures/simulationFixture';

const stateIcons = {
  PREDICT: CheckCircle2,
  DEGRADED: ShieldAlert,
  ABSTAIN: ShieldOff,
};

const stateColors = {
  PREDICT: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    title: 'text-emerald-400',
    dot: 'bg-emerald-400',
    iconBg: 'bg-emerald-500/15',
  },
  DEGRADED: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    title: 'text-amber-400',
    dot: 'bg-amber-400',
    iconBg: 'bg-amber-500/15',
  },
  ABSTAIN: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    title: 'text-rose-400',
    dot: 'bg-rose-400',
    iconBg: 'bg-rose-500/15',
  },
};

export const GateEducationPanel: React.FC = () => {
  return (
    <div className="rounded-xl border border-precursor-border bg-precursor-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Info className="h-4 w-4 text-precursor-cyan" />
          Understanding the Reliability Gate
        </h3>
        <span className="rounded border border-precursor-border bg-precursor-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
          Educational Reference
        </span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        The reliability gate evaluates whether the system's predictions should be trusted given the
        current telemetry quality, distribution characteristics, residual model error, and calibration
        availability. The actual gate decisions will be implemented by the Python backend. The
        frontend does not implement or validate the real reliability-gating algorithm.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {gateStateExplanations.map((gs) => {
          const colors = stateColors[gs.state];
          const Icon = stateIcons[gs.state];
          return (
            <div
              key={gs.state}
              className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.iconBg}`}>
                  <Icon className={`h-4 w-4 ${colors.title}`} />
                </div>
                <h4 className={`text-sm font-bold ${colors.title}`}>{gs.title}</h4>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {gs.description}
              </p>

              <div className="mt-3">
                <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Conditions
                </h5>
                <ul className="space-y-1">
                  {gs.conditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${colors.dot}`} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 rounded-lg border border-precursor-border bg-precursor-surface/40 p-2.5">
                <p className="text-[11px] italic leading-snug text-slate-500">
                  {gs.example}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
