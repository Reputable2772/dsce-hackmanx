import React, { useEffect, useState } from 'react';
import { Activity, Shield, CheckCircle, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const LiveProbeMonitor: React.FC = () => {
  const targetHost = useAppStore((s) => s.targetHost);
  const targetPort = useAppStore((s) => s.targetPort);
  const interfaceId = useAppStore((s) => s.interfaceId);
  const gateState = useAppStore((s) => s.gateState);
  const isAutoStreaming = useAppStore((s) => s.isAutoStreaming);

  const [liveStats, setLiveStats] = useState<{
    latency_ms: number | null;
    jitter_ms: number | null;
    loss_pct: number | null;
    packet_rate: number | null;
    last_probe_time: number | null;
  }>({
    latency_ms: null,
    jitter_ms: null,
    loss_pct: null,
    packet_rate: null,
    last_probe_time: null,
  });

  const fetchLiveStats = async () => {
    try {
      const telem = await apiClient.fetchTelemetry(60);
      if (telem && Array.isArray(telem.points) && telem.points.length > 0) {
        let latestLat: number | null = null;
        let latestJitter: number | null = null;
        let latestLoss: number | null = null;
        let latestDrops: number | null = null;
        let latestTs: number | null = null;

        for (let i = telem.points.length - 1; i >= 0; i--) {
          const pt = telem.points[i];
          if (pt.source === 'synthetic') continue;
          if (latestLat === null && (pt.metric_id === 'latency_ms' || pt.metric_id === 'rtt_ms')) {
            latestLat = Number(pt.value);
            latestTs = pt.timestamp;
          }
          if (latestJitter === null && pt.metric_id === 'jitter_ms') {
            latestJitter = Number(pt.value);
          }
          if (latestLoss === null && pt.metric_id === 'packet_loss_pct') {
            latestLoss = Number(pt.value);
          }
          if (latestDrops === null && pt.metric_id === 'drops_in') {
            latestDrops = Number(pt.value);
          }
          if (latestLat !== null && latestJitter !== null && latestLoss !== null) break;
        }

        setLiveStats({
          latency_ms: latestLat,
          jitter_ms: latestJitter,
          loss_pct: latestLoss,
          packet_rate: latestDrops,
          last_probe_time: latestTs,
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchLiveStats();
    const timer = setInterval(fetchLiveStats, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-3.5 w-3.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Live Hardware Network Probe Monitor</span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5 border border-emerald-200 dark:border-emerald-800">
                PHYSICAL NIC
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Target Host: <code className="font-bold text-emerald-700 dark:text-emerald-400">{targetHost}:{targetPort}</code> • Interface: <code className="text-slate-700 dark:text-slate-300 font-medium">{interfaceId}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border ${
            gateState === 'PREDICT'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
              : gateState === 'DEGRADED'
              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
              : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
          }`}>
            <Shield className="h-3 w-3" />
            <span>Gate: {gateState}</span>
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Socket RTT</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {liveStats.latency_ms !== null ? `${liveStats.latency_ms.toFixed(2)} ms` : '--'}
          </p>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 inline-block font-medium">
            Physical round-trip time
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Observed Jitter</span>
            <Activity className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {liveStats.jitter_ms !== null ? `${liveStats.jitter_ms.toFixed(2)} ms` : '--'}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            Variation between probes
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Packet Loss</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {liveStats.loss_pct !== null ? `${liveStats.loss_pct.toFixed(1)}%` : '0.0%'}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            Inbound / outbound drops
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Inbound Echo RX</span>
            <ArrowDownLeft className="h-3.5 w-3.5 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {liveStats.packet_rate !== null ? `${liveStats.packet_rate} pkts` : 'Active'}
          </p>
          <span className="text-[11px] text-cyan-700 dark:text-cyan-400 mt-1 inline-block font-medium">
            SNMP ICMP InEchos
          </span>
        </div>
      </div>

      {/* Operational State Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span className="text-slate-700 dark:text-slate-300">
            Synthetic datasets are <strong>strictly purged</strong>. All measurements originate from physical Linux sockets & OS network counters.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Auto-stream: {isAutoStreaming ? <span className="text-emerald-600 font-bold">5s Polling Active</span> : <span className="text-slate-400">Manual Sampling</span>}
        </div>
      </div>
    </div>
  );
};
