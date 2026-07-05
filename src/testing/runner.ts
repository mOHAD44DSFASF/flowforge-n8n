import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { assertOnline } from '../core/offline.js';
import { parseWorkflowFile } from '../core/workflowParser.js';
import { N8nWorkflow } from '../core/workflowSchema.js';
import { checkLiveN8n } from '../live/n8nClient.js';
import { assertSnapshot } from './snapshots.js';
import { simulateWorkflow } from './simulator.js';
import {
  FlowForgeTestFileSchema,
  LoadedFlowForgeTestFile,
  TestFileResult,
  TestRunOptions,
  TestRunResult
} from './types.js';

export async function runFlowForgeTests(
  pattern = '**/*.flowforge.test.json',
  options: TestRunOptions = {}
): Promise<TestRunResult> {
  if (options.live) {
    assertOnline('live regression tests');
    await checkLiveN8n('live regression tests');
  }

  const cwd = options.cwd ?? process.cwd();
  const files = await resolveTestFiles(pattern, cwd);
  if (files.length === 0 && !options.allowEmpty) {
    return emptyFailure(pattern);
  }

  const fileResults: TestFileResult[] = [];
  let shouldBail = false;

  for (const filePath of files) {
    if (shouldBail) break;
    const loaded = loadTestFile(filePath);
    const results = [];

    for (const testCase of loaded.cases) {
      if (options.filter && !testCase.name.includes(options.filter)) continue;
      const result = simulateWorkflow(loaded.workflow, testCase);
      if (testCase.snapshot) {
        const snapshotResult = assertSnapshot(
          filePath,
          testCase.name,
          result.output,
          options.updateSnapshots ?? false
        );
        result.snapshotPath = snapshotResult.snapshotPath;
        if (!snapshotResult.ok && snapshotResult.error) {
          result.status = 'failed';
          result.errors.push(snapshotResult.error);
        }
      }
      results.push(result);
      if (options.bail && result.status === 'failed') {
        shouldBail = true;
        break;
      }
    }

    fileResults.push({ file: path.relative(cwd, filePath), results });
  }

  const allResults = fileResults.flatMap((file) => file.results);
  if (allResults.length === 0 && !options.allowEmpty) {
    return emptyFailure(
      pattern,
      'TEST-NO-TEST-CASES: No test cases matched the requested filters.'
    );
  }

  return {
    files: fileResults,
    summary: {
      files: fileResults.length,
      cases: allResults.length,
      passed: allResults.filter((result) => result.status === 'passed').length,
      failed: allResults.filter((result) => result.status === 'failed').length
    }
  };
}

function emptyFailure(
  pattern: string,
  message = 'TEST-NO-TEST-FILES: No FlowForge test files matched the requested pattern.'
): TestRunResult {
  return {
    files: [
      {
        file: pattern,
        results: [
          {
            name: 'discover tests',
            status: 'failed',
            output: undefined,
            nodesExecuted: [],
            errors: [message]
          }
        ]
      }
    ],
    summary: {
      files: 0,
      cases: 1,
      passed: 0,
      failed: 1
    }
  };
}

async function resolveTestFiles(pattern: string, cwd: string): Promise<string[]> {
  const directPath = path.resolve(cwd, pattern);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return [directPath];
  }

  return fg(pattern, {
    cwd,
    absolute: true,
    onlyFiles: true,
    ignore: ['node_modules/**', 'dist/**', '.flowforge/**', 'tmp/**']
  });
}

export function loadTestFile(filePath: string): LoadedFlowForgeTestFile {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const parsed = FlowForgeTestFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid FlowForge test file ${filePath}: ${parsed.error.message}`);
  }

  return {
    path: filePath,
    workflow: loadWorkflow(filePath, parsed.data.workflow),
    cases: parsed.data.cases
  };
}

function loadWorkflow(testFilePath: string, workflow: string | N8nWorkflow): N8nWorkflow {
  if (typeof workflow !== 'string') return workflow;
  const workflowPath = path.resolve(path.dirname(testFilePath), workflow);
  const parsed = parseWorkflowFile(workflowPath);
  if (!parsed.success || !parsed.workflow) {
    throw new Error(parsed.error ?? `Unable to parse workflow at ${workflowPath}`);
  }
  return parsed.workflow;
}
