import { create } from 'zustand';
import { GateState, ConnectionState, DemoMode } from '@/types';
import { apiClient, BackendStatusResponse, BackendHealthResponse } from '@/lib/api';

import { useSettingsStore } from './useSettingsStore';

interface AppStoreState {
  connectionState: ConnectionState;
  gateState: GateState;
  demoMode: DemoMode;
  activeScenario: string;
  selectedNodeId: string | null;
  selectedIncidentId: string | null;
  backendVersion: string | null;
  lastSyncTimestamp: number | null;
  latestStatus: BackendStatusResponse | null;
  backendHealth: BackendHealthResponse | null;
  lastStatusUpdate: number | null;
  operatingMode: 'synthetic' | 'live';
  targetHost: string;
  targetPort: number;
  interfaceId: string;
  isAutoStreaming: boolean;

  // Actions
  setDemoMode: (mode: DemoMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedIncidentId: (id: string | null) => void;
  setActiveScenario: (scenario: string) => void;
  setGateState: (state: GateState) => void;
  setConnectionState: (state: ConnectionState) => void;
  setOperatingMode: (mode: 'synthetic' | 'live', targetHost?: string, targetPort?: number, interfaceId?: string) => Promise<any>;
  triggerSampleProbe: (seconds?: number) => Promise<any>;
  toggleAutoStreaming: (enable?: boolean) => void;
  checkLiveConnection: () => Promise<void>;
  startLivePolling: (intervalMs?: number) => () => void;
}

let autoStreamTimer: any = null;

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
  latestStatus: null,
  backendHealth: null,
  lastStatusUpdate: null,
  operatingMode: 'synthetic',
  targetHost: '1.1.1.1',
  targetPort: 80,
  interfaceId: 'auto',
  isAutoStreaming: false,

  setDemoMode: (demoMode) => {
    set({ demoMode });
    try {
      useSettingsStore.getState().setDemoMode(demoMode);
    } catch {
      // Ignore if circular initialization
    }
  },
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
  setActiveScenario: (activeScenario) => set({ activeScenario }),
  setGateState: (gateState) => set({ gateState }),
  setConnectionState: (connectionState) => set({ connectionState }),

  setOperatingMode: async (mode, host, port, iface) => {
    const targetHost = host || get().targetHost;
    const targetPort = port || get().targetPort;
    const interfaceId = iface || get().interfaceId;
    try {
      const res = await apiClient.setMode(mode, targetHost, targetPort, interfaceId);
      set({
        operatingMode: mode,
        targetHost,
        targetPort,
        interfaceId,
        ...(res?.gate_state ? { gateState: res.gate_state as GateState } : {}),
      });
      return res;
    } catch (err) {
      // Local state update fallback
      set({ operatingMode: mode, targetHost, targetPort, interfaceId });
      throw err;
    }
  },

  triggerSampleProbe: async (seconds = 5.0) => {
    try {
      const res = await apiClient.stepSimulation(seconds);
      if (res?.snapshot?.gate_decision?.state) {
        set({ gateState: res.snapshot.gate_decision.state as GateState });
      }
      return res;
    } catch (err) {
      throw err;
    }
  },

  toggleAutoStreaming: (enable) => {
    const shouldEnable = enable !== undefined ? enable : !get().isAutoStreaming;
    if (autoStreamTimer) {
      clearInterval(autoStreamTimer);
      autoStreamTimer = null;
    }
    if (shouldEnable) {
      // Immediate run
      get().triggerSampleProbe(5.0).catch(() => {});
      autoStreamTimer = setInterval(() => {
        get().triggerSampleProbe(5.0).catch(() => {});
      }, 5000);
      set({ isAutoStreaming: true });
    } else {
      set({ isAutoStreaming: false });
    }
  },

  checkLiveConnection: async () => {
    try {
      const health = await apiClient.checkHealth();
      if (health && health.status === 'ok') {
        const [status, modeData] = await Promise.all([
          apiClient.fetchStatus().catch(() => null),
          apiClient.fetchMode().catch(() => null),
        ]);
        const now = Date.now();
        set({
          connectionState: 'connected',
          backendVersion: health.version,
          backendHealth: health,
          latestStatus: status,
          lastSyncTimestamp: now,
          lastStatusUpdate: now,
          ...(status?.gate_state ? { gateState: status.gate_state as GateState } : {}),
          ...(status?.scenario ? { activeScenario: status.scenario } : {}),
          ...(modeData?.mode ? { operatingMode: modeData.mode as 'synthetic' | 'live' } : {}),
          ...(modeData?.target_host ? { targetHost: modeData.target_host } : {}),
          ...(modeData?.target_port ? { targetPort: modeData.target_port } : {}),
          ...(modeData?.interface_id ? { interfaceId: modeData.interface_id } : {}),
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
