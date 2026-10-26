import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Radio } from 'lucide-react';
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
import { PredictionHorizon, PredictionRecord, GateDecisionRecord, CurrentFault } from './types';
import { GateState } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const PredictionsPage: React.FC = () => {
  const [selectedHorizon, setSelectedHorizon] = useState<PredictionHorizon>(5);
  const { gateState, connectionState } = useAppStore();
  const isConnected = connectionState === 'connected';
  const [activeGateState, setActiveGateState] = useState<GateState>(gateState || 'PREDICT');
  const [livePredictions, setLivePredictions] = useState<Record<PredictionHorizon, PredictionRecord[]>>(PREDICTIONS_BY_HORIZON);
  const [liveFaults, setLiveFaults] = useState<CurrentFault[]>(CURRENT_FAULTS);
  const [liveGateDecision, setLiveGateDecision] = useState<GateDecisionRecord | null>(null);

  // Sync with live backend gate decisions and predictions when connected
  useEffect(() => {
    if (!isConnected) {
      setLivePredictions(PREDICTIONS_BY_HORIZON);
      setLiveFaults(CURRENT_FAULTS);
      setLiveGateDecision(null);
      return;
    }

    let isMounted = true;
    const loadPredictions = async () => {
      try {
        const [predsRes, gateRes, incRes] = await Promise.all([
          apiClient.fetchPredictions().catch(() => null),
          apiClient.fetchGate().catch(() => null),
          apiClient.fetchIncidents().catch(() => null),
        ]);

        if (!isMounted) return;

        if (gateRes && gateRes.state) {
          setActiveGateState(gateRes.state as GateState);
          setLiveGateDecision({
            state: gateRes.state as GateState,
            reasons: gateRes.reasons || [],
            sensorHealthScore: Number(gateRes.sensor_health_score ?? 1.0),
            driftScore: Number(gateRes.distribution_drift_score ?? 0.0),
            residualErrorScore: Number(gateRes.residual_error_score ?? 1.0),
            suppressedMetrics: gateRes.state === 'ABSTAIN' ? ['latency_ms', 'packet_loss_pct'] : [],
            immediateAlertsActive: gateRes.immediate_alerts_active ?? true,
            evaluatedAt: new Date((gateRes.timestamp || Date.now() / 1000) * 1000).toISOString(),
          });
        }

        if (predsRes && predsRes.predictions) {
          const updated: Record<PredictionHorizon, PredictionRecord[]> = { ...PREDICTIONS_BY_HORIZON };
          for (const h of [5, 15, 30] as PredictionHorizon[]) {
            const p = predsRes.predictions[String(h)];
            if (p) {
              const base = PREDICTIONS_BY_HORIZON[h]?.[0];
              if (base) {
                updated[h] = [
                  {
                    ...base,
                    predictedImpact: p.predicted_impact,
                    isSustained: p.is_sustained,
                    detectorScore: p.confidence_score,
                    reliabilityState: (predsRes.gate_state as GateState) || 'PREDICT',
                    evidence: {
                      ...base.evidence,
                      methodology: p.evidence || base.evidence.methodology,
                    },
                  },
                  ...(PREDICTIONS_BY_HORIZON[h]?.slice(1) || []),
                ];
              }
            }
          }
          setLivePredictions(updated);
        }

        if (incRes && incRes.active_faults && incRes.active_faults.length > 0) {
          const mapped: CurrentFault[] = incRes.active_faults.map((af: any) => ({
            id: af.id,
            title: af.title,
            targetDevice: 'Spine Router 01 (West)',
            interfaceId: 'eth0',
            rule: af.primary_metrics?.[0] ? `Rule SLA: ${af.primary_metrics[0]}` : 'Immediate Hardware Rule',
            observedValue: af.evidence_summary?.latest_value ? String(af.evidence_summary.latest_value) : 'Link Fault',
            threshold: 'SLA Boundary',
            detectedAt: new Date((af.detected_at || Date.now() / 1000) * 1000).toLocaleTimeString() + ' UTC',
            severity: af.severity === 'CRITICAL' ? 'critical' : 'high',
            isImmediate: true,
            summary: af.title,
          }));
          setLiveFaults(mapped);
        } else if (incRes && incRes.active_faults && incRes.active_faults.length === 0) {
          setLiveFaults([]);
        }
      } catch {
        // Fall back gracefully
      }
    };

    loadPredictions();
    const timer = setInterval(loadPredictions, 4000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isConnected]);

  const currentDecision = liveGateDecision || GATE_DECISION_SCENARIOS[activeGateState];
  const activePredictions = livePredictions[selectedHorizon] || [];

  const counts: Record<PredictionHorizon, number> = {
    5: livePredictions[5]?.length || 0,
    15: livePredictions[15]?.length || 0,
    30: livePredictions[30]?.length || 0,
  };

  return (
    <PageContainer
      title="Predictive Early Warning & Horizon Analysis"
      subtitle="Multi-horizon service impact forecasting with Reliability Gate validation and evidence-backed anomaly detection."
      action={
        isConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400 animate-pulse">
            <Radio className="h-3 w-3" />
            <span>Live Detector Engine (Python)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1 font-mono text-xs text-slate-400">
            <span>Deterministic Demonstration Fixtures</span>
          </span>
        )
      }
    >
      <div className="space-y-6">
        {/* Reliability Gate Decision & Simulator Banner */}
        <ReliabilityGateBanner
          decision={currentDecision}
          activeGateState={activeGateState}
          onGateStateChange={setActiveGateState}
        />

        {/* Current Active Faults (Zero-Latency Immediate Rules) */}
        <CurrentFaultList faults={liveFaults} />

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
