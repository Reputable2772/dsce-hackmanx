import React from 'react';
import { Activity } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

export const TelemetryPage: React.FC = () => {
  return (
    <PageContainer
      title="Telemetry Streams & Time-Series"
      subtitle="Real-time and synthetic network metric streaming across 5-second sampling intervals."
    >
      <EmptyState
        icon={Activity}
        title="Telemetry Pipeline Not Attached"
        description="The telemetry ingestion buffer and synthetic generator will connect to this view in the upcoming phase. All metric schemas (latency_ms, jitter_ms, packet_loss_pct, throughput_mbps) have been established."
        badgeText="TELEMETRY PIPELINE PENDING"
      />
    </PageContainer>
  );
};
