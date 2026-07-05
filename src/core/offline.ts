import { FlowForgeConfig, loadConfig } from './config.js';

export class OfflineModeError extends Error {
  constructor(feature: string) {
    super(`${feature} requires live n8n access, but FlowForge is running in offline mode.`);
    this.name = 'OfflineModeError';
  }
}

export function assertOnline(feature: string, config: FlowForgeConfig = loadConfig().config): void {
  if (config.offline) {
    throw new OfflineModeError(feature);
  }
}
