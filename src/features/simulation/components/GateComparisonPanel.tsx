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
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-[#EEF2FF] text-[#5267D8]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202938]">
                Gate On vs Gate Off — {comparison.scenarioName}
              </h3>
              <p className="text-xs text-[#687386]">Seed: {comparison.seed}</p>
            </div>
          </div>
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[10px] font-semibold uppercase text-amber-800">
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
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <h4 className="mb-4 text-sm font-bold text-[#202938]">Comparison Chart</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#1E293B',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#64748B' }} />
              <Bar dataKey="Gate On" fill="#5267D8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gate Off" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <h4 className="mb-2 text-sm font-bold text-[#202938]">Explanation</h4>
        <p className="text-sm leading-relaxed text-[#687386]">{comparison.explanation}</p>

        <div className="mt-4 space-y-2 border-t border-[#E3E8F0] pt-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#687386]">
            Important Context
          </h5>
          <ul className="space-y-1.5 text-xs text-[#687386]">
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5267D8]" />
              Gate-on and gate-off comparisons are meaningful only when both modes use identical scenario seeds, fault timings, and evaluation conditions.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5267D8]" />
              Abstention is not automatically a missed detection; immediate rule-based fault detection can remain active while future predictions are withheld.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5267D8]" />
              A prediction score is not a probability unless calibrated and validated.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5267D8]" />
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
    <div className="rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-[#202938]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#687386]">
        <span className="text-[#5267D8]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-[#5267D8]" />
            <span className="font-mono text-base font-bold text-[#202938]">{gateOnValue}</span>
            <span className="text-[10px] text-[#687386]">{unit}</span>
          </div>
          <span className="text-[9px] font-semibold text-[#5267D8]">Gate On</span>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <ShieldOff className="h-3 w-3 text-amber-600" />
            <span className="font-mono text-base font-bold text-[#687386]">{gateOffValue}</span>
            <span className="text-[10px] text-[#687386]">{unit}</span>
          </div>
          <span className="text-[9px] font-semibold text-amber-600">Gate Off</span>
        </div>
      </div>
      {comparison !== 'neutral' && (
        <div className={`mt-1.5 text-[10px] font-semibold ${
          comparison === 'better' ? 'text-emerald-700' : comparison === 'worse' ? 'text-rose-700' : 'text-[#687386]'
        }`}>
          {comparison === 'better' ? '↑ Gate On advantage' : comparison === 'worse' ? '↓ Gate Off advantage' : 'Equal'}
        </div>
      )}
    </div>
  );
};
