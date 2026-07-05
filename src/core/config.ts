import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { FindingSeverity } from './findings.js';

const severitySchema = z.enum(['info', 'warning', 'error']);

const FlowForgeConfigSchema = z
  .object({
    offline: z.boolean().default(false),
    rules: z
      .record(
        z
          .object({
            enabled: z.boolean().optional(),
            severity: severitySchema.optional()
          })
          .strict()
      )
      .default({}),
    validation: z
      .object({
        failOn: severitySchema.default('error'),
        semantic: z.boolean().default(true)
      })
      .default({}),
    lint: z
      .object({
        failOn: severitySchema.default('error')
      })
      .default({}),
    testing: z
      .object({
        reporter: z.enum(['tty', 'json', 'junit']).default('tty'),
        bail: z.boolean().default(false),
        updateSnapshots: z.boolean().default(false)
      })
      .default({}),
    catalog: z
      .object({
        sourceN8nVersion: z.string().optional(),
        warnOnVersionSkew: z.boolean().default(true)
      })
      .default({}),
    live: z
      .object({
        baseUrl: z.string().url().optional(),
        apiKeyEnv: z.string().default('N8N_API_KEY')
      })
      .default({})
  })
  .strict();

export type FlowForgeConfig = z.infer<typeof FlowForgeConfigSchema>;

export interface ConfigLoadResult {
  config: FlowForgeConfig;
  path?: string;
}

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
  return undefined;
}

function findConfigPath(startDir: string): string | undefined {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, 'flowforge.config.json');
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export function loadConfig(
  startDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): ConfigLoadResult {
  const configPath = findConfigPath(startDir);
  const rawConfig = configPath ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const parsed = FlowForgeConfigSchema.parse(rawConfig);

  const envOffline = parseBooleanEnv(env.FLOWFORGE_OFFLINE);
  const envBaseUrl = env.N8N_BASE_URL;

  return {
    path: configPath,
    config: {
      ...parsed,
      offline: envOffline ?? parsed.offline,
      live: {
        ...parsed.live,
        baseUrl: envBaseUrl ?? parsed.live.baseUrl
      }
    }
  };
}

export function applyRuleSeverityOverride(
  config: FlowForgeConfig,
  ruleCode: string,
  defaultSeverity: FindingSeverity
): FindingSeverity {
  return config.rules[ruleCode]?.severity ?? defaultSeverity;
}

export function isRuleEnabled(config: FlowForgeConfig, ruleCode: string): boolean {
  return config.rules[ruleCode]?.enabled ?? true;
}
