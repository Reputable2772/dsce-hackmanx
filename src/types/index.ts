export type GateState = 'PREDICT' | 'DEGRADED' | 'ABSTAIN';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'demo_offline';

export type DemoMode = 'guided_demo' | 'explore';

export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
}
