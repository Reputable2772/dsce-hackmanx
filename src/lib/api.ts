/**
 * PRECURSOR API Client.
 * Connects the React frontend to the live PRECURSOR REST API server.
 */

export interface ApiClientConfig {
  baseUrl: string;
  wsUrl: string;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: number;
}

export interface BackendStatusResponse {
  scenario: string;
  timestamp: number;
  gate_state: 'PREDICT' | 'DEGRADED' | 'ABSTAIN';
  sensor_health: number;
  distribution_drift: number;
  residual_expansion: number;
  immediate_alerts_active: boolean;
  latest_metrics: Record<string, number | null>;
  quality_stats: {
    total_points: number;
    good_ratio: number;
    missing_ratio: number;
    stale_ratio: number;
    invalid_ratio?: number;
    is_sensor_healthy?: boolean;
  };
}

export interface BackendPredictionsResponse {
  gate_state: 'PREDICT' | 'DEGRADED' | 'ABSTAIN';
  predictions: Record<
    string,
    {
      horizon_minutes: number;
      predicted_impact: boolean;
      is_sustained: boolean;
      confidence_score: number;
      evidence: string;
      active_detectors: number;
    }
  >;
}

export interface RegisteredSystem {
  id: string;
  name: string;
  address: string;
  is_local: boolean;
  description: string;
  probe_enabled: boolean;
  port: number;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  reachability: 'reachable' | 'unreachable' | 'disabled' | 'error' | 'unprobed';
  probe_status: string;
  probe_type: string;
  diagnostic_message: string;
  latency_ms: number | null;
  jitter_ms: number | null;
  packet_loss_pct: number | null;
  telemetry_source: string;
  unsupported_metrics: string[];
  metrics: {
    latencyMs: number | null;
    jitterMs: number | null;
    packetLossPct: number | null;
    throughputMbps: number | null;
    cpuUtilizationPct: number | null;
    memoryUtilizationPct: number | null;
  };
  last_seen: string | null;
  tags?: string[];
}

export interface CreateSystemPayload {
  name: string;
  address: string;
  description?: string;
  probe_enabled?: boolean;
  port?: number;
  tags?: string[];
}

export interface UpdateSystemPayload {
  name?: string;
  address?: string;
  description?: string;
  probe_enabled?: boolean;
  port?: number;
}

export class PrecursorApiClient {
  private config: ApiClientConfig;

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = {
      baseUrl:
        config?.baseUrl ||
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
        'http://127.0.0.1:8000',
      wsUrl:
        config?.wsUrl ||
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) ||
        'ws://127.0.0.1:8000/ws',
    };
  }

  public get baseUrl(): string {
    return this.config.baseUrl;
  }

  public async checkHealth(): Promise<BackendHealthResponse> {
    const res = await fetch(`${this.config.baseUrl}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchStatus(): Promise<BackendStatusResponse> {
    const res = await fetch(`${this.config.baseUrl}/api/status`);
    if (!res.ok) {
      throw new Error(`Status check failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchSnapshot(): Promise<BackendStatusResponse> {
    return this.fetchStatus();
  }

  public async fetchTelemetry(windowSeconds: number = 300): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/telemetry?window=${windowSeconds}`);
    if (!res.ok) {
      throw new Error(`Telemetry fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchPredictions(): Promise<BackendPredictionsResponse> {
    const res = await fetch(`${this.config.baseUrl}/api/predictions`);
    if (!res.ok) {
      throw new Error(`Predictions fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchIncidents(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/incidents`);
    if (!res.ok) {
      throw new Error(`Incidents fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchGate(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/gate`);
    if (!res.ok) {
      throw new Error(`Gate fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async stepSimulation(seconds: number = 5.0): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds }),
    });
    if (!res.ok) {
      throw new Error(`Step simulation failed with status ${res.status}`);
    }
    return res.json();
  }

  public async resetScenario(scenario: string = 'gradual_degradation', seed: number = 42): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/scenario/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, seed }),
    });
    if (!res.ok) {
      throw new Error(`Scenario reset failed with status ${res.status}`);
    }
    return res.json();
  }

  public async queryCopilot(prompt?: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/copilot/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      throw new Error(`Copilot query failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchMode(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/mode`);
    if (!res.ok) {
      throw new Error(`Mode fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async setMode(
    mode: 'synthetic' | 'live',
    targetHost?: string,
    targetPort?: number,
    interfaceId?: string
  ): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        target_host: targetHost,
        target_port: targetPort,
        interface_id: interfaceId,
      }),
    });
    if (!res.ok) {
      throw new Error(`Mode update failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchReady(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/ready`);
    if (!res.ok) {
      throw new Error(`Readiness check failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchTopology(view?: string): Promise<any> {
    const url = view
      ? `${this.config.baseUrl}/api/topology?view=${encodeURIComponent(view)}`
      : `${this.config.baseUrl}/api/topology`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Topology fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchSystems(): Promise<{ systems: RegisteredSystem[]; count: number; timestamp: number }> {
    const res = await fetch(`${this.config.baseUrl}/api/systems`);
    if (!res.ok) {
      throw new Error(`Failed to fetch systems: status ${res.status}`);
    }
    return res.json();
  }

  public async fetchSystem(systemId: string): Promise<RegisteredSystem> {
    const res = await fetch(`${this.config.baseUrl}/api/systems/${systemId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch system ${systemId}: status ${res.status}`);
    }
    return res.json();
  }

  public async addSystem(payload: CreateSystemPayload): Promise<RegisteredSystem> {
    const res = await fetch(`${this.config.baseUrl}/api/systems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Failed to add system: status ${res.status}`);
    }
    return res.json();
  }

  public async updateSystem(systemId: string, payload: UpdateSystemPayload): Promise<RegisteredSystem> {
    const res = await fetch(`${this.config.baseUrl}/api/systems/${systemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Failed to update system: status ${res.status}`);
    }
    return res.json();
  }

  public async toggleSystemProbe(systemId: string): Promise<RegisteredSystem> {
    const res = await fetch(`${this.config.baseUrl}/api/systems/${systemId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Failed to toggle probe for ${systemId}: status ${res.status}`);
    }
    return res.json();
  }

  public async triggerSystemProbe(systemId: string): Promise<RegisteredSystem> {
    const res = await fetch(`${this.config.baseUrl}/api/systems/${systemId}/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Failed to probe system ${systemId}: status ${res.status}`);
    }
    return res.json();
  }

  public async removeSystem(systemId: string): Promise<{ status: string; id: string }> {
    const res = await fetch(`${this.config.baseUrl}/api/systems/${systemId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Failed to remove system: status ${res.status}`);
    }
    return res.json();
  }

  public async fetchIncident(incidentId: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/incidents/${incidentId}`);
    if (!res.ok) {
      throw new Error(`Incident fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async acknowledgeIncident(incidentId: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/incidents/${incidentId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Acknowledge failed with status ${res.status}`);
    }
    return res.json();
  }

  public async resolveIncident(incidentId: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/incidents/${incidentId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Resolve failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchSimulationState(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/simulation/state`);
    if (!res.ok) {
      throw new Error(`Simulation state fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async runEvaluation(scenario?: string, seed?: number): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/evaluation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, seed }),
    });
    if (!res.ok) {
      throw new Error(`Evaluation run failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchEvaluationRuns(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/evaluation/runs`);
    if (!res.ok) {
      throw new Error(`Evaluation runs fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async verifyClaim(claim: string, telemetry?: Record<string, any>): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/claims/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim, telemetry }),
    });
    if (!res.ok) {
      throw new Error(`Claim verify failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchConfig(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/config`);
    if (!res.ok) {
      throw new Error(`Config fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async updateConfig(config: Record<string, any>): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      throw new Error(`Config update failed with status ${res.status}`);
    }
    return res.json();
  }

  public getExportCsvUrl(): string {
    return `${this.config.baseUrl}/api/export/csv`;
  }

  public getExportJsonUrl(): string {
    return `${this.config.baseUrl}/api/export/json`;
  }

  public async fetchRunbooks(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/runbooks`);
    if (!res.ok) {
      throw new Error(`Runbooks fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchRunbook(runbookId: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/runbooks/${runbookId}`);
    if (!res.ok) {
      throw new Error(`Runbook fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  // --- Phase 3 & 4: Database-Backed History & Incidents ---
  public async fetchHistorySummary(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/history/summary`);
    if (!res.ok) {
      throw new Error(`History summary fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchHistoricalIncidents(params: {
    status?: string;
    severity?: string;
    source?: string;
    interface_id?: string;
    is_active_fault?: boolean;
    start_time?: number;
    end_time?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ incidents: any[]; total: number; limit: number; offset: number }> {
    const qs = new URLSearchParams();
    if (params.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params.severity && params.severity !== 'ALL') qs.set('severity', params.severity);
    if (params.source && params.source !== 'ALL') qs.set('source', params.source);
    if (params.interface_id) qs.set('interface_id', params.interface_id);
    if (params.is_active_fault !== undefined) qs.set('is_active_fault', String(params.is_active_fault));
    if (params.start_time !== undefined) qs.set('start_time', String(params.start_time));
    if (params.end_time !== undefined) qs.set('end_time', String(params.end_time));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.offset !== undefined) qs.set('offset', String(params.offset));

    const url = `${this.config.baseUrl}/api/history/incidents${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Historical incidents fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchIncidentDetail(incidentId: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/incidents/${encodeURIComponent(incidentId)}`);
    if (!res.ok) {
      throw new Error(`Incident detail fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchHistoricalTelemetry(
    startTime: number,
    endTime: number,
    metricId?: string,
    limit: number = 1000
  ): Promise<{ points: any[]; count: number; start_time: number; end_time: number; metric_id?: string }> {
    const qs = new URLSearchParams({
      start_time: String(startTime),
      end_time: String(endTime),
      limit: String(limit),
    });
    if (metricId) qs.set('metric_id', metricId);

    const res = await fetch(`${this.config.baseUrl}/api/history/telemetry?${qs.toString()}`);
    if (!res.ok) {
      throw new Error(`Historical telemetry fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchHistoricalGate(limit: number = 100): Promise<{ history: any[]; count: number }> {
    const res = await fetch(`${this.config.baseUrl}/api/history/gate?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Historical gate fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchHistoricalCopilot(incidentId?: string, limit: number = 50): Promise<{ records: any[]; count: number }> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (incidentId) qs.set('incident_id', incidentId);
    const res = await fetch(`${this.config.baseUrl}/api/history/copilot?${qs.toString()}`);
    if (!res.ok) {
      throw new Error(`Historical copilot fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchHistoricalClaims(incidentId?: string, limit: number = 50): Promise<{ verifications: any[]; count: number }> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (incidentId) qs.set('incident_id', incidentId);
    const res = await fetch(`${this.config.baseUrl}/api/history/claims?${qs.toString()}`);
    if (!res.ok) {
      throw new Error(`Historical claims fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  // --- Phase 4: User-Triggered Copilot & Operational Events ---
  public async explainIncident(incidentId: string, prompt?: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/copilot/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: incidentId, prompt }),
    });
    if (!res.ok) {
      throw new Error(`Copilot explanation failed with status ${res.status}`);
    }
    return res.json();
  }

  public async fetchNotifications(limit: number = 50, unreadOnly: boolean = false): Promise<{ events: any[]; count: number }> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (unreadOnly) qs.set('unread_only', '1');
    const res = await fetch(`${this.config.baseUrl}/api/notifications?${qs.toString()}`);
    if (!res.ok) {
      throw new Error(`Notifications fetch failed with status ${res.status}`);
    }
    return res.json();
  }

  public async markNotificationRead(eventId: number): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    });
    if (!res.ok) {
      throw new Error(`Mark notification read failed with status ${res.status}`);
    }
    return res.json();
  }

  public async markAllNotificationsRead(): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) {
      throw new Error(`Mark all notifications read failed with status ${res.status}`);
    }
    return res.json();
  }

  public getFilteredCsvUrl(params: {
    type?: 'telemetry' | 'incidents' | 'gate';
    status?: string;
    severity?: string;
    source?: string;
    start_time?: number;
    end_time?: number;
    metric_id?: string;
  } = {}): string {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params.severity && params.severity !== 'ALL') qs.set('severity', params.severity);
    if (params.source && params.source !== 'ALL') qs.set('source', params.source);
    if (params.start_time !== undefined) qs.set('start_time', String(params.start_time));
    if (params.end_time !== undefined) qs.set('end_time', String(params.end_time));
    if (params.metric_id) qs.set('metric_id', params.metric_id);
    return `${this.config.baseUrl}/api/export/csv${qs.toString() ? '?' + qs.toString() : ''}`;
  }
}

export const apiClient = new PrecursorApiClient();
