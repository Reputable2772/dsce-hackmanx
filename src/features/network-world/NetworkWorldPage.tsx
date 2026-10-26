import React from 'react';
import { Activity, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { MetricCard } from '@/components/ui/MetricCard';
import { TopologyViewportPlaceholder } from './components/TopologyViewportPlaceholder';
import { TopologyLegend } from './components/TopologyLegend';
import { ContextualDetailsPanel } from './components/ContextualDetailsPanel';

export const NetworkWorldPage: React.FC = () => {
  return (
    <PageContainer
      title="Network World Digital Twin"
      subtitle="Interactive 3D network infrastructure topology with predictive health telemetry and early warning boundaries."
      action={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-precursor-border bg-precursor-card px-3 py-1.5 font-mono text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-precursor-cyan animate-pulse" />
            <span>Digital Twin: Staging</span>
          </span>
        </div>
      }
    >
      {/* Supporting Metric Placeholders */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monitored Gateways"
          value="--"
          subtitle="Pending backend topology discovery"
          isPlaceholder={true}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Synthetic RTT"
          value="--"
          unit="ms"
          subtitle="Awaiting telemetry stream initialization"
          isPlaceholder={true}
          icon={<Zap className="h-4 w-4" />}
        />
        <MetricCard
          title="Reliability Gate State"
          value="PREDICT"
          subtitle="Demo baseline (Unconnected)"
          isPlaceholder={true}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
        />
        <MetricCard
          title="Active Anomalies"
          value="0"
          subtitle="No service-impacting degradation"
          isPlaceholder={true}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Main 3D Viewport & Sidebars */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Central 3D Canvas Area */}
        <div className="lg:col-span-3">
          <TopologyViewportPlaceholder />
        </div>

        {/* Right Sidebar: Contextual Details & Legend */}
        <div className="space-y-6 lg:col-span-1">
          <ContextualDetailsPanel />
          <TopologyLegend />
        </div>
      </div>
    </PageContainer>
  );
};
