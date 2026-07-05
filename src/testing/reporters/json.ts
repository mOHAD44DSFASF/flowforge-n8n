import { TestRunResult } from '../types.js';

export function renderJsonReport(result: TestRunResult): string {
  return JSON.stringify(result, null, 2);
}
