import React from 'react';
import { Zap } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

export const PredictionsPage: React.FC = () => {
  return (
    <PageContainer
      title="Predictive Early Warning"
      subtitle="Multi-horizon service impact forecasts across +5m, +15m, and +30m lookahead windows."
    >
      <EmptyState
        icon={Zap}
        title="Detection Engines Awaiting Connection"
        description="Fixed SLA, EWMA, and Forecast-Residual detection engines are being integrated by the backend pipeline. Predictions will be displayed here once connected."
        badgeText="PREDICTION ENGINES PENDING"
      />
    </PageContainer>
  );
};
