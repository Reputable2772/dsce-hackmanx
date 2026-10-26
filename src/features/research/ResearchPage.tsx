import React from 'react';
import { FlaskConical } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

export const ResearchPage: React.FC = () => {
  return (
    <PageContainer
      title="Research & Paired Evaluation"
      subtitle="Head-to-head empirical comparison: Reliability Gate ON vs Gate OFF on identical held-out scenarios."
    >
      <EmptyState
        icon={FlaskConical}
        title="Benchmark Runner Staging"
        description="The paired evaluation harness compares warning lead time, false alarm suppression, and abstention rates across held-out failure benchmarks."
        badgeText="BENCHMARK HARNESS READY"
      />
    </PageContainer>
  );
};
