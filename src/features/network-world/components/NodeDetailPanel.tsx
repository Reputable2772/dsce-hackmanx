import React from 'react';
import {
  Server,
  Network,
  Activity,
  Cpu,
  Zap,
  MapPin,
  HardDrive,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';
import { TopologyNodeData, TopologyLinkData } from '../types';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';

interface NodeDetailPanelProps {
  selectedNode: TopologyNodeData | null;
  selectedLink: TopologyLinkData | null;
  allNodes: TopologyNodeData[];
  onSelectNode: (node: TopologyNodeData | null) => void;
  onClear: () => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  selectedNode,
  selectedLink,
  allNodes,
  onSelectNode,
  onClear,
}) => {
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return (
    <div className="rounded-xl border border-precursor-border bg-precursor-card/80 p-5 backdrop-blur-md shadow-xl transition-all">
      <div className="flex items-center justify-between border-b border-precursor-border pb-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-precursor-cyan" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            {selectedNode ? 'Node Inspector' : selectedLink ? 'Link Inspector' : 'Network Inspector'}
          </h3>
        </div>
        {(selectedNode || selectedLink) && (
          <button
            type="button"
            onClick={onClear}
            className="rounded p-1 text-slate-400 hover:bg-precursor-surface hover:text-white"
            title="Deselect"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {selectedNode ? (
        <div className="mt-4 space-y-4">
          {/* Node Header */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">{selectedNode.name}</h4>
              <StatusBadge
                label={selectedNode.status}
                variant={selectedNode.status as StatusVariant}
                size="sm"
              />
            </div>
            <div className="mt-1 font-mono text-xs text-slate-400">
              ID: <span className="text-precursor-lavender">{selectedNode.id}</span> • Type: <span className="uppercase text-precursor-cyan">{selectedNode.type}</span>
            </div>
          </div>

          {/* Role & Location */}
          <div className="rounded-lg border border-precursor-border bg-precursor-surface/50 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-slate-300">
              <Server className="h-3.5 w-3.5 text-precursor-purple" />
              <span className="font-medium">{selectedNode.metadata.role}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span>{selectedNode.metadata.location}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono">
              <HardDrive className="h-3.5 w-3.5 text-slate-500" />
              <span>{selectedNode.metadata.ipAddress} ({selectedNode.metadata.interfaceName})</span>
            </div>
          </div>

          {/* Metric Grid */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Reported Telemetry Metrics
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-precursor-border bg-precursor-surface/30 p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Zap className="h-3 w-3 text-precursor-cyan" />
                  <span>Latency</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {selectedNode.metrics.latencyMs?.toFixed(1) ?? '--'} <span className="text-[10px] text-slate-400 font-normal">ms</span>
                </div>
              </div>

              <div className="rounded-lg border border-precursor-border bg-precursor-surface/30 p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Activity className="h-3 w-3 text-precursor-amber" />
                  <span>Packet Loss</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {selectedNode.metrics.packetLossPct?.toFixed(1) ?? '--'} <span className="text-[10px] text-slate-400 font-normal">%</span>
                </div>
              </div>

              <div className="rounded-lg border border-precursor-border bg-precursor-surface/30 p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Cpu className="h-3 w-3 text-precursor-purple" />
                  <span>CPU Load</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {selectedNode.metrics.cpuUtilizationPct?.toFixed(0) ?? '--'} <span className="text-[10px] text-slate-400 font-normal">%</span>
                </div>
              </div>

              <div className="rounded-lg border border-precursor-border bg-precursor-surface/30 p-2.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Server className="h-3 w-3 text-precursor-teal" />
                  <span>Throughput</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {selectedNode.metrics.throughputMbps?.toFixed(0) ?? '--'} <span className="text-[10px] text-slate-400 font-normal">Mbps</span>
                </div>
              </div>
            </div>
          </div>

          {/* Degraded Diagnostic Callout */}
          {selectedNode.status === 'degraded' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Queue Degradation Flagged</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Elevated latency of {selectedNode.metrics.latencyMs}ms and packet drop detected on {selectedNode.metadata.interfaceName}. Candidate for early warning mitigation.
              </p>
            </div>
          )}
        </div>
      ) : selectedLink ? (
        <div className="mt-4 space-y-4">
          {/* Link Header */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-mono">{selectedLink.id}</h4>
              <StatusBadge
                label={selectedLink.status}
                variant={selectedLink.status === 'active' ? 'healthy' : selectedLink.status === 'degraded' ? 'degraded' : 'critical'}
                size="sm"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-300 bg-precursor-surface/60 p-2 rounded border border-precursor-border">
              <span>{nodeMap.get(selectedLink.sourceId)?.name || selectedLink.sourceId}</span>
              <ArrowRight className="h-3 w-3 text-precursor-purple" />
              <span>{nodeMap.get(selectedLink.targetId)?.name || selectedLink.targetId}</span>
            </div>
          </div>

          {/* Link Details */}
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between border-b border-precursor-border/50 pb-1.5">
              <span>Cable Type:</span>
              <span className="font-mono text-slate-200">{selectedLink.metadata.cableType}</span>
            </div>
            <div className="flex justify-between border-b border-precursor-border/50 pb-1.5">
              <span>Bandwidth Capacity:</span>
              <span className="font-mono text-slate-200">{selectedLink.metadata.bandwidthGbps} Gbps</span>
            </div>
            <div className="flex justify-between border-b border-precursor-border/50 pb-1.5">
              <span>Link Utilization:</span>
              <span className="font-mono font-bold text-precursor-cyan">{selectedLink.utilizationPct}%</span>
            </div>
            <div className="flex justify-between border-b border-precursor-border/50 pb-1.5">
              <span>Hop Latency:</span>
              <span className="font-mono text-slate-200">{selectedLink.latencyMs ?? '--'} ms</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-precursor-surface text-slate-500">
            <Server className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-300">No Network Element Selected</h4>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-400">
            Click any 3D node or link conduit to inspect its telemetry queues, hardware metadata, and degradation metrics.
          </p>

          {/* Accessible HTML Node Selector */}
          <div className="mt-5 w-full text-left">
            <label htmlFor="node-select" className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Quick Node Select:
            </label>
            <select
              id="node-select"
              aria-label="Quick Node Select"
              onChange={(e) => {
                const node = allNodes.find((n) => n.id === e.target.value);
                onSelectNode(node || null);
              }}
              defaultValue=""
              className="w-full rounded-lg border border-precursor-border bg-precursor-surface px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:border-precursor-purple"
            >
              <option value="" disabled>-- Select Node to Inspect --</option>
              {allNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.type} - {n.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
