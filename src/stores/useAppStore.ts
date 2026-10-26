import { create } from 'zustand';
import { GateState, ConnectionState, DemoMode } from '@/types';
import { apiClient } from '@/lib/api';

interface AppStoreState {
  connectionState: ConnectionState;
  gateState: GateState;
  demoMode: DemoMode;
  activeScenario: string;
  selectedNodeId: string | null;
  selectedIncidentId: string | null;
  backendVersion: string | null;
  lastSyncTimestamp: number | null;

  // Actions
  setDemoMode: (mode: DemoMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedIncidentId: (id: string | null) => void;
  setActiveScenario: (scenario: string) => void;
  setGateState: (state: GateState) => void;
  setConnectionState: (state: ConnectionState) => void;
  checkLiveConnection: () => Promise<void>;
  startLivePolling: (intervalMs?: number) => () => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  // Defaults to demo_offline until live health check verifies backend
  connectionState: 'demo_offline',
  gateState: 'PREDICT',
  demoMode: 'guided_demo',
  activeScenario: 'Gradual Degradation (Live Engine)',
  selectedNodeId: null,
  selectedIncidentId: 'INC-2026-0842',
  backendVersion: null,
  lastSyncTimestamp: null,

  setDemoMode: (demoMode) => set({ demoMode }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
  setActiveScenario: (activeScenario) => set({ activeScenario }),
  setGateState: (gateState) => set({ gateState }),
  setConnectionState: (connectionState) => set({ connectionState }),

  checkLiveConnection: async () => {
    try {
      const health = await apiClient.checkHealth();
      if (health && health.status === 'ok') {
        const status = await apiClient.fetchStatus().catch(() => null);
        set({
          connectionState: 'connected',
          backendVersion: health.version,
          lastSyncTimestamp: Date.now(),
          ...(status?.gate_state ? { gateState: status.gate_state as GateState } : {}),
          ...(status?.scenario ? { activeScenario: status.scenario } : {}),
        });
      } else {
        set({ connectionState: 'demo_offline' });
      }
    } catch {
      set({ connectionState: 'demo_offline' });
    }
  },

  startLivePolling: (intervalMs = 4000) => {
    // Immediate check
    get().checkLiveConnection();
    const timer = setInterval(() => {
      get().checkLiveConnection();
    }, intervalMs);

    return () => clearInterval(timer);
  },
}));
