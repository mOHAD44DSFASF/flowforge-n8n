import { FlowForgeConfig, loadConfig } from '../core/config.js';
import { assertOnline } from '../core/offline.js';

export interface LiveN8nClientOptions {
  config?: FlowForgeConfig;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

export interface LiveN8nStatus {
  ok: boolean;
  baseUrl: string;
  status: number;
}

export class LiveN8nConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveN8nConfigError';
  }
}

export class LiveN8nClient {
  private readonly config: FlowForgeConfig;
  private readonly env: NodeJS.ProcessEnv;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LiveN8nClientOptions = {}) {
    this.config = options.config ?? loadConfig().config;
    this.env = options.env ?? process.env;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async checkHealth(feature = 'live n8n access'): Promise<LiveN8nStatus> {
    assertOnline(feature, this.config);
    const baseUrl = this.requireBaseUrl();
    const response = await this.request('/api/v1/workflows?limit=1');
    return { ok: response.ok, baseUrl, status: response.status };
  }

  async getNodeTypes(): Promise<unknown> {
    assertOnline('live node catalog lookup', this.config);
    const response = await this.request('/api/v1/node-types');
    if (!response.ok)
      throw new Error(`n8n node-types request failed with HTTP ${response.status}.`);
    return response.json();
  }

  private async request(requestPath: string): Promise<Response> {
    const baseUrl = this.requireBaseUrl();
    const headers: Record<string, string> = { Accept: 'application/json' };
    const apiKey = this.env[this.config.live.apiKeyEnv];
    if (apiKey) headers['X-N8N-API-KEY'] = apiKey;

    return this.fetchImpl(new URL(requestPath, baseUrl), { headers });
  }

  private requireBaseUrl(): string {
    const baseUrl = this.config.live.baseUrl;
    if (!baseUrl) {
      throw new LiveN8nConfigError(
        'Live mode requires live.baseUrl in flowforge.config.json or N8N_BASE_URL.'
      );
    }
    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }
}

export async function checkLiveN8n(
  feature: string,
  options: LiveN8nClientOptions = {}
): Promise<LiveN8nStatus> {
  return new LiveN8nClient(options).checkHealth(feature);
}
