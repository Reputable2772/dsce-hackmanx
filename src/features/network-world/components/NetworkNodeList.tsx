import React, { useState, useMemo } from 'react';
import {
  Server,
  Network,
  Radio,
  Search,
  RefreshCw,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { TopologyNodeData } from '../types';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { apiClient } from '@/lib/api';

interface NetworkNodeListProps {
  nodes: TopologyNodeData[];
  selectedNodeId: string | null;
  hoveredNodeId?: string | null;
  onHoverNodeId?: (nodeId: string | null) => void;
  onSelectNode: (node: TopologyNodeData | null) => void;
  onRefresh?: () => void;
  isLiveMode?: boolean;
}

export const NetworkNodeList: React.FC<NetworkNodeListProps> = ({
  nodes,
  selectedNodeId,
  hoveredNodeId,
  onHoverNodeId,
  onSelectNode,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'healthy' | 'degraded' | 'critical' | 'offline'>('ALL');
  const [probingId, setProbingId] = useState<string | null>(null);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        node.name.toLowerCase().includes(q) ||
        node.id.toLowerCase().includes(q) ||
        (node.metadata?.ipAddress && node.metadata.ipAddress.toLowerCase().includes(q)) ||
        (node.metadata?.role && node.metadata.role.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [nodes, search, statusFilter]);

  const handleProbe = async (e: React.MouseEvent, node: TopologyNodeData) => {
    e.stopPropagation();
    if (node.id === 'local-host') return;
    setProbingId(node.id);
    try {
      await apiClient.triggerSystemProbe(node.id);
      if (onRefresh) onRefresh();
    } catch {
      // Ignore
    } finally {
      setProbingId(null);
    }
  };

  const getNodeRoleBadge = (node: TopologyNodeData) => {
    const role = node.metadata?.role || node.type;
    const isInboundPeer =
      node.id.includes('inbound') ||
      node.name.toLowerCase().includes('inbound') ||
      role.toLowerCase().includes('inbound');

    if (isInboundPeer) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-300 bg-cyan-50 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-800">
          <Radio className="h-2.5 w-2.5 text-cyan-600 animate-pulse" />
          <span>Inbound Peer / Ping Source</span>
        </span>
      );
    }

    if (node.id === 'local-host') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#5267D8]">
          <Server className="h-2.5 w-2.5 text-[#5267D8]" />
          <span>Local Monitoring Host</span>
        </span>
      );
    }

    if (node.id.includes('target') || role.toLowerCase().includes('probe target')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800">
          <Zap className="h-2.5 w-2.5 text-emerald-600" />
          <span>Probe Target</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-700">
        <span>{role}</span>
      </span>
    );
  };

  const getStatusVariant = (status: string): StatusVariant => {
    switch (status) {
      case 'healthy':
        return 'healthy';
      case 'degraded':
        return 'degraded';
      case 'critical':
        return 'critical';
      case 'offline':
        return 'offline';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#E3E8F0] bg-white shadow-sm overflow-hidden text-[#202938]">
      {/* Header & Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E8F0] bg-[#F8FAFC] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-[#5267D8]">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#202938] flex items-center gap-2">
              <span>Network Node List</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.2 font-mono text-[10px] font-semibold text-[#687386]">
                {nodes.length} Nodes
              </span>
            </h3>
            <p className="text-[11px] text-[#687386]">
              Real-time inventory of local monitoring host, inbound ICMP/traffic peers, and monitored target systems
            </p>
          </div>
        </div>

        {/* Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#687386]" />
            <input
              type="text"
              placeholder="Search IP, name, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7.5 w-48 rounded-lg border border-[#E3E8F0] bg-white pl-8 pr-2.5 font-mono text-[11px] text-[#202938] placeholder-[#687386] focus:border-[#5267D8] focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter by node status"
            className="h-7.5 rounded-lg border border-[#E3E8F0] bg-white px-2.5 font-mono text-[11px] text-[#202938] focus:border-[#5267D8] focus:outline-none"
          >
            <option value="ALL">All States</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="critical">Critical</option>
            <option value="offline">Offline</option>
          </select>

          {/* Refresh Network Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-7.5 items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3 font-mono text-[11px] font-semibold text-[#687386] hover:bg-slate-50 hover:text-[#202938] transition shadow-2xs"
              title="Rescan network neighbors and refresh probe states"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Scan Network</span>
            </button>
          )}
        </div>
      </div>

      {/* Nodes Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E3E8F0] bg-[#F8FAFC] font-mono text-[10px] font-bold uppercase tracking-wider text-[#687386]">
              <th className="py-2.5 px-4">Node Name & Identifier</th>
              <th className="py-2.5 px-3">Role & Type</th>
              <th className="py-2.5 px-3">IP & Physical Interface</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Live RTT</th>
              <th className="py-2.5 px-3">Jitter</th>
              <th className="py-2.5 px-3">Packet Loss</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E8F0] bg-white font-mono text-[11px]">
            {filteredNodes.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#687386]">
                  No network nodes match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isInboundPeer =
                  node.id.includes('inbound') ||
                  node.name.toLowerCase().includes('inbound') ||
                  node.metadata?.role?.toLowerCase().includes('inbound');

                const rtt = node.metrics?.latencyMs;
                const jitter = node.metrics?.jitterMs;
                const loss = node.metrics?.packetLossPct;
                const ip = node.metadata?.ipAddress || '127.0.0.1';
                const mac = node.metadata?.macAddress;

                return (
                  <tr
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    onMouseEnter={() => onHoverNodeId && onHoverNodeId(node.id)}
                    onMouseLeave={() => onHoverNodeId && onHoverNodeId(null)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/90 border-l-4 border-l-[#5267D8]'
                        : isHovered
                        ? 'bg-indigo-50/40 border-l-4 border-l-indigo-400'
                        : isInboundPeer
                        ? 'bg-cyan-50/20 hover:bg-cyan-50/40'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {/* Node Name & ID */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#202938] flex items-center gap-1.5">
                          {node.name}
                          {isInboundPeer && (
                            <span className="rounded bg-cyan-100 px-1.5 py-0.2 text-[9px] font-bold text-cyan-800 uppercase">
                              Inbound Peer
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-[#687386]">{node.id}</span>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-3">
                      {getNodeRoleBadge(node)}
                    </td>

                    {/* IP & Hardware */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col font-mono text-[11px]">
                        <span className="font-semibold text-[#202938]">{ip}</span>
                        {mac && <span className="text-[10px] text-[#687386]">MAC: {mac}</span>}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <StatusBadge label={node.status} variant={getStatusVariant(node.status)} size="sm" pulse={node.status !== 'healthy'} />
                    </td>

                    {/* Live RTT */}
                    <td className="py-3 px-3">
                      {rtt != null ? (
                        <span className={`font-bold ${rtt > 50 ? 'text-rose-600' : rtt > 25 ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {rtt.toFixed(1)} ms
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Jitter */}
                    <td className="py-3 px-3">
                      {jitter != null ? (
                        <span className="text-[#202938]">{jitter.toFixed(1)} ms</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Packet Loss */}
                    <td className="py-3 px-3">
                      {loss != null ? (
                        <span className={`font-semibold ${loss > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          {loss.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">0.0%</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {node.id !== 'local-host' && (
                          <button
                            type="button"
                            onClick={(e) => handleProbe(e, node)}
                            disabled={probingId === node.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E3E8F0] bg-white px-2 py-1 text-[10px] font-semibold text-[#687386] hover:bg-slate-100 hover:text-[#202938] transition disabled:opacity-50"
                            title="Send immediate ping/probe"
                          >
                            <Zap className={`h-2.5 w-2.5 ${probingId === node.id ? 'animate-spin text-amber-500' : 'text-[#5267D8]'}`} />
                            <span>{probingId === node.id ? 'Pinging...' : 'Probe'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNode(node);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#5267D8] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#4355b8] transition shadow-2xs"
                          title="Inspect node telemetry and properties"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
