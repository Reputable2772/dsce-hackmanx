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
}

export const apiClient = new PrecursorApiClient();
