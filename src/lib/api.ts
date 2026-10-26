/**
 * PRECURSOR API Client Foundation.
 * 
 * NOTE: For Phase 1, the backend is not yet attached.
 * All functions return an explicit disconnected / unconfigured result or throw
 * an informative error rather than fabricating fake production responses.
 */

export interface ApiClientConfig {
  baseUrl: string;
  wsUrl: string;
}

export class PrecursorApiClient {
  private config: ApiClientConfig;
  public readonly isConnected: boolean = false;

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
      wsUrl: config?.wsUrl || import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws',
    };
  }

  public getStatusMessage(): string {
    return `Backend connection unconfigured (${this.config.baseUrl}). Awaiting Phase 2 backend orchestration.`;
  }

  public async fetchTelemetry(): Promise<never> {
    throw new Error(`API disconnected: Cannot fetch telemetry from ${this.config.baseUrl}. Connect backend service in Phase 2.`);
  }

  public async fetchPredictions(): Promise<never> {
    throw new Error(`API disconnected: Cannot fetch predictions from ${this.config.baseUrl}. Connect backend service in Phase 2.`);
  }

  public async fetchIncidents(): Promise<never> {
    throw new Error(`API disconnected: Cannot fetch incidents from ${this.config.baseUrl}. Connect backend service in Phase 2.`);
  }

  public async queryCopilot(_prompt: string): Promise<never> {
    throw new Error(`Ollama offline: Local AI bridge at ${this.config.baseUrl} is unconfigured in Phase 1.`);
  }
}

export const apiClient = new PrecursorApiClient();
