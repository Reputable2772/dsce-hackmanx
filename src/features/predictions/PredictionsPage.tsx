import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ReliabilityGateBanner } from './components/ReliabilityGateBanner';
import { CurrentFaultList } from './components/CurrentFaultList';
import { PredictionHorizonTabs } from './components/PredictionHorizonTabs';
import { PredictionResultCard } from './components/PredictionResultCard';
import { DetectorEvidencePanel } from './components/DetectorEvidencePanel';
import { 
  CURRENT_FAULTS, 
  PREDICTIONS_BY_HORIZON, 
  GATE_DECISION_SCENARIOS 
} from './fixtures/predictionsFixture';
import { PredictionHorizon } from './types';
import { GateState } from '@/types';

export const PredictionsPage: React.FC = () => {
  const [selectedHorizon, setSelectedHorizon] = useState<PredictionHorizon>(5);
  const [activeGateState, setActiveGateState] = useState<GateState>('PREDICT');

  const currentDecision = GATE_DECISION_SCENARIOS[activeGateState];
  const activePredictions = PREDICTIONS_BY_HORIZON[selectedHorizon] || [];

  const counts: Record<PredictionHorizon, number> = {
    5: PREDICTIONS_BY_HORIZON[5]?.length || 0,
    15: PREDICTIONS_BY_HORIZON[15]?.length || 0,
    30: PREDICTIONS_BY_HORIZON[30]?.length || 0,
  };

  return (
    <PageContainer
      title="Predictive Early Warning & Horizon Analysis"
      subtitle="Multi-horizon service impact forecasting with Reliability Gate validation and evidence-backed anomaly detection."
    >
      <div className="space-y-6">
        {/* Reliability Gate Decision & Simulator Banner */}
        <ReliabilityGateBanner
          decision={currentDecision}
          activeGateState={activeGateState}
          onGateStateChange={setActiveGateState}
        />

        {/* Current Active Faults (Zero-Latency Immediate Rules) */}
        <CurrentFaultList faults={CURRENT_FAULTS} />

        {/* Prediction Horizons Controls */}
        <PredictionHorizonTabs
          selectedHorizon={selectedHorizon}
          onHorizonChange={setSelectedHorizon}
          counts={counts}
        />

        {/* Predictions Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
              Showing {activePredictions.length} predictive models for +{selectedHorizon}m lookahead window
            </span>
            <span className="text-[11px] text-purple-300">
              * Evaluated strictly on observations up to current timestamp
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activePredictions.map((pred) => (
              <PredictionResultCard
                key={pred.id}
                prediction={pred}
                activeGateState={activeGateState}
              />
            ))}
          </div>
        </div>

        {/* Detection Engine Architecture & Models Panel */}
        <DetectorEvidencePanel />
      </div>
    </PageContainer>
  );
};
