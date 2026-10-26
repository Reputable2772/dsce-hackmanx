import React, { useState } from 'react';
import {
  Table2,
  AlertTriangle,
  Clock,
  Target,
  XCircle,
  PauseCircle,
  Info,
  ChevronDown,
  ChevronUp,
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
import { getAllEvaluationRows, evaluationLimitations } from '../fixtures/simulationFixture';
import type { ScenarioId } from '../types';

interface EvaluationDashboardProps {
  activeScenarioId?: ScenarioId;
  onSelectScenario?: (id: ScenarioId) => void;
}

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  activeScenarioId,
  onSelectScenario,
}) => {
  const [showLimitations, setShowLimitations] = useState(false);
  const rows = getAllEvaluationRows();

  // Build chart data for all scenarios
  const chartData = rows
    .filter((r) => r.available && r.gateOn && r.gateOff)
    .map((r) => ({
      name: r.scenarioName.length > 18 ? r.scenarioName.slice(0, 18) + '…' : r.scenarioName,
      'False Alarms/hr (On)': r.gateOn!.falseAlarmsPerHour,
      'False Alarms/hr (Off)': r.gateOff!.falseAlarmsPerHour,
      'Abstention % (On)': +(r.gateOn!.abstentionRate * 100).toFixed(1),
    }));

  return (
    <div className="space-y-4">
      {/* Disclaimer Banner */}
      <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs font-semibold">
          Illustrative evaluation only — not measured benchmark results.
        </p>
      </div>

      {/* Metric Definitions */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#202938]">
          <Info className="h-4 w-4 text-[#5267D8]" />
          Evaluation Metric Definitions
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { icon: <Target className="h-3.5 w-3.5" />, label: 'Detected Events', def: 'Number of genuine service-impacting events correctly identified by the system.' },
            { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'False Alarms / hr', def: 'Average spurious alerts per hour with no corresponding real event. Lower is better.' },
            { icon: <Clock className="h-3.5 w-3.5" />, label: 'Warning Lead Time', def: 'Minutes of advance notice before a real fault manifests. Higher is generally better.' },
            { icon: <XCircle className="h-3.5 w-3.5" />, label: 'Late / Missed Events', def: 'Events detected too late to act on, or missed entirely.' },
            { icon: <PauseCircle className="h-3.5 w-3.5" />, label: 'Abstention Rate', def: 'Fraction of prediction windows where the gate withholds predictions due to insufficient reliability.' },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5267D8]">
                {m.icon}
                {m.label}
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-[#687386]">{m.def}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Chart across scenarios */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#202938]">
          <Table2 className="h-4 w-4 text-[#5267D8]" />
          Cross-Scenario False Alarm & Abstention Overview
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748B', fontSize: 9 }}
                axisLine={{ stroke: '#E2E8F0' }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
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
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="False Alarms/hr (On)" fill="#5267D8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="False Alarms/hr (Off)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Abstention % (On)" fill="#06B6D4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenario-by-Scenario Table */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#202938]">
          <Table2 className="h-4 w-4 text-[#5267D8]" />
          Scenario-by-Scenario Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E3E8F0]">
                <th className="whitespace-nowrap px-3 py-2 font-semibold text-[#687386]">Scenario</th>
                <th className="px-2 py-2 text-center font-semibold text-[#5267D8]" colSpan={5}>Gate On</th>
                <th className="px-2 py-2 text-center font-semibold text-amber-600" colSpan={5}>Gate Off</th>
              </tr>
              <tr className="border-b border-[#E3E8F0] text-[10px] uppercase tracking-wider text-[#687386]">
                <th className="px-3 py-1.5" />
                <th className="px-2 py-1.5 text-center">Det.</th>
                <th className="px-2 py-1.5 text-center">FA/hr</th>
                <th className="px-2 py-1.5 text-center">Lead</th>
                <th className="px-2 py-1.5 text-center">Missed</th>
                <th className="px-2 py-1.5 text-center">Abst.</th>
                <th className="px-2 py-1.5 text-center">Det.</th>
                <th className="px-2 py-1.5 text-center">FA/hr</th>
                <th className="px-2 py-1.5 text-center">Lead</th>
                <th className="px-2 py-1.5 text-center">Missed</th>
                <th className="px-2 py-1.5 text-center">Abst.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isActive = row.scenarioId === activeScenarioId;
                return (
                  <tr
                    key={row.scenarioId}
                    onClick={() => onSelectScenario?.(row.scenarioId)}
                    className={`cursor-pointer border-b border-[#E3E8F0]/60 transition-colors ${
                      isActive
                        ? 'bg-[#EEF2FF]'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-[#202938]">
                      {row.scenarioName}
                    </td>
                    {row.available && row.gateOn ? (
                      <>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOn.detectedEvents}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOn.falseAlarmsPerHour.toFixed(2)}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOn.warningLeadTimeMinutes.toFixed(1)}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOn.lateOrMissedEvents}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{(row.gateOn.abstentionRate * 100).toFixed(1)}%</td>
                      </>
                    ) : (
                      <td className="px-2 py-2 text-center text-[#687386]" colSpan={5}>
                        No evaluation data available
                      </td>
                    )}
                    {row.available && row.gateOff ? (
                      <>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOff.detectedEvents}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOff.falseAlarmsPerHour.toFixed(2)}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOff.warningLeadTimeMinutes.toFixed(1)}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{row.gateOff.lateOrMissedEvents}</td>
                        <td className="px-2 py-2 text-center font-mono text-[#202938]">{(row.gateOff.abstentionRate * 100).toFixed(1)}%</td>
                      </>
                    ) : (
                      <td className="px-2 py-2 text-center text-[#687386]" colSpan={5}>
                        No evaluation data available
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Limitations */}
      <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-xs text-[#202938]">
        <button
          type="button"
          onClick={() => setShowLimitations(!showLimitations)}
          className="flex w-full items-center justify-between text-sm font-bold text-[#202938] cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Limitations & Caveats
          </span>
          {showLimitations ? (
            <ChevronUp className="h-4 w-4 text-[#687386]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#687386]" />
          )}
        </button>
        {showLimitations && (
          <ul className="mt-3 space-y-2 border-t border-[#E3E8F0] pt-3">
            {evaluationLimitations.map((lim, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#687386]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {lim}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
