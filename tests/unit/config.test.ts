import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { applyRuleSeverityOverride, isRuleEnabled, loadConfig } from '../../src/core/config.js';
import { assertOnline, OfflineModeError } from '../../src/core/offline.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-config-'));
}

test('loads defaults when no config file is present', () => {
  const result = loadConfig(makeTempDir(), {});

  expect(result.path).toBeUndefined();
  expect(result.config.offline).toBe(false);
  expect(result.config.validation.semantic).toBe(true);
  expect(result.config.live.apiKeyEnv).toBe('N8N_API_KEY');
});

test('loads config file and applies environment overrides', () => {
  const dir = makeTempDir();
  fs.writeFileSync(
    path.join(dir, 'flowforge.config.json'),
    JSON.stringify({
      offline: false,
      rules: {
        'SEC-AUTH-HEADER': { enabled: false, severity: 'error' }
      },
      live: { baseUrl: 'https://config.example.test' }
    })
  );

  const result = loadConfig(dir, {
    FLOWFORGE_OFFLINE: '1',
    N8N_BASE_URL: 'https://env.example.test'
  });

  expect(result.path).toBe(path.join(dir, 'flowforge.config.json'));
  expect(result.config.offline).toBe(true);
  expect(result.config.live.baseUrl).toBe('https://env.example.test');
  expect(isRuleEnabled(result.config, 'SEC-AUTH-HEADER')).toBe(false);
  expect(applyRuleSeverityOverride(result.config, 'SEC-AUTH-HEADER', 'warning')).toBe('error');
});

test('offline guard blocks live-only features', () => {
  expect(() =>
    assertOnline('live test run', loadConfig(makeTempDir(), { FLOWFORGE_OFFLINE: 'true' }).config)
  ).toThrow(OfflineModeError);
});
