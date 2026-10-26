import { create } from 'zustand';
import type { ScenarioId, SimulationConfig, SimulationPhase } from './types';
import type { TimelineStage, GateComparisonResult } from './types';
import {
  getTimelineForScenario,
  getEvaluationForScenario,
} from './fixtures/simulationFixture';

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
  timeline: [],
  activeStageIndex: 0,
  evaluation: null,
  validationErrors: {},

  setScenario: (id) =>
    set((state) => ({
      config: { ...state.config, scenarioId: id },
      phase: 'idle',
      timeline: [],
      activeStageIndex: 0,
      evaluation: null,
      validationErrors: {},
    })),

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

  runDemo: () => {
    const { config, validate } = get();
    if (!validate()) return;

    const timeline = getTimelineForScenario(config.scenarioId, config.seed);
    const evaluation = getEvaluationForScenario(config.scenarioId);

    set({
      phase: 'completed',
      timeline,
      activeStageIndex: 0,
      evaluation,
    });
  },

  resetDemo: () =>
    set({
      config: { ...defaultConfig },
      phase: 'idle',
      timeline: [],
      activeStageIndex: 0,
      evaluation: null,
      validationErrors: {},
    }),
}));
