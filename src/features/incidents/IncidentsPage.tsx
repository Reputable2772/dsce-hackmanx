import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

export const IncidentsPage: React.FC = () => {
  return (
    <PageContainer
      title="Incident Groups & Diagnostics"
      subtitle="Deterministic spatio-temporal clustering of co-occurring anomalies and link degradation events."
    >
      <EmptyState
        icon={AlertOctagon}
        title="Incident Grouper Awaiting Ingestion"
        description="The deterministic incident aggregator groups related telemetry anomalies into coherent incident bundles. Connected in upcoming phase."
        badgeText="INCIDENT ENGINE PENDING"
      />
    </PageContainer>
  );
};
