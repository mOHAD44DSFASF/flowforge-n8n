import { z } from 'zod';

export const EvalCaseSchema = z.object({
  id: z.string(),
  input: z.unknown(),
  expectation: z.object({
    type: z.enum(['exact', 'contains', 'jsonSchema', 'toolCalls']),
    value: z.unknown()
  })
});

export const FlowForgeEvalFileSchema = z.object({
  name: z.string().optional(),
  cases: z.array(EvalCaseSchema).min(1),
  recordings: z.record(z.unknown()).default({})
});

export type FlowForgeEvalCase = z.infer<typeof EvalCaseSchema>;
export type FlowForgeEvalFile = z.infer<typeof FlowForgeEvalFileSchema>;

export interface EvalCaseResult {
  id: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  error?: string;
}

export interface EvalRunResult {
  files: Array<{
    file: string;
    results: EvalCaseResult[];
  }>;
  summary: {
    files: number;
    cases: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  baseline?: {
    changed: boolean;
    previousPassRate?: number;
    delta?: number;
  };
}
