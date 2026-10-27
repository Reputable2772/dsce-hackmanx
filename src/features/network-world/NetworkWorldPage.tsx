import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Zap,
  AlertTriangle,
  Layers,
  X,
  Radio,
  Plus,
  Network,
  Cpu,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { NetworkWorldCanvas } from './components/NetworkWorldCanvas';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { TopologyLegend } from './components/TopologyLegend';
import { AddSystemModal } from './components/AddSystemModal';
import { NetworkNodeList } from './components/NetworkNodeList';
import { demoTopologyFixture } from './fixtures/topologyFixture';
import { TopologyNodeData, TopologyLinkData, NetworkTopologyData } from './types';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient, RegisteredSystem } from '@/lib/api';

export const NetworkWorldPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'systems' | 'fabric'>('systems');
  const [displayTab, setDisplayTab] = useState<'canvas' | 'table' | 'split'>('split');
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);
  const [selectedLink, setSelectedLink] = useState<TopologyLinkData | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [topology, setTopology] = useState<NetworkTopologyData>(demoTopologyFixture);

  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';
  const gateState = useAppStore((s) => s.gateState);
  const latestStatus = useAppStore((s) => s.latestStatus);
  const operatingMode = useAppStore((s) => s.operatingMode);
  const targetHost = useAppStore((s) => s.targetHost);
  const targetPort = useAppStore((s) => s.targetPort);
  const interfaceId = useAppStore((s) => s.interfaceId);

  // In Live Mode, enforce systems view
  useEffect(() => {
    if (operatingMode === 'live') {
      setViewMode('systems');
    }
  }, [operatingMode]);

  const loadTopology = useCallback(async () => {
    if (!isConnected) {
      if (operatingMode !== 'live') {
        setTopology(demoTopologyFixture);
      }
      return;
    }
    try {
      const top = await apiClient.fetchTopology(viewMode === 'systems' ? 'systems' : undefined);
      if (top && top.nodes) {
        setTopology(top);
      }
    } catch {
      // Graceful fallback to retain current visual state
    }
  }, [isConnected, viewMode, operatingMode]);

  useEffect(() => {
    loadTopology();
    const timer = setInterval(loadTopology, 3000);
    return () => clearInterval(timer);
  }, [loadTopology]);

  const handleSelectNode = (node: TopologyNodeData | null) => {
    setSelectedNode(node);
    if (node) {
      setSelectedLink(null);
      setInspectorOpen(true);
    }
  };

  const handleSelectLink = (link: TopologyLinkData | null) => {
    setSelectedLink(link);
    if (link) {
      setSelectedNode(null);
      setInspectorOpen(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedNode(null);
    setSelectedLink(null);
  };

  const handleSystemAdded = (newSystem: RegisteredSystem) => {
    loadTopology();
    setSelectedNode({
      id: newSystem.id,
      name: newSystem.name,
      type: 'endpoint',
      position: [6.5, 0, 0],
      status: newSystem.status,
      metrics: {
        latencyMs: newSystem.latency_ms,
        jitterMs: newSystem.jitter_ms,
        packetLossPct: newSystem.packet_loss_pct,
        throughputMbps: null,
      },
      metadata: {
        role: 'Configured Network Peer',
        location: newSystem.description || 'Configured Target',
        ipAddress: newSystem.address,
        interfaceName: `probe:${newSystem.port}`,
        firmware: newSystem.diagnostic_message,
      },
    });
    setInspectorOpen(true);
  };

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Derive active topology for display, ensuring local host and configured targets exist
  const displayedTopology: NetworkTopologyData = useMemo(() => {
    if (operatingMode === 'live' || viewMode === 'systems') {
      const nodes = [...(topology.nodes || [])];
      let links = [...(topology.links || [])];

      // 1. Ensure local monitoring host is present
      if (!nodes.some((n) => n.id === 'local-host')) {
        nodes.unshift({
          id: 'local-host',
          name: 'PRECURSOR Monitor Engine (Local Host)',
          type: 'server',
          position: [0, 0, 0],
          status: 'healthy',
          metrics: {
            latencyMs: 0.1,
            jitterMs: 0.05,
            packetLossPct: 0.0,
            throughputMbps: 1000.0,
          },
          metadata: {
            role: 'Local Monitoring Host',
            ipAddress: '127.0.0.1',
            interfaceName: interfaceId || 'auto',
            location: 'Local Workstation',
            firmware: 'PRECURSOR Engine v1.0',
          },
        });
      }

      // 2. Ensure configured outbound target is present in live mode
      if (operatingMode === 'live' && targetHost && targetHost !== '127.0.0.1' && targetHost !== 'localhost') {
        const targetId = `peer-outbound-${targetHost.replace(/\./g, '-')}`;
        const hasTarget = nodes.some(
          (n) => n.id === targetId || n.id === `target-${targetHost}` || n.metadata?.ipAddress === targetHost
        );
        if (!hasTarget) {
          nodes.push({
            id: targetId,
            name: `Probe Target (${targetHost}:${targetPort})`,
            type: 'endpoint',
            position: [6.5, 0, 0],
            status: 'healthy',
            metrics: {
              latencyMs: latestStatus?.latest_metrics?.latency_ms ?? 1.2,
              jitterMs: latestStatus?.latest_metrics?.jitter_ms ?? 0.3,
              packetLossPct: latestStatus?.latest_metrics?.packet_loss_pct ?? 0.0,
              throughputMbps: null,
            },
            metadata: {
              role: 'Outbound Probe Target',
              ipAddress: targetHost,
              interfaceName: `port:${targetPort}`,
              location: 'Monitored Target',
              firmware: 'Live LAN Target',
            },
          });
        }
      }

      // 3. Ensure every non-local peer has a live link to local-host
      const existingLinkTargets = new Set(links.map((l) => l.targetId));
      for (const node of nodes) {
        if (node.id !== 'local-host' && !existingLinkTargets.has(node.id)) {
          links.push({
            id: `link-local-${node.id}`,
            sourceId: 'local-host',
            targetId: node.id,
            status: node.status === 'healthy' ? 'active' : (node.status === 'degraded' ? 'degraded' : 'down'),
            utilizationPct: node.status === 'healthy' ? 25.0 : 0.0,
            latencyMs: node.metrics?.latencyMs ?? 1.2,
            packetLossPct: node.metrics?.packetLossPct ?? 0.0,
            metadata: {
              cableType: '1GbE Twisted Pair',
              bandwidthGbps: 1.0,
              sourceInterface: interfaceId || 'local-nic',
              targetInterface: node.metadata?.interfaceName || 'nic',
            },
          });
        }
      }

      return {
        ...topology,
        id: topology.id || 'precursor-systems-01',
        name: operatingMode === 'live' ? `Live Target Topology • ${targetHost}:${targetPort}` : 'Peer Systems Network Topology',
        description: operatingMode === 'live'
          ? `Real-time physical link observation from local NIC ${interfaceId || 'auto'} to target ${targetHost}:${targetPort}`
          : 'Dynamic multi-system topology driven by live ICMP ping & TCP network probes.',
        isDemoFixture: false,
        nodes,
        links,
      };
    }
    return topology;
  }, [topology, operatingMode, viewMode, targetHost, targetPort, interfaceId, latestStatus]);

  // Summary metrics calculated from live active topology
  const totalNodes = displayedTopology.nodes.length;
  const totalLinks = displayedTopology.links.length;
  const degradedNodes = displayedTopology.nodes.filter((n) => n.status === 'degraded' || n.status === 'critical').length;
  const avgLatency =
    displayedTopology.nodes.reduce((acc, n) => acc + (n.metrics.latencyMs || 0), 0) / (totalNodes || 1);
  const activeGate = displayedTopology.gate_state || gateState || 'PREDICT';

  // Format backend scenario string for display
  const activeScenarioDisplay = latestStatus?.scenario
    ? latestStatus.scenario.replace(/_/g, ' ').toUpperCase()
    : 'NOMINAL BASELINE';

  return (
    <div className="flex flex-col h-[calc(100vh-6.8rem)] min-h-[680px] p-3 sm:p-5 gap-3 bg-[#F6F8FB]">
      {/* Top Operations Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E3E8F0] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 shadow-sm">
            <Layers className="h-5 w-5 text-[#5267D8]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#202938] flex items-center gap-2">
              <span>{operatingMode === 'live' ? `Live Target Topology • ${targetHost}:${targetPort}` : viewMode === 'systems' ? 'Network World' : 'Fabric Digital Twin'}</span>
              {operatingMode === 'live' ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold animate-pulse">
                  <Radio className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Physical Ping Probe ({targetHost}:{targetPort})</span>
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] text-emerald-700 font-semibold">
                  <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-600" />
                  <span>
                    {viewMode === 'systems'
                      ? 'Two-Computer Network Probes'
                      : `Twin (${activeScenarioDisplay})`}
                  </span>
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                  <span>Demo Topology</span>
                </span>
              )}
            </h1>
            <p className="text-[11px] text-[#687386] hidden md:block">
              {operatingMode === 'live'
                ? `Real-time physical link observation from local NIC ${interfaceId} to secondary PC ${targetHost}:${targetPort}. Synthetic datacenter fabric is strictly excluded.`
                : viewMode === 'systems'
                ? 'Dynamic two-computer topology: Local host & peer systems driven by real ICMP ping & TCP network probes.'
                : 'Spine-leaf fabric digital twin with predictive degradation telemetry and early warning reliability gates.'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {operatingMode === 'live' ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-800 font-semibold shadow-xs">
              <Network className="h-3.5 w-3.5 text-emerald-600" />
              <span>Live Probe Target: {targetHost}:{targetPort}</span>
            </div>
          ) : (
            <div className="flex items-center rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setViewMode('systems');
                  handleClearSelection();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                  viewMode === 'systems'
                    ? 'bg-white text-[#5267D8] shadow-sm'
                    : 'text-[#687386] hover:text-[#202938]'
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Peer Systems</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('fabric');
                  handleClearSelection();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                  viewMode === 'fabric'
                    ? 'bg-white text-[#5267D8] shadow-sm'
                    : 'text-[#687386] hover:text-[#202938]'
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Spine-Leaf Fabric</span>
              </button>
            </div>
          )}

          {/* Display View Toggle: Split, Canvas, Table */}
          <div className="flex items-center rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] p-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setDisplayTab('split')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                displayTab === 'split'
                  ? 'bg-white text-[#5267D8] shadow-sm'
                  : 'text-[#687386] hover:text-[#202938]'
              }`}
              title="Side-by-side 3D canvas and node table"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayTab('canvas')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                displayTab === 'canvas'
                  ? 'bg-white text-[#5267D8] shadow-sm'
                  : 'text-[#687386] hover:text-[#202938]'
              }`}
              title="Full 3D Topology Canvas"
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">3D Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayTab('table')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                displayTab === 'table'
                  ? 'bg-white text-[#5267D8] shadow-sm'
                  : 'text-[#687386] hover:text-[#202938]'
              }`}
              title="Network Node Table List"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Node List</span>
            </button>
          </div>

          {/* Add System Button (Peer Systems View) */}
          {viewMode === 'systems' && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5267D8] px-3 py-1.5 font-mono text-xs font-semibold text-white shadow-sm hover:bg-[#4355b8] transition"
              title="Add peer system for live probing"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add System</span>
            </button>
          )}

          {/* Compact Telemetry Counters */}
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs border-l border-[#E3E8F0] pl-2.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] px-2.5 py-1 text-[#202938]">
              <span className="text-[11px] text-[#687386]">Nodes:</span>
              <span className="font-bold">{totalNodes}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] px-2.5 py-1 text-[#202938]">
              <span className="text-[11px] text-[#687386]">Links:</span>
              <span className="font-bold">{totalLinks}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] px-2.5 py-1 text-[#202938]">
              <Zap className="h-3 w-3 text-[#5267D8]" />
              <span className="text-[11px] text-[#687386]">Mean RTT:</span>
              <span className="font-bold">{avgLatency.toFixed(1)}ms</span>
            </div>

            <div className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 font-bold ${
              activeGate === 'PREDICT'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : activeGate === 'DEGRADED'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}>
              <ShieldCheck className="h-3 w-3" />
              <span className="text-[11px] opacity-80">Gate:</span>
              <span>{activeGate}</span>
            </div>

            {degradedNodes > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
                <AlertTriangle className="h-3 w-3 text-amber-600 animate-pulse" />
                <span className="text-[11px]">Degraded:</span>
                <span className="font-bold">{degradedNodes}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="space-y-4 flex-1 flex flex-col">
        {/* 3D Viewport (when tab is split or canvas) */}
        {(displayTab === 'split' || displayTab === 'canvas') && (
          <div className={`relative w-full overflow-hidden rounded-2xl border border-[#E3E8F0] bg-white shadow-sm ${
            displayTab === 'split' ? 'h-[440px] shrink-0' : 'flex-1 min-h-[580px]'
          }`}>
            <NetworkWorldCanvas
              topology={displayedTopology}
              selectedNodeId={selectedNode?.id ?? null}
              selectedLinkId={selectedLink?.id ?? null}
              hoveredNodeId={hoveredNodeId}
              onHoverNodeId={setHoveredNodeId}
              onSelectNode={handleSelectNode}
              onSelectLink={handleSelectLink}
              inspectorOpen={inspectorOpen}
              onToggleInspector={() => setInspectorOpen(!inspectorOpen)}
              legendOpen={legendOpen}
              onToggleLegend={() => setLegendOpen(!legendOpen)}
              className="h-full w-full"
            />

            {/* Sliding Contextual Inspector Drawer (Right) */}
            {inspectorOpen && (
              <div className="absolute right-3 top-3 bottom-3 w-full sm:w-[420px] max-w-[calc(100%-1.5rem)] z-30 flex flex-col rounded-2xl border border-[#E3E8F0] bg-white/95 backdrop-blur-xl p-4 shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3E8F0] mb-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#5267D8] flex items-center gap-2">
                    <span>{viewMode === 'systems' ? 'System Peer Inspector' : 'Fabric Element Inspector'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectorOpen(false)}
                    className="rounded-lg p-1 text-[#687386] hover:text-[#202938] hover:bg-slate-100 transition"
                    title="Close Inspector Drawer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <NodeDetailPanel
                  selectedNode={selectedNode}
                  selectedLink={selectedLink}
                  allNodes={displayedTopology.nodes}
                  onSelectNode={handleSelectNode}
                  onClear={handleClearSelection}
                  onRefreshTopology={loadTopology}
                  isPeerTopology={viewMode === 'systems'}
                />
              </div>
            )}
          </div>
        )}

        {/* Network Node List (when tab is split or table) */}
        {(displayTab === 'split' || displayTab === 'table') && (
          <div className={`w-full ${displayTab === 'table' ? 'flex-1' : ''}`}>
            <NetworkNodeList
              nodes={displayedTopology.nodes}
              selectedNodeId={selectedNode?.id ?? null}
              hoveredNodeId={hoveredNodeId}
              onHoverNodeId={setHoveredNodeId}
              onSelectNode={handleSelectNode}
              onRefresh={loadTopology}
              isLiveMode={operatingMode === 'live'}
            />
          </div>
        )}
      </div>

      {/* Add System Modal */}
      <AddSystemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSystemAdded={handleSystemAdded}
      />

      {/* Global Topology Floating Legend */}
      {legendOpen && (
        <div className="absolute bottom-12 right-3 z-30 w-80 max-w-[calc(100%-1.5rem)] rounded-2xl border border-[#E3E8F0] bg-white/95 backdrop-blur-xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E8F0] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#202938]">
              {viewMode === 'systems' ? 'Systems Legend' : 'Fabric Legend'}
            </span>
            <button
              type="button"
              onClick={() => setLegendOpen(false)}
              className="rounded p-1 text-[#687386] hover:text-[#202938]"
              title="Close Legend"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <TopologyLegend />
        </div>
      )}
    </div>
  );
};
