/**
 * PRECURSOR — Backend Integration Boundary & Typed Service Contracts
 *
 * This file establishes the architectural contract for future FastAPI backend integration.
 * In Phase 6, all services return structured demonstration fixtures or typed stubs.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. ZERO real HTTP/WebSocket calls are initiated from this boundary in Phase 6.
 * 2. Unconnected services return explicit offline status or local fixtures.
 * 3. Base URLs are configurable via environment variables, never hardcoded in UI components.
 */

import { GateState } from '@/types';

/* ═══════════════════════════════════════════════════════════════
   1. TELEMETRY STORAGE & EXPORT CONTRACT (Aligned with Agent C)
   ═══════════════════════════════════════════════════════════════ */

export interface TelemetryPoint {
  timestampIso: string;
  timestampEpoch: number;
  nodeId: string;
  interfaceId: string;
  metricId: string;
  value: number;
  unit: string;
  quality: 'good' | 'degraded' | 'stale';
  source: string;
  labelsJson: string;
}

export interface StructuredRunArchive {
  version: string;
  runId: string;
  exportedAt: string;
  scenario: string;
  faultEvents: Array<{ timestamp: string; type: string; target: string; intensity: number }>;
  telemetryPointsCount: number;
  gateDecisions: Array<{ stage: string; timestamp: string; gate: GateState; rationale: string }>;
  incidentSummary: { id: string; title: string; severity: string; resolutionTimeSec?: number };
  copilotVerification: { verifiedClaims: number; unverifiedClaims: number };
  metadata: {
    generator: string;
    backendConnected: boolean;
    storagePath?: string;
  };
}

/* ═══════════════════════════════════════════════════════════════
   2. TYPED SERVICE INTERFACES FOR FASTAPI
   ═══════════════════════════════════════════════════════════════ */

export interface ITelemetryService {
  getLatestTelemetry(nodeId?: string): Promise<TelemetryPoint[]>;
  getBufferStats(): Promise<{ count: number; maxCapacity: number; retentionSeconds: number }>;
  exportCsv(): Promise<string>;
  exportJson(): Promise<StructuredRunArchive>;
}

export interface IPredictionService {
  getActiveForecasts(): Promise<Array<{
    horizonMinutes: number;
    predictedMetric: string;
    value: number;
    upperBound: number;
    lowerBound: number;
    gateState: GateState;
  }>>;
}

export interface IReliabilityGateService {
  getCurrentGateState(): Promise<{
    state: GateState;
    residualDeviation: number;
    driftPValue: number;
    sensorHealthPct: number;
    timestamp: string;
  }>;
}

export interface IIncidentService {
  listIncidents(): Promise<Array<{
    id: string;
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    gateState: GateState;
    affectedNodes: string[];
    createdAt: string;
  }>>;
}

export interface ICopilotService {
  query(prompt: string, context?: Record<string, unknown>): Promise<{
    answer: string;
    citations: string[];
    verifiedClaims: Array<{ text: string; verified: boolean; metricValue?: string }>;
    model: string;
    offlineMode: boolean;
  }>;
}

/* ═══════════════════════════════════════════════════════════════
   3. CLIENT MOCK / FIXTURE PROVIDER (Phase 6 Standalone Mode)
   ═══════════════════════════════════════════════════════════════ */

export class StandaloneFixtureProvider implements ITelemetryService {
  async getLatestTelemetry(): Promise<TelemetryPoint[]> {
    return [];
  }

  async getBufferStats() {
    return { count: 1200, maxCapacity: 20000, retentionSeconds: 7200 };
  }

  async exportCsv(): Promise<string> {
    return 'timestamp_iso,timestamp_epoch,node_id,interface_id,metric_id,value,unit,quality,source,labels_json\n';
  }

  async exportJson(): Promise<StructuredRunArchive> {
    return {
      version: '1.0.0',
      runId: 'demo-run-offline',
      exportedAt: new Date().toISOString(),
      scenario: 'normal_operation',
      faultEvents: [],
      telemetryPointsCount: 0,
      gateDecisions: [{ stage: 'initial', timestamp: new Date().toISOString(), gate: 'PREDICT', rationale: 'Demo fixture' }],
      incidentSummary: { id: 'INC-DEMO-01', title: 'Normal Baseline Verification', severity: 'LOW' },
      copilotVerification: { verifiedClaims: 0, unverifiedClaims: 0 },
      metadata: {
        generator: 'PRECURSOR Standalone Client Fixture',
        backendConnected: false,
      },
    };
  }
}

export const apiBoundary = new StandaloneFixtureProvider();
