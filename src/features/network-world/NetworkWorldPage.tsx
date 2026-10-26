import React, { useState } from 'react';
import { Activity, ShieldCheck, Zap, AlertTriangle, Layers, X } from 'lucide-react';
import { NetworkWorldCanvas } from './components/NetworkWorldCanvas';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { TopologyLegend } from './components/TopologyLegend';
import { demoTopologyFixture } from './fixtures/topologyFixture';
import { TopologyNodeData, TopologyLinkData } from './types';

export const NetworkWorldPage: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);
  const [selectedLink, setSelectedLink] = useState<TopologyLinkData | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

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

  // Derive summary metrics from fixture
  const totalNodes = demoTopologyFixture.nodes.length;
  const totalLinks = demoTopologyFixture.links.length;
  const degradedNodes = demoTopologyFixture.nodes.filter((n) => n.status === 'degraded').length;
  const avgLatency =
    demoTopologyFixture.nodes.reduce((acc, n) => acc + (n.metrics.latencyMs || 0), 0) / totalNodes;

  return (
    <div className="flex flex-col h-[calc(100vh-6.8rem)] min-h-[680px] p-3 sm:p-5 gap-3">
      {/* Sleek Cinematic Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-precursor-card-glass px-4 py-2.5 backdrop-blur-xl shadow-glass-panel">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-precursor-border-active bg-precursor-violet/40 shadow-glow-purple/20">
            <Layers className="h-4 w-4 text-precursor-cyan" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <span>Network World Digital Twin</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 font-mono text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 3D Active
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Spine-leaf fabric digital twin with predictive health telemetry and early-warning boundaries.
            </p>
          </div>
        </div>

        {/* Compact Key Metric Telemetry Strip */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-precursor-surface/60 px-2.5 py-1 text-slate-300">
            <Activity className="h-3 w-3 text-precursor-cyan" />
            <span className="text-[11px] text-slate-400">Nodes:</span>
            <span className="font-bold text-white">{totalNodes}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-precursor-surface/60 px-2.5 py-1 text-slate-300">
            <span className="text-[11px] text-slate-400">Links:</span>
            <span className="font-bold text-white">{totalLinks}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-precursor-surface/60 px-2.5 py-1 text-slate-300">
            <Zap className="h-3 w-3 text-precursor-purple" />
            <span className="text-[11px] text-slate-400">Mean RTT:</span>
            <span className="font-bold text-white">{avgLatency.toFixed(1)}ms</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] text-emerald-400/80">Gate:</span>
            <span className="font-bold text-emerald-400">PREDICT</span>
          </div>

          {degradedNodes > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300">
              <AlertTriangle className="h-3 w-3 text-amber-400 animate-pulse" />
              <span className="text-[11px] text-amber-400/80">Degraded:</span>
              <span className="font-bold text-amber-400">{degradedNodes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Hero 3D Digital Twin Viewport Container */}
      <div className="relative flex-1 w-full h-full min-h-[580px] overflow-hidden rounded-2xl border border-precursor-border bg-precursor-navy-deep shadow-2xl">
        <NetworkWorldCanvas
          topology={demoTopologyFixture}
          selectedNodeId={selectedNode?.id ?? null}
          selectedLinkId={selectedLink?.id ?? null}
          onSelectNode={handleSelectNode}
          onSelectLink={handleSelectLink}
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen(!inspectorOpen)}
          legendOpen={legendOpen}
          onToggleLegend={() => setLegendOpen(!legendOpen)}
          className="h-full w-full"
        />

        {/* Sliding Contextual Inspector Glass Drawer (Right) */}
        {inspectorOpen && (
          <div className="absolute right-3 top-3 bottom-3 w-full sm:w-[420px] max-w-[calc(100%-1.5rem)] z-30 flex flex-col rounded-2xl border border-white/[0.1] bg-precursor-card-glass backdrop-blur-2xl p-4 shadow-glass-panel overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-precursor-cyan flex items-center gap-2">
                <span>Network Element Inspector</span>
              </span>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-precursor-surface transition"
                title="Close Inspector Drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <NodeDetailPanel
              selectedNode={selectedNode}
              selectedLink={selectedLink}
              allNodes={demoTopologyFixture.nodes}
              onSelectNode={handleSelectNode}
              onClear={handleClearSelection}
            />
          </div>
        )}

        {/* Floating Collapsible Topology Legend (Bottom-Right) */}
        {legendOpen && (
          <div className="absolute bottom-12 right-3 z-30 w-80 max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/[0.1] bg-precursor-card-glass backdrop-blur-2xl p-4 shadow-glass-panel">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                Fabric Legend
              </span>
              <button
                type="button"
                onClick={() => setLegendOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-white"
                title="Close Legend"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <TopologyLegend />
          </div>
        )}
      </div>
    </div>
  );
};
