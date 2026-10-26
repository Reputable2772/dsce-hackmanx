export type TopologyNodeType = 'gateway' | 'router' | 'switch' | 'server' | 'endpoint';

export type TopologyHealthStatus = 'healthy' | 'degraded' | 'critical' | 'offline';

export type TopologyLinkStatus = 'active' | 'degraded' | 'down';

export interface TopologyNodeMetadata {
  role: string;
  firmware: string;
  location: string;
  interfaceName: string;
  ipAddress: string;
  macAddress?: string;
}

export interface TopologyNodeMetrics {
  latencyMs?: number;
  jitterMs?: number;
  packetLossPct?: number;
  throughputMbps?: number;
  cpuUtilizationPct?: number;
  memoryUtilizationPct?: number;
}

export interface TopologyNodeData {
  id: string;
  name: string;
  type: TopologyNodeType;
  position: [number, number, number];
  status: TopologyHealthStatus;
  metrics: TopologyNodeMetrics;
  metadata: TopologyNodeMetadata;
}

export interface TopologyLinkMetadata {
  cableType: 'Fiber Optic' | '10GbE DAC' | '1GbE Twisted Pair';
  bandwidthGbps: number;
  sourceInterface: string;
  targetInterface: string;
}

export interface TopologyLinkData {
  id: string;
  sourceId: string;
  targetId: string;
  status: TopologyLinkStatus;
  utilizationPct: number;
  latencyMs?: number;
  packetLossPct?: number;
  metadata: TopologyLinkMetadata;
}

export interface NetworkTopologyData {
  id: string;
  name: string;
  description: string;
  isDemoFixture: boolean;
  nodes: TopologyNodeData[];
  links: TopologyLinkData[];
}
