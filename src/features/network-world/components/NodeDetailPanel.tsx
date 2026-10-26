import React, { useState } from 'react';
import {
  Server,
  Network,
  Activity,
  Zap,
  MapPin,
  HardDrive,
  ShieldAlert,
  ArrowRight,
  X,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Info,
  Clock,
  Radio,
} from 'lucide-react';
import { TopologyNodeData, TopologyLinkData } from '../types';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { apiClient } from '@/lib/api';

interface NodeDetailPanelProps {
  selectedNode: TopologyNodeData | null;
  selectedLink: TopologyLinkData | null;
  allNodes: TopologyNodeData[];
  onSelectNode: (node: TopologyNodeData | null) => void;
  onClear: () => void;
  onRefreshTopology?: () => void;
  isPeerTopology?: boolean;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  selectedNode,
  selectedLink,
  allNodes,
  onSelectNode,
  onClear,
  onRefreshTopology,
  isPeerTopology = false,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  const isLocalHost = selectedNode?.id === 'local-host';
  const isLiveProbe = !!selectedNode?.id?.startsWith('target-') || !!selectedNode?.metadata?.role?.toLowerCase().includes('live probe') || !!selectedNode?.metadata?.role?.toLowerCase().includes('active target');
  const isPeerNode = isPeerTopology || (selectedNode?.type === 'endpoint' && selectedNode.metadata.role?.includes('Peer'));
  const isLiveTarget =
    Boolean(selectedNode?.id?.startsWith('target-')) ||
    selectedNode?.metadata?.role === 'Live Probe Target' ||
    Boolean(selectedNode?.name?.toLowerCase().includes('probe target'));

  const handleTriggerProbe = async () => {
    if (!selectedNode || isLocalHost) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await apiClient.triggerSystemProbe(selectedNode.id);
      setActionMessage(`Probe updated: ${res.diagnostic_message}`);
      if (onRefreshTopology) onRefreshTopology();
    } catch (err: any) {
      setActionMessage(`Probe failed: ${err.message || 'Target unreachable'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleProbe = async () => {
    if (!selectedNode || isLocalHost) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await apiClient.toggleSystemProbe(selectedNode.id);
      setActionMessage(res.probe_enabled ? 'Active probing enabled' : 'Probing paused by operator');
      if (onRefreshTopology) onRefreshTopology();
    } catch (err: any) {
      setActionMessage(`Toggle failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePeer = async () => {
    if (!selectedNode || isLocalHost) return;
    if (!confirm(`Are you sure you want to remove peer '${selectedNode.name}' from active topology?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.removeSystem(selectedNode.id);
      onClear();
      if (onRefreshTopology) onRefreshTopology();
    } catch (err: any) {
      setActionMessage(`Delete failed: ${err.message}`);
      setActionLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm transition-all text-[#202938]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-[#5267D8]" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#202938]">
            {selectedNode ? 'System Node Inspector' : selectedLink ? 'Conduit Link Inspector' : 'Network Inspector'}
          </h3>
        </div>
        {(selectedNode || selectedLink) && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg p-1 text-[#687386] hover:bg-slate-100 hover:text-[#202938] transition"
            title="Deselect"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5 text-xs text-[#5267D8]">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="leading-tight font-medium">{actionMessage}</span>
        </div>
      )}

      {selectedNode ? (
        <div className="mt-4 space-y-4">
          {/* Node Identity */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-bold text-[#202938]">{selectedNode.name}</h4>
              <StatusBadge
                label={selectedNode.status}
                variant={selectedNode.status as StatusVariant}
                size="sm"
              />
            </div>
            <div className="mt-1 font-mono text-xs text-[#687386] flex items-center gap-2">
              <span>ID: <span className="text-[#5267D8] font-semibold">{selectedNode.id}</span></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                {isLiveTarget || isLiveProbe ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800 shadow-xs animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    LIVE PROBE TARGET
                  </span>
                ) : isLocalHost ? (
                  <span className="rounded bg-indigo-50 text-[#5267D8] px-1.5 py-0.5 text-[10px] font-semibold">
                    LOCAL HOST
                  </span>
                ) : isPeerNode ? (
                  <span className="rounded bg-teal-50 text-[#159E98] px-1.5 py-0.5 text-[10px] font-semibold">
                    CONFIGURED PEER
                  </span>
                ) : (
                  <span className="uppercase text-slate-500 font-semibold">{selectedNode.type}</span>
                )}
              </span>
            </div>
          </div>

          {/* Highlight for Live Probe Target */}
          {isLiveTarget && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-xs text-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
                  <span>Real-Time Live Socket Target</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Target Probed
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between border-t border-emerald-200/80 pt-2 font-mono">
                <span className="text-[11px] text-emerald-800">Probe Round-Trip Latency:</span>
                <span className="text-base font-bold text-emerald-900">
                  {selectedNode.metrics.latencyMs !== null && selectedNode.metrics.latencyMs !== undefined
                    ? `${selectedNode.metrics.latencyMs.toFixed(1)} ms`
                    : 'Awaiting Next 5s Probe...'}
                </span>
              </div>
            </div>
          )}

          {/* Location & Metadata Details */}
          <div className="rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#202938]">
              <Server className="h-3.5 w-3.5 text-[#5267D8]" />
              <span className="font-semibold">{selectedNode.metadata.role || 'Network Node'}</span>
            </div>
            <div className="flex items-center gap-2 text-[#687386]">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{selectedNode.metadata.location || 'Configured Target'}</span>
            </div>
            <div className="flex items-center gap-2 text-[#687386] font-mono">
              <HardDrive className="h-3.5 w-3.5 text-slate-400" />
              <span>{selectedNode.metadata.ipAddress} ({selectedNode.metadata.interfaceName})</span>
            </div>
            {selectedNode.metadata.firmware && (
              <div className="flex items-center gap-2 text-[11px] text-[#687386] border-t border-slate-200/80 pt-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="truncate">{selectedNode.metadata.firmware}</span>
              </div>
            )}
          </div>

          {/* Real Telemetry Probes */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#687386] mb-2 flex items-center justify-between">
              <span>Measured Network Metrics</span>
              <span className="text-[10px] lowercase font-mono text-slate-400">
                {isLocalHost ? 'loopback' : 'icmp/tcp probe'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-[#E3E8F0] bg-white p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-[#687386]">
                  <Zap className="h-3 w-3 text-[#5267D8]" />
                  <span>Round-Trip Latency</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-[#202938]">
                  {selectedNode.metrics.latencyMs !== null && selectedNode.metrics.latencyMs !== undefined
                    ? `${selectedNode.metrics.latencyMs.toFixed(1)} ms`
                    : <span className="text-slate-400 font-normal">--</span>}
                </div>
              </div>

              <div className="rounded-xl border border-[#E3E8F0] bg-white p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-[#687386]">
                  <Activity className="h-3 w-3 text-[#159E98]" />
                  <span>Packet Loss</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-[#202938]">
                  {selectedNode.metrics.packetLossPct !== null && selectedNode.metrics.packetLossPct !== undefined
                    ? `${selectedNode.metrics.packetLossPct.toFixed(1)} %`
                    : <span className="text-slate-400 font-normal">0.0 %</span>}
                </div>
              </div>

              <div className="rounded-xl border border-[#E3E8F0] bg-white p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-[#687386]">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span>Jitter (RTT Variance)</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-[#202938]">
                  {selectedNode.metrics.jitterMs !== null && selectedNode.metrics.jitterMs !== undefined
                    ? `${selectedNode.metrics.jitterMs.toFixed(1)} ms`
                    : <span className="text-slate-400 text-[11px] font-normal">insufficient samples</span>}
                </div>
              </div>

              <div className="rounded-xl border border-[#E3E8F0] bg-white p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-[#687386]">
                  <Radio className="h-3 w-3 text-indigo-500" />
                  <span>Reachability State</span>
                </div>
                <div className="mt-1 font-mono text-xs font-bold capitalize text-[#202938]">
                  {selectedNode.status === 'offline' ? 'Probing Disabled' : selectedNode.status}
                </div>
              </div>
            </div>
          </div>

          {/* Remote Internal Telemetry Notice (Honest Telemetry Rule) */}
          {isPeerNode && !isLocalHost && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-[#687386] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#202938]">
                <Info className="h-3.5 w-3.5 text-slate-500" />
                <span>Peer Internal Host Telemetry</span>
              </div>
              <p className="leading-relaxed">
                Remote CPU, memory, link utilization, and packet counters are marked <span className="font-semibold text-slate-700">Unavailable</span> because no remote monitoring agent is installed on the peer. Only verified network-level reachability and RTT are reported.
              </p>
            </div>
          )}

          {/* Degraded Diagnostic Callout */}
          {selectedNode.status === 'degraded' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Elevated Latency / Packet Drop</span>
              </div>
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                Latency ({selectedNode.metrics.latencyMs}ms) or packet drop has crossed warning threshold. Network path may be congested or firewall rate-limiting ICMP.
              </p>
            </div>
          )}

          {/* Peer Operator Actions Strip */}
          {isPeerNode && !isLocalHost && (
            <div className="pt-2 border-t border-[#E3E8F0] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTriggerProbe}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202938] hover:bg-slate-50 transition disabled:opacity-50"
                title="Execute immediate network probe"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#5267D8] ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Probe Now</span>
              </button>

              <button
                type="button"
                onClick={handleToggleProbe}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202938] hover:bg-slate-50 transition disabled:opacity-50"
                title="Pause or resume periodic probing"
              >
                {selectedNode.status === 'offline' ? (
                  <>
                    <Play className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5 text-amber-600" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDeletePeer}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                title="Remove peer from topology"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>
      ) : selectedLink ? (
        <div className="mt-4 space-y-4">
          {/* Link Header */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#202938] font-mono">{selectedLink.id}</h4>
              <StatusBadge
                label={selectedLink.status}
                variant={selectedLink.status === 'active' ? 'healthy' : selectedLink.status === 'degraded' ? 'degraded' : 'critical'}
                size="sm"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-mono text-[#202938] bg-[#F6F8FB] p-2.5 rounded-xl border border-[#E3E8F0]">
              <span className="font-semibold">{nodeMap.get(selectedLink.sourceId)?.name || selectedLink.sourceId}</span>
              <ArrowRight className="h-3 w-3 text-[#5267D8]" />
              <span className="font-semibold">{nodeMap.get(selectedLink.targetId)?.name || selectedLink.targetId}</span>
            </div>
          </div>

          {/* Link Details */}
          <div className="space-y-2 text-xs text-[#687386]">
            <div className="flex justify-between border-b border-[#E3E8F0] pb-1.5">
              <span>Medium / Conduit:</span>
              <span className="font-mono text-[#202938] font-medium">{selectedLink.metadata.cableType}</span>
            </div>
            <div className="flex justify-between border-b border-[#E3E8F0] pb-1.5">
              <span>Bandwidth:</span>
              <span className="font-mono text-[#202938] font-medium">{selectedLink.metadata.bandwidthGbps} Gbps</span>
            </div>
            <div className="flex justify-between border-b border-[#E3E8F0] pb-1.5">
              <span>Link Utilization:</span>
              <span className="font-mono font-bold text-[#5267D8]">{selectedLink.utilizationPct}%</span>
            </div>
            <div className="flex justify-between border-b border-[#E3E8F0] pb-1.5">
              <span>Measured Latency:</span>
              <span className="font-mono text-[#202938] font-medium">{selectedLink.latencyMs ?? '--'} ms</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F8FB] border border-[#E3E8F0] text-[#5267D8]">
            <Server className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-bold text-[#202938]">No Network Element Selected</h4>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-[#687386]">
            Click any 3D node or connection conduit in the canvas to inspect real probe telemetry, reachability states, and network identity.
          </p>

          {/* Quick Node Selector Dropdown */}
          <div className="mt-5 w-full text-left">
            <label htmlFor="node-select" className="text-[10px] font-semibold uppercase tracking-wider text-[#687386] block mb-1">
              Select System Node:
            </label>
            <select
              id="node-select"
              aria-label="Quick Node Select"
              onChange={(e) => {
                const node = allNodes.find((n) => n.id === e.target.value);
                onSelectNode(node || null);
              }}
              defaultValue=""
              className="w-full rounded-xl border border-[#E3E8F0] bg-white px-3 py-1.5 font-mono text-xs text-[#202938] focus:border-[#5267D8] focus:outline-none"
            >
              <option value="" disabled>-- Select Node to Inspect --</option>
              {allNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
