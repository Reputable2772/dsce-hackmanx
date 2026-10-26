import React, { useState } from 'react';
import { Activity, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { MetricCard } from '@/components/ui/MetricCard';
import { NetworkWorldCanvas } from './components/NetworkWorldCanvas';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { TopologyLegend } from './components/TopologyLegend';
import { demoTopologyFixture } from './fixtures/topologyFixture';
import { TopologyNodeData, TopologyLinkData } from './types';

export const NetworkWorldPage: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);
  const [selectedLink, setSelectedLink] = useState<TopologyLinkData | null>(null);

  const handleSelectNode = (node: TopologyNodeData | null) => {
    setSelectedNode(node);
    if (node) setSelectedLink(null);
  };

  const handleSelectLink = (link: TopologyLinkData | null) => {
    setSelectedLink(link);
    if (link) setSelectedNode(null);
  };

  const handleClearSelection = () => {
    setSelectedNode(null);
    setSelectedLink(null);
  };

  // Derive summary metrics from fixture
  const totalNodes = demoTopologyFixture.nodes.length;
  const degradedNodes = demoTopologyFixture.nodes.filter((n) => n.status === 'degraded').length;
  const avgLatency =
    demoTopologyFixture.nodes.reduce((acc, n) => acc + (n.metrics.latencyMs || 0), 0) / totalNodes;

  return (
    <PageContainer
      title="Network World Digital Twin"
      subtitle="Interactive 3D network infrastructure topology with predictive health telemetry and early warning boundaries."
      action={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive 3D Active</span>
          </span>
        </div>
      }
    >
      {/* Supporting Metric Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monitored Nodes"
          value={totalNodes}
          subtitle="Spine-leaf datacenter fabric"
          isPlaceholder={false}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Fabric Mean Latency"
          value={avgLatency.toFixed(1)}
          unit="ms"
          subtitle="Nominal threshold baseline"
          isPlaceholder={false}
          icon={<Zap className="h-4 w-4" />}
        />
        <MetricCard
          title="Reliability Gate State"
          value="PREDICT"
          subtitle="Full predictive confidence"
          isPlaceholder={false}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
        />
        <MetricCard
          title="Degraded Elements"
          value={degradedNodes}
          subtitle="Buffer bloat queue saturation"
          isPlaceholder={false}
          quality={degradedNodes > 0 ? 'stale' : 'good'}
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
        />
      </div>

      {/* Main 3D Viewport & Sidebars */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Central 3D Canvas Area */}
        <div className="lg:col-span-3">
          <NetworkWorldCanvas
            topology={demoTopologyFixture}
            selectedNodeId={selectedNode?.id ?? null}
            selectedLinkId={selectedLink?.id ?? null}
            onSelectNode={handleSelectNode}
            onSelectLink={handleSelectLink}
          />
        </div>

        {/* Right Sidebar: Contextual Details & Legend */}
        <div className="space-y-6 lg:col-span-1">
          <NodeDetailPanel
            selectedNode={selectedNode}
            selectedLink={selectedLink}
            allNodes={demoTopologyFixture.nodes}
            onSelectNode={handleSelectNode}
            onClear={handleClearSelection}
          />
          <TopologyLegend />
        </div>
      </div>
    </PageContainer>
  );
};
