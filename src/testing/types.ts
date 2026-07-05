import { z } from 'zod';
import { N8nWorkflow, N8nWorkflowSchema } from '../core/workflowSchema.js';

export const TestCaseSchema = z.object({
  name: z.string(),
  trigger: z
    .object({
      node: z.string().optional(),
      payload: z.unknown().default({})
    })
    .default({ payload: {} }),
  mocks: z
    .record(
      z.object({
        output: z.unknown().optional(),
        error: z.string().optional()
      })
    )
    .default({}),
  expect: z
    .object({
      output: z.unknown().optional(),
      nodesExecuted: z.array(z.string()).optional(),
      notExecuted: z.array(z.string()).optional(),
      branch: z.string().optional(),
      noSideEffects: z.boolean().optional()
    })
    .default({}),
  snapshot: z.boolean().default(false)
});

export const FlowForgeTestFileSchema = z.object({
  workflow: z.union([z.string(), N8nWorkflowSchema]),
  cases: z.array(TestCaseSchema).min(1)
});

export type FlowForgeTestCase = z.infer<typeof TestCaseSchema>;
export type FlowForgeTestFile = z.infer<typeof FlowForgeTestFileSchema>;

export interface LoadedFlowForgeTestFile {
  path: string;
  workflow: N8nWorkflow;
  cases: FlowForgeTestCase[];
}

export interface TestRunOptions {
  updateSnapshots?: boolean;
  filter?: string;
  bail?: boolean;
  live?: boolean;
  cwd?: string;
  allowEmpty?: boolean;
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed';
  output: unknown;
  nodesExecuted: string[];
  errors: string[];
  snapshotPath?: string;
}

export interface TestFileResult {
  file: string;
  results: TestCaseResult[];
}

export interface TestRunSummary {
  files: number;
  cases: number;
  passed: number;
  failed: number;
}

export interface TestRunResult {
  files: TestFileResult[];
  summary: TestRunSummary;
}
