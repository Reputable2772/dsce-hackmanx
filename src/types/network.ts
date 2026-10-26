export type NodeType = 'gateway' | 'switch' | 'router' | 'server' | 'endpoint';

export type NodeStatus = 'healthy' | 'degraded' | 'critical' | 'offline' | 'unmonitored';

export interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  ip_address: string;
  position: [number, number, number]; // 3D coordinates [x, y, z]
  metrics?: {
    latency_ms?: number;
    packet_loss_pct?: number;
    throughput_mbps?: number;
  };
}

export interface NetworkLink {
  id: string;
  source_id: string;
  target_id: string;
  status: 'active' | 'degraded' | 'down';
  utilization_pct: number;
}
