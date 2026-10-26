import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { Layers, AlertTriangle } from 'lucide-react';
import { TelemetryPointRecord, MetricId, EventWindow } from '../types';

interface TelemetryChartSectionProps {
  data: TelemetryPointRecord[];
  selectedMetric?: MetricId | 'all';
  eventWindows?: EventWindow[];
  timeRange?: string;
}

// Custom interactive Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const pt: TelemetryPointRecord | undefined = payload[0]?.payload;
    const quality = pt?.quality || 'good';

    return (
      <div className="rounded-xl border border-white/[0.1] bg-precursor-card-glass p-3 font-mono text-xs shadow-glass-panel backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-1.5 text-slate-400">
          <span>Time: <strong className="text-white font-bold">{label}</strong></span>
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold ${
            quality === 'good' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            quality === 'stale' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
            quality === 'missing' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
            'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          }`}>
            {quality}
          </span>
        </div>

        <div className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white">
                {entry.value !== null && entry.value !== undefined ? entry.value : <span className="text-rose-400 italic">NULL (Missing)</span>}
              </span>
            </div>
          ))}
        </div>

        {pt?.isEventWindow && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-white/[0.06] pt-1.5 text-[10px] text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Event window: Contention & Buffer Saturation</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const TelemetryChartSection: React.FC<TelemetryChartSectionProps> = ({
  data,
  selectedMetric: _selectedMetric,
  eventWindows: _eventWindows,
  timeRange: _timeRange
}) => {
  const [showEventWindows, setShowEventWindows] = useState(true);
  const [showThresholds, setShowThresholds] = useState(true);
  const [activeTab, setActiveTab] = useState<'latency_loss' | 'throughput_jitter'>('latency_loss');

  return (
    <div className="space-y-4">
      {/* Chart Section Header & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-precursor-card-glass px-4 py-3 backdrop-blur-xl shadow-glass-panel">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-precursor-cyan" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Telemetry Time-Series Observation Buffer
          </h3>
          <span className="rounded bg-precursor-violet/60 border border-precursor-purple/30 px-2 py-0.5 font-mono text-[11px] text-precursor-lavender">
            {data.length} steps @ 5s
          </span>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <label className="flex cursor-pointer items-center gap-1.5 text-slate-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={showThresholds}
              onChange={(e) => setShowThresholds(e.target.checked)}
              className="rounded border-white/[0.2] bg-precursor-surface text-precursor-cyan focus:ring-0"
            />
            <span>SLA Threshold Lines</span>
          </label>

          <label className="flex cursor-pointer items-center gap-1.5 text-slate-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={showEventWindows}
              onChange={(e) => setShowEventWindows(e.target.checked)}
              className="rounded border-white/[0.2] bg-precursor-surface text-precursor-cyan focus:ring-0"
            />
            <span>Highlight Event Windows</span>
          </label>

          {/* View Tab Selector */}
          <div className="flex rounded-lg border border-white/[0.1] bg-precursor-surface p-0.5">
            <button
              onClick={() => setActiveTab('latency_loss')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                activeTab === 'latency_loss'
                  ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Latency & Loss
            </button>
            <button
              onClick={() => setActiveTab('throughput_jitter')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                activeTab === 'throughput_jitter'
                  ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Throughput & Errors
            </button>
          </div>
        </div>
      </div>

      {/* Main Primary Chart Container */}
      <div className="rounded-xl border border-white/[0.08] bg-precursor-card-glass p-4 backdrop-blur-xl shadow-glass-panel">
        {activeTab === 'latency_loss' ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span>Round-Trip Latency (ms, Left Axis)</span>
                <span className="h-2 w-2 rounded-full bg-rose-400 ml-3" />
                <span>Packet Loss (%, Right Axis)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Gap at 14:02:30 represents deliberate missing probe interval
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2254" vertical={false} />
                  
                  <XAxis 
                    dataKey="timeLabel" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={{ stroke: '#475569' }}
                    interval={5}
                  />
                  
                  <YAxis 
                    yAxisId="left"
                    stroke="#48ddf5" 
                    tick={{ fill: '#48ddf5', fontSize: 11 }}
                    domain={[10, 60]}
                    unit="ms"
                  />

                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#f43f5e" 
                    tick={{ fill: '#f43f5e', fontSize: 11 }}
                    domain={[0, 3.0]}
                    unit="%"
                  />

                  <Tooltip content={<CustomTooltip />} />

                  {/* Threshold Lines */}
                  {showThresholds && (
                    <>
                      <ReferenceLine 
                        yAxisId="left" 
                        y={35.0} 
                        stroke="#f59e0b" 
                        strokeDasharray="4 4" 
                        label={{ value: 'SLA Warning 35ms', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} 
                      />
                      <ReferenceLine 
                        yAxisId="left" 
                        y={50.0} 
                        stroke="#f43f5e" 
                        strokeDasharray="4 4" 
                        label={{ value: 'Critical SLA 50ms', fill: '#f43f5e', fontSize: 10, position: 'insideTopLeft' }} 
                      />
                      <ReferenceLine 
                        yAxisId="right" 
                        y={2.0} 
                        stroke="#e11d48" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Loss Breach 2.0%', fill: '#e11d48', fontSize: 10, position: 'insideTopRight' }} 
                      />
                    </>
                  )}

                  {/* Event Window Area */}
                  {showEventWindows && (
                    <ReferenceArea
                      yAxisId="left"
                      x1="14:02:00"
                      x2="14:03:45"
                      fill="#9b7bff"
                      fillOpacity={0.08}
                      stroke="#9b7bff"
                      strokeDasharray="3 3"
                    />
                  )}

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="rtt_ms"
                    name="Latency"
                    stroke="#48ddf5"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#48ddf5', stroke: '#111323', strokeWidth: 2 }}
                    connectNulls={false} // Preserves missing value gaps
                  />

                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="packet_loss_pct"
                    name="Packet Loss"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#f43f5e', stroke: '#111323', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Throughput (Mbps, Left Axis)</span>
                <span className="h-2 w-2 rounded-full bg-amber-400 ml-3" />
                <span>Interface CRC / Drops (pkts/s, Right Axis)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Egress interface counters sampled per 5s polling cycle
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#45d6b5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#45d6b5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2254" vertical={false} />
                  
                  <XAxis 
                    dataKey="timeLabel" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    interval={5}
                  />
                  
                  <YAxis 
                    yAxisId="left"
                    stroke="#45d6b5" 
                    tick={{ fill: '#45d6b5', fontSize: 11 }}
                    domain={[400, 1100]}
                    unit="M"
                  />

                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b" 
                    tick={{ fill: '#f59e0b', fontSize: 11 }}
                    domain={[0, 20]}
                    unit="p/s"
                  />

                  <Tooltip content={<CustomTooltip />} />

                  {showThresholds && (
                    <ReferenceLine 
                      yAxisId="right" 
                      y={10} 
                      stroke="#f59e0b" 
                      strokeDasharray="4 4" 
                      label={{ value: 'Drop Warning 10 pkts/s', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} 
                    />
                  )}

                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="throughput_mbps"
                    name="Throughput"
                    stroke="#45d6b5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorThroughput)"
                    connectNulls={false}
                  />

                  <Line
                    yAxisId="right"
                    type="stepAfter"
                    dataKey="interface_errors"
                    name="Interface Drops"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Legend description bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between border-t border-violet-900/30 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-purple-500/30 border border-purple-400" />
              <span>Event Window (Active Microburst)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-400" />
              <span>SLA Warning Boundary</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-rose-500" />
              <span>Critical Breach Boundary</span>
            </span>
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            * Missing data points render as broken continuity gaps (zero assumptions prohibited)
          </div>
        </div>
      </div>
    </div>
  );
};
