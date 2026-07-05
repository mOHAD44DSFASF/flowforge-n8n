import { DiffReport } from '../core/workflowDiff.js';
import { Finding } from '../core/findings.js';
import { N8nWorkflow } from '../core/workflowSchema.js';
import { TestRunSummary } from '../testing/types.js';

export interface AppliedFix {
  finding: Finding;
  changed: boolean;
  rationale: string;
}

export interface HealIteration {
  iteration: number;
  finding?: Finding;
  rationale?: string;
  changed: boolean;
  beforeFindings: Finding[];
  afterFindings: Finding[];
  beforeTestSummary?: TestRunSummary;
  afterTestSummary?: TestRunSummary;
  diff: DiffReport;
}

export interface HealReport {
  sourceFile: string;
  outputFile?: string;
  writeMode: 'copy' | 'in-place' | 'dry-run';
  maxIterations: number;
  iterations: HealIteration[];
  finalFindings: Finding[];
  finalTestSummary?: TestRunSummary;
  changed: boolean;
  converged: boolean;
}

export interface HealOptions {
  maxIterations?: number;
  write?: boolean;
  dryRun?: boolean;
  live?: boolean;
}

export interface HealResult {
  workflow: N8nWorkflow;
  report: HealReport;
}
