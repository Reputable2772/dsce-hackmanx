import React from 'react';
import {
  Shield,
  ShieldOff,
  AlertTriangle,
  Clock,
  Target,
  XCircle,
  PauseCircle,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { GateComparisonResult } from '../types';

interface GateComparisonPanelProps {
  comparison: GateComparisonResult;
}

export const GateComparisonPanel: React.FC<GateComparisonPanelProps> = ({
  comparison,
}) => {
  const chartData = [
    {
      name: 'Detected Events',
      'Gate On': comparison.gateOn.detectedEvents,
      'Gate Off': comparison.gateOff.detectedEvents,
    },
    {
      name: 'False Alarms/hr',
      'Gate On': comparison.gateOn.falseAlarmsPerHour,
      'Gate Off': comparison.gateOff.falseAlarmsPerHour,
    },
    {
      name: 'Warning Lead (min)',
      'Gate On': comparison.gateOn.warningLeadTimeMinutes,
      'Gate Off': comparison.gateOff.warningLeadTimeMinutes,
    },
    {
      name: 'Late/Missed',
      'Gate On': comparison.gateOn.lateOrMissedEvents,
      'Gate Off': comparison.gateOff.lateOrMissedEvents,
    },
    {
      name: 'Abstention Rate',
      'Gate On': +(comparison.gateOn.abstentionRate * 100).toFixed(1),
      'Gate Off': +(comparison.gateOff.abstentionRate * 100).toFixed(1),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-precursor-border bg-precursor-card/60 p-5 backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-precursor-purple/40 bg-precursor-purple/15 text-precursor-purple">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Gate On vs Gate Off — {comparison.scenarioName}
              </h3>
              <p className="text-xs text-slate-400">Seed: {comparison.seed}</p>
            </div>
          </div>
          <span className="rounded border border-precursor-amber/30 bg-precursor-amber/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase text-precursor-amber">
            Illustrative evaluation only — not measured benchmark results
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ComparisonMetricCard
            icon={<Target className="h-4 w-4" />}
            label="Detected Events"
            gateOnValue={`${comparison.gateOn.detectedEvents}`}
            gateOffValue={`${comparison.gateOff.detectedEvents}`}
            unit=""
            lowerIsBetter={false}
          />
          <ComparisonMetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="False Alarms/hr"
            gateOnValue={comparison.gateOn.falseAlarmsPerHour.toFixed(2)}
            gateOffValue={comparison.gateOff.falseAlarmsPerHour.toFixed(2)}
            unit="/hr"
            lowerIsBetter={true}
          />
          <ComparisonMetricCard
            icon={<Clock className="h-4 w-4" />}
            label="Warning Lead Time"
            gateOnValue={comparison.gateOn.warningLeadTimeMinutes.toFixed(1)}
            gateOffValue={comparison.gateOff.warningLeadTimeMinutes.toFixed(1)}
            unit="min"
            lowerIsBetter={false}
          />
          <ComparisonMetricCard
            icon={<XCircle className="h-4 w-4" />}
            label="Late / Missed"
            gateOnValue={`${comparison.gateOn.lateOrMissedEvents}`}
            gateOffValue={`${comparison.gateOff.lateOrMissedEvents}`}
            unit=""
            lowerIsBetter={true}
          />
          <ComparisonMetricCard
            icon={<PauseCircle className="h-4 w-4" />}
            label="Abstention Rate"
            gateOnValue={`${(comparison.gateOn.abstentionRate * 100).toFixed(1)}`}
            gateOffValue={`${(comparison.gateOff.abstentionRate * 100).toFixed(1)}`}
            unit="%"
            lowerIsBetter={null}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-precursor-border bg-precursor-card/60 p-5 backdrop-blur-sm">
        <h4 className="mb-4 text-sm font-bold text-white">Comparison Chart</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#151728',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Bar dataKey="Gate On" fill="#9B7BFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gate Off" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-precursor-border bg-precursor-card/60 p-5 backdrop-blur-sm">
        <h4 className="mb-2 text-sm font-bold text-white">Explanation</h4>
        <p className="text-sm leading-relaxed text-slate-300">{comparison.explanation}</p>

        <div className="mt-4 space-y-2 border-t border-precursor-border pt-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Important Context
          </h5>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-precursor-cyan" />
              Gate-on and gate-off comparisons are meaningful only when both modes use identical scenario seeds, fault timings, and evaluation conditions.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-precursor-cyan" />
              Abstention is not automatically a missed detection; immediate rule-based fault detection can remain active while future predictions are withheld.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-precursor-cyan" />
              A prediction score is not a probability unless calibrated and validated.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-precursor-cyan" />
              Distribution shift does not necessarily imply service impact.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ─── Comparison Metric Card ─── */

const ComparisonMetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  gateOnValue: string;
  gateOffValue: string;
  unit: string;
  lowerIsBetter: boolean | null;
}> = ({ icon, label, gateOnValue, gateOffValue, unit, lowerIsBetter }) => {
  const onNum = parseFloat(gateOnValue);
  const offNum = parseFloat(gateOffValue);
  let comparison: 'better' | 'worse' | 'equal' | 'neutral' = 'neutral';

  if (lowerIsBetter !== null && onNum !== offNum) {
    if (lowerIsBetter) {
      comparison = onNum < offNum ? 'better' : 'worse';
    } else {
      comparison = onNum > offNum ? 'better' : onNum < offNum ? 'worse' : 'equal';
    }
  }

  return (
    <div className="rounded-lg border border-precursor-border bg-precursor-surface/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <span className="text-precursor-purple">{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-precursor-purple" />
            <span className="font-mono text-base font-bold text-white">{gateOnValue}</span>
            <span className="text-[10px] text-slate-500">{unit}</span>
          </div>
          <span className="text-[9px] text-precursor-purple">Gate On</span>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <ShieldOff className="h-3 w-3 text-precursor-amber" />
            <span className="font-mono text-base font-bold text-slate-300">{gateOffValue}</span>
            <span className="text-[10px] text-slate-500">{unit}</span>
          </div>
          <span className="text-[9px] text-precursor-amber">Gate Off</span>
        </div>
      </div>
      {comparison !== 'neutral' && (
        <div className={`mt-1.5 text-[10px] font-semibold ${
          comparison === 'better' ? 'text-precursor-teal' : comparison === 'worse' ? 'text-precursor-coral' : 'text-slate-400'
        }`}>
          {comparison === 'better' ? '↑ Gate On advantage' : comparison === 'worse' ? '↓ Gate Off advantage' : 'Equal'}
        </div>
      )}
    </div>
  );
};
