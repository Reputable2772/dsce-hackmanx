import { create } from 'zustand';
import { GateState, ConnectionState, DemoMode } from '@/types';

interface AppStoreState {
  connectionState: ConnectionState;
  gateState: GateState;
  demoMode: DemoMode;
  activeScenario: string;
  selectedNodeId: string | null;
  
  // Actions
  setDemoMode: (mode: DemoMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setActiveScenario: (scenario: string) => void;
  setGateState: (state: GateState) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  // In Phase 1, explicitly unconfigured / demo offline
  connectionState: 'demo_offline',
  gateState: 'PREDICT',
  demoMode: 'guided_demo',
  activeScenario: 'Normal Baseline (Unconnected)',
  selectedNodeId: null,

  setDemoMode: (demoMode) => set({ demoMode }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setActiveScenario: (activeScenario) => set({ activeScenario }),
  setGateState: (gateState) => set({ gateState }),
}));
