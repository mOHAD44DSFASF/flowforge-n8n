import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { assertOnline } from '../core/offline.js';
import { checkLiveN8n } from '../live/n8nClient.js';
import { EvalCaseResult, EvalRunResult, FlowForgeEvalFileSchema } from './types.js';

export interface EvalRunOptions {
  live?: boolean;
  baseline?: string;
}

export async function runEval(
  pattern = '**/*.flowforge.eval.json',
  options: EvalRunOptions = {}
): Promise<EvalRunResult> {
  if (options.live) {
    assertOnline('live eval');
    await checkLiveN8n('live eval');
  }
  const files = await resolveFiles(pattern);
  const fileResults = files.map((file) => runEvalFile(file));
  const all = fileResults.flatMap((file) => file.results);
  const passRate = all.length === 0 ? 0 : all.filter((result) => result.passed).length / all.length;
  const result: EvalRunResult = {
    files: fileResults.map((file) => ({
      file: path.relative(process.cwd(), file.file),
      results: file.results
    })),
    summary: {
      files: fileResults.length,
      cases: all.length,
      passed: all.filter((caseResult) => caseResult.passed).length,
      failed: all.filter((caseResult) => !caseResult.passed).length,
      passRate
    }
  };

  if (options.baseline) {
    const baseline = JSON.parse(fs.readFileSync(options.baseline, 'utf8')) as EvalRunResult;
    result.baseline = {
      changed: baseline.summary.passRate !== passRate,
      previousPassRate: baseline.summary.passRate,
      delta: passRate - baseline.summary.passRate
    };
  }

  return result;
}

export function renderEvalTty(result: EvalRunResult): string {
  const lines = ['FlowForge Eval'];
  for (const file of result.files) {
    lines.push(`\n${file.file}`);
    for (const testCase of file.results)
      lines.push(
        `  ${testCase.passed ? '[PASS]' : '[FAIL]'} ${testCase.id}${testCase.error ? ` - ${testCase.error}` : ''}`
      );
  }
  lines.push(
    `\nSummary: ${result.summary.passed}/${result.summary.cases} passed (${Math.round(result.summary.passRate * 100)}%).`
  );
  if (result.baseline) lines.push(`Baseline delta: ${result.baseline.delta}`);
  return lines.join('\n');
}

export function renderEvalJson(result: EvalRunResult): string {
  return JSON.stringify(result, null, 2);
}

function runEvalFile(file: string): { file: string; results: EvalCaseResult[] } {
  const parsed = FlowForgeEvalFileSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
  return {
    file,
    results: parsed.cases.map((testCase) => {
      const actual = parsed.recordings[testCase.id];
      const verdict = evaluateExpectation(
        actual,
        testCase.expectation.type,
        testCase.expectation.value
      );
      return {
        id: testCase.id,
        passed: verdict.passed,
        expected: testCase.expectation.value,
        actual,
        error: verdict.error
      };
    })
  };
}

function evaluateExpectation(
  actual: unknown,
  type: string,
  expected: unknown
): { passed: boolean; error?: string } {
  if (actual === undefined) return { passed: false, error: 'Missing recording for case.' };
  if (type === 'exact')
    return JSON.stringify(actual) === JSON.stringify(expected)
      ? { passed: true }
      : { passed: false, error: 'Exact match failed.' };
  if (type === 'contains')
    return String(actual).includes(String(expected))
      ? { passed: true }
      : { passed: false, error: 'Contains match failed.' };
  if (type === 'toolCalls') {
    const actualCalls = Array.isArray((actual as { toolCalls?: unknown }).toolCalls)
      ? (actual as { toolCalls: unknown[] }).toolCalls
      : [];
    const expectedCalls = Array.isArray(expected) ? expected : [];
    return expectedCalls.every((call) => actualCalls.includes(call))
      ? { passed: true }
      : { passed: false, error: 'Tool-call expectation failed.' };
  }
  if (type === 'jsonSchema')
    return matchesJsonSchema(actual, expected)
      ? { passed: true }
      : { passed: false, error: 'JSON schema expectation failed.' };
  return { passed: false, error: `Unknown expectation type: ${type}` };
}

function matchesJsonSchema(actual: unknown, schema: unknown): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false;
  const record = schema as { required?: unknown; properties?: Record<string, { type?: string }> };
  if (record.required && Array.isArray(record.required)) {
    if (!actual || typeof actual !== 'object') return false;
    for (const key of record.required)
      if (typeof key === 'string' && !(key in actual)) return false;
  }
  if (record.properties && actual && typeof actual === 'object') {
    for (const [key, propSchema] of Object.entries(record.properties)) {
      const value = (actual as Record<string, unknown>)[key];
      if (value !== undefined && propSchema.type && typeof value !== propSchema.type) return false;
    }
  }
  return true;
}

async function resolveFiles(pattern: string): Promise<string[]> {
  const direct = path.resolve(pattern);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return [direct];
  return fg(pattern, {
    cwd: process.cwd(),
    absolute: true,
    onlyFiles: true,
    ignore: ['node_modules/**', 'dist/**']
  });
}
