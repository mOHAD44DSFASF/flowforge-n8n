import { expect, test } from 'vitest';
import { loadConfig } from '../../src/core/config.js';
import { OfflineModeError } from '../../src/core/offline.js';
import { LiveN8nClient, LiveN8nConfigError } from '../../src/live/n8nClient.js';

test('live client requires a configured base URL', async () => {
  const config = loadConfig(process.cwd(), {}).config;
  const client = new LiveN8nClient({ config, env: {} });

  await expect(client.checkHealth('live test')).rejects.toThrow(LiveN8nConfigError);
});

test('live client respects offline mode before network access', async () => {
  const config = loadConfig(process.cwd(), {
    FLOWFORGE_OFFLINE: '1',
    N8N_BASE_URL: 'https://n8n.example.test'
  }).config;
  const client = new LiveN8nClient({ config, env: {} });

  await expect(client.checkHealth('live test')).rejects.toThrow(OfflineModeError);
});

test('live client probes n8n with configured auth header', async () => {
  const config = loadConfig(process.cwd(), { N8N_BASE_URL: 'https://n8n.example.test' }).config;
  let requestedUrl = '';
  let requestedKey = '';
  const fetchImpl: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedKey = (init?.headers as Record<string, string>)['X-N8N-API-KEY'];
    return new Response('{}', { status: 200 });
  };

  const status = await new LiveN8nClient({
    config,
    env: { N8N_API_KEY: 'secret' },
    fetchImpl
  }).checkHealth('live test');

  expect(status).toMatchObject({ ok: true, baseUrl: 'https://n8n.example.test/', status: 200 });
  expect(requestedUrl).toBe('https://n8n.example.test/api/v1/workflows?limit=1');
  expect(requestedKey).toBe('secret');
});
