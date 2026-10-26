import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  WifiOff 
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

export const LiveSystemStatusPanel: React.FC = () => {
  const { 
    connectionState, 
    latestStatus, 
    lastStatusUpdate, 
    backendVersion, 
    gateState,
    activeScenario 
  } = useAppStore();

  const isConnected = connectionState === 'connected';
  const [, setTick] = useState(0);

  // Re-render relative time every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  // Compute time since last update
  let ageSeconds: number | null = null;
  if (lastStatusUpdate) {
    ageSeconds = Math.max(0, Math.round((Date.now() - lastStatusUpdate) / 1000));
  }

  const isStale = ageSeconds !== null && ageSeconds > 10;

  // Extract actual backend fields
  const metrics = latestStatus?.latest_metrics;
  const latency = metrics?.latency_ms != null ? `${Number(metrics.latency_ms).toFixed(1)} ms` : '—';
  const packetLoss = metrics?.packet_loss_pct != null ? `${Number(metrics.packet_loss_pct).toFixed(1)}%` : '—';
  const throughput = metrics?.throughput_mbps != null ? `${Number(metrics.throughput_mbps).toFixed(0)} Mbps` : '—';
  const packetsIn = metrics?.packets_in_sec != null ? `${Number(metrics.packets_in_sec).toFixed(0)} p/s` : (metrics?.rx_packets_sec != null ? `${Number(metrics.rx_packets_sec).toFixed(0)} p/s` : '—');
  const packetsOut = metrics?.packets_out_sec != null ? `${Number(metrics.packets_out_sec).toFixed(0)} p/s` : (metrics?.tx_packets_sec != null ? `${Number(metrics.tx_packets_sec).toFixed(0)} p/s` : '—');
  const icmpRate = metrics?.icmp_inbound_rate != null ? Number(metrics.icmp_inbound_rate) : null;
  const linkUp = metrics?.link_up;
  const linkState = linkUp !== undefined ? (linkUp ? 'UP' : 'DOWN') : (isConnected ? '10/10 UP' : '—');
  const dropsIn = metrics?.drops_in != null ? `${metrics.drops_in}` : (metrics?.errors_in != null ? `${metrics.errors_in}` : '0');

  // Source & Scenario / Mode
  const rawMode = (latestStatus as any)?.mode || 'synthetic';
  const isLiveProbing = rawMode === 'live' || rawMode === 'live_probes';
  const dataSource = isLiveProbing ? 'LIVE' : 'SYNTHETIC';
  const scenarioLabel = isLiveProbing
    ? 'Active Server & Probe'
    : latestStatus?.scenario
    ? latestStatus.scenario.replace(/_/g, ' ')
    : activeScenario || '—';

  // Gate display
  const activeGate = latestStatus?.gate_state || gateState || 'PREDICT';
  const gateColors = 
    activeGate === 'PREDICT' 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
      : activeGate === 'DEGRADED' 
      ? 'bg-amber-50 text-amber-700 border-amber-200' 
      : 'bg-rose-50 text-rose-700 border-rose-200';

  const GateIcon = activeGate === 'PREDICT' ? ShieldCheck : activeGate === 'DEGRADED' ? AlertTriangle : ShieldAlert;

  return (
    <div className="border-t border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs font-mono text-[#202938]">
      {/* Header: Connection & Source */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E3E8F0]/80">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-slate-400" />
          )}
          <span className="font-semibold text-[11px] text-[#202938]">
            {isConnected ? 'LIVE BACKEND' : 'OFFLINE / DISCONNECTED'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
            dataSource === 'LIVE' 
              ? 'bg-teal-50 text-teal-700 border-teal-200' 
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {dataSource}
          </span>
        </div>
      </div>

      {/* Offline Alert if disconnected */}
      {!isConnected && (
        <div className="my-2 rounded bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
          <div className="flex items-center gap-1.5 font-bold">
            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
            <span>Backend Unreachable</span>
          </div>
          <p className="mt-0.5 text-[10px] text-amber-700">
            {lastStatusUpdate 
              ? `Last sync ${ageSeconds}s ago (data is stale). Reconnecting to http://127.0.0.1:8000...` 
              : 'Start server via `python -m precursor.server`.'}
          </p>
        </div>
      )}

      {/* Scenario / Mode & Gate Row */}
      <div className="pt-2 pb-1 space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#687386]">{isLiveProbing ? 'Probing Mode:' : 'Scenario:'}</span>
          <span className="font-semibold text-[#202938] truncate max-w-[130px]" title={scenarioLabel}>
            {scenarioLabel}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#687386]">Gate State:</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${gateColors}`}>
            <GateIcon className="h-3 w-3" />
            <span>{activeGate}</span>
          </span>
        </div>
      </div>

      {/* 2x3 Telemetry Metric Matrix */}
      <div className="my-2 grid grid-cols-2 gap-1.5 text-[10px] border-t border-b border-[#E3E8F0]/80 py-2">
        <div className="rounded bg-white p-1.5 border border-[#E3E8F0]">
          <span className="text-emerald-700 font-semibold block text-[9px]">RX Arrival</span>
          <span className="font-bold text-[#202938]">{packetsIn}</span>
        </div>

        <div className="rounded bg-white p-1.5 border border-[#E3E8F0]">
          <span className="text-indigo-700 font-semibold block text-[9px]">TX Transmit</span>
          <span className="font-bold text-[#202938]">{packetsOut}</span>
        </div>

        <div className="rounded bg-white p-1.5 border border-[#E3E8F0]">
          <span className="text-[#687386] block text-[9px]">Probe RTT</span>
          <span className="font-bold text-[#202938]">{latency}</span>
        </div>

        <div className="rounded bg-white p-1.5 border border-[#E3E8F0]">
          <span className="text-[#687386] block text-[9px]">Probe Loss</span>
          <span className={`font-bold ${metrics?.packet_loss_pct && metrics.packet_loss_pct > 1 ? 'text-rose-600' : 'text-[#202938]'}`}>
            {packetLoss}
          </span>
        </div>

        <div className="rounded bg-white p-1.5 border border-[#E3E8F0]">
          <span className="text-[#687386] block text-[9px]">Throughput</span>
          <span className="font-bold text-[#202938]">{throughput}</span>
        </div>

        <div className="rounded bg-white p-1.5 border border-[#E3E8F0]">
          <span className="text-[#687386] block text-[9px]">Inbound Drops</span>
          <span className={`font-bold ${Number(dropsIn) > 0 ? 'text-rose-600' : 'text-[#202938]'}`}>{dropsIn}</span>
        </div>
      </div>

      {/* ICMP Inbound & Links */}
      <div className="space-y-0.5 text-[10px] text-[#687386]">
        {icmpRate !== null && icmpRate > 0 && (
          <div className="flex justify-between font-mono">
            <span className="text-emerald-700 font-medium">Inbound ICMP:</span>
            <span className={`font-bold ${icmpRate > 50 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {icmpRate.toFixed(1)} pkts/s
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Link State:</span>
          <span className="font-semibold text-emerald-700">{linkState}</span>
        </div>
      </div>

      {/* Footer: Update age & API Health */}
      <div className="mt-2 pt-1.5 border-t border-[#E3E8F0]/80 flex items-center justify-between text-[9px] text-[#687386]">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-400" />
          <span>
            {ageSeconds !== null ? `${ageSeconds}s ago` : 'Waiting'}
            {isStale && <span className="text-amber-600 font-bold ml-1">(Stale)</span>}
          </span>
        </div>
        <span>{backendVersion ? `API v${backendVersion}` : 'precursor-api'}</span>
      </div>
    </div>
  );
};
