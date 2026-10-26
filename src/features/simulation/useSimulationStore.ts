import { create } from 'zustand';
import type { ScenarioId, SimulationConfig, SimulationPhase } from './types';
import type { TimelineStage, GateComparisonResult } from './types';
import {
  getTimelineForScenario,
  getEvaluationForScenario,
} from './fixtures/simulationFixture';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/useAppStore';

interface SimulationStore {
  // Configuration
  config: SimulationConfig;
  phase: SimulationPhase;

  // Timeline state
  timeline: TimelineStage[];
  activeStageIndex: number;

  // Evaluation
  evaluation: GateComparisonResult | null;

  // Validation
  validationErrors: Record<string, string>;

  // Actions
  setScenario: (id: ScenarioId) => void;
  setSeed: (seed: number) => void;
  setDuration: (minutes: number) => void;
  setEventStartPercent: (pct: number) => void;
  setGateMode: (mode: 'gate_on' | 'gate_off') => void;
  setActiveStageIndex: (index: number) => void;
  runDemo: () => void;
  resetDemo: () => void;
  validate: () => boolean;
}

const defaultConfig: SimulationConfig = {
  scenarioId: 'gradual_degradation',
  seed: 42,
  durationMinutes: 30,
  eventStartPercent: 25,
  gateMode: 'gate_on',
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  config: { ...defaultConfig },
  phase: 'idle',
  timeline: getTimelineForScenario(defaultConfig.scenarioId, defaultConfig.seed),
  activeStageIndex: 0,
  evaluation: getEvaluationForScenario(defaultConfig.scenarioId),
  validationErrors: {},

  setScenario: (id) => {
    const { config } = get();
    const newConfig = { ...config, scenarioId: id };
    const timeline = getTimelineForScenario(id, newConfig.seed);
    const evaluation = getEvaluationForScenario(id);
    set({
      config: newConfig,
      phase: 'idle',
      timeline,
      activeStageIndex: 0,
      evaluation,
      validationErrors: {},
    });

    const isConnected = useAppStore.getState().connectionState === 'connected';
    if (isConnected) {
      apiClient.resetScenario(id, newConfig.seed)
        .then(() => useAppStore.getState().checkLiveConnection())
        .catch(() => {});
    }
  },

  setSeed: (seed) =>
    set((state) => ({
      config: { ...state.config, seed },
      validationErrors: { ...state.validationErrors, seed: '' },
    })),

  setDuration: (minutes) =>
    set((state) => ({
      config: { ...state.config, durationMinutes: minutes },
      validationErrors: { ...state.validationErrors, duration: '' },
    })),

  setEventStartPercent: (pct) =>
    set((state) => ({
      config: { ...state.config, eventStartPercent: pct },
      validationErrors: { ...state.validationErrors, eventStart: '' },
    })),

  setGateMode: (mode) =>
    set((state) => ({
      config: { ...state.config, gateMode: mode },
    })),

  setActiveStageIndex: (index) => set({ activeStageIndex: index }),

  validate: () => {
    const { config } = get();
    const errors: Record<string, string> = {};

    if (!Number.isFinite(config.seed) || config.seed < 0 || config.seed > 999999) {
      errors.seed = 'Seed must be an integer between 0 and 999999.';
    }
    if (!Number.isFinite(config.durationMinutes) || config.durationMinutes < 5 || config.durationMinutes > 120) {
      errors.duration = 'Duration must be between 5 and 120 minutes.';
    }
    if (!Number.isFinite(config.eventStartPercent) || config.eventStartPercent < 5 || config.eventStartPercent > 80) {
      errors.eventStart = 'Event start must be between 5% and 80% of timeline.';
    }

    set({ validationErrors: errors });
    return Object.keys(errors).length === 0;
  },

  runDemo: async () => {
    const { config, validate } = get();
    if (!validate()) return;

    set({ phase: 'running' });
    const timeline = getTimelineForScenario(config.scenarioId, config.seed);
    let evaluation = getEvaluationForScenario(config.scenarioId);

    const isConnected = useAppStore.getState().connectionState === 'connected';
    if (isConnected) {
      try {
        await apiClient.setMode('synthetic');
        await apiClient.resetScenario(config.scenarioId, config.seed);
        const evalRes = await apiClient.runEvaluation(config.scenarioId, config.seed);
        if (evalRes && evalRes.result) {
          const on5 = evalRes.result.gate_on?.['5'] || {};
          const off5 = evalRes.result.gate_off?.['5'] || {};
          const recallVal = on5.event_recall ?? on5.recall;
          const leadTimeVal = on5.average_lead_time_minutes ?? on5.warning_lead_time_minutes;
          const offRecallVal = off5.event_recall ?? off5.recall;
          const offLeadTimeVal = off5.average_lead_time_minutes ?? off5.warning_lead_time_minutes;

          evaluation = {
            scenarioId: config.scenarioId,
            scenarioName: config.scenarioId.replace(/_/g, ' ').toUpperCase(),
            seed: config.seed,
            gateOn: {
              detectedEvents: recallVal != null ? Math.round(Number(recallVal) * 10) : 1,
              falseAlarmsPerHour: Number(on5.false_alarms_per_hour ?? 0.0),
              warningLeadTimeMinutes: Number(leadTimeVal ?? 0.0),
              lateOrMissedEvents: Number(on5.missed_faults ?? 0),
              abstentionRate: Number(on5.abstention_rate ?? 0.0),
              totalPredictionWindows: 12,
            },
            gateOff: {
              detectedEvents: offRecallVal != null ? Math.round(Number(offRecallVal) * 10) : 1,
              falseAlarmsPerHour: Number(off5.false_alarms_per_hour ?? 0.0),
              warningLeadTimeMinutes: Number(offLeadTimeVal ?? 0.0),
              lateOrMissedEvents: Number(off5.missed_faults ?? 0),
              abstentionRate: Number(off5.abstention_rate ?? 0.0),
              totalPredictionWindows: 12,
            },
            explanation: `Reproducible evaluation benchmark executed against Python PrecursorEngine (seed ${config.seed}). Paired GATE ON vs GATE OFF run across 5m, 15m, and 30m horizons.`,
          };
        }
        await useAppStore.getState().checkLiveConnection();
      } catch {
        // Fall back to deterministic evaluation fixture
      }
    }

    set({
      phase: 'completed',
      timeline,
      activeStageIndex: Math.min(1, timeline.length - 1),
      evaluation,
    });
  },

  resetDemo: () => {
    const isConnected = useAppStore.getState().connectionState === 'connected';
    if (isConnected) {
      apiClient.resetScenario('gradual_degradation', 42).catch(() => {});
    }
    set({
      config: { ...defaultConfig },
      phase: 'idle',
      timeline: getTimelineForScenario(defaultConfig.scenarioId, defaultConfig.seed),
      activeStageIndex: 0,
      evaluation: getEvaluationForScenario(defaultConfig.scenarioId),
      validationErrors: {},
    });
  },
}));
