import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { diffWorkflows } from '../core/workflowDiff.js';
import { explainWorkflow } from '../core/workflowExplainer.js';
import { generatePayloads } from '../core/payloadGenerator.js';
import { parseWorkflowFile, parseWorkflowString } from '../core/workflowParser.js';
import { sanitizeWorkflow } from '../core/workflowSanitizer.js';
import { scoreWorkflow } from '../core/workflowScorer.js';
import { validateWorkflow } from '../core/workflowValidator.js';
import { validateWorkflowSemantics } from '../core/semanticValidator.js';
import { runAnalysis } from '../analysis/engine.js';
import { loadConfig } from '../core/config.js';
import { N8nWorkflow } from '../core/workflowSchema.js';
import { healWorkflow } from '../healing/loop.js';
import { runFlowForgeTests } from '../testing/runner.js';

export const workflowInputSchema = {
  path: z.string().optional(),
  workflow: z.record(z.unknown()).optional()
};

export const diffInputSchema = {
  oldPath: z.string().optional(),
  newPath: z.string().optional(),
  oldWorkflow: z.record(z.unknown()).optional(),
  newWorkflow: z.record(z.unknown()).optional()
};

export type WorkflowInput = z.infer<z.ZodObject<typeof workflowInputSchema>>;
export type DiffInput = z.infer<z.ZodObject<typeof diffInputSchema>>;

export async function validateWorkflowTool(input: WorkflowInput) {
  const workflow = loadWorkflowInput(input);
  const shape = validateWorkflow(workflow);
  const semanticFindings = validateWorkflowSemantics(workflow);
  const errors = [
    ...shape.errors,
    ...semanticFindings.filter((finding) => finding.severity === 'error')
  ];
  return {
    isValid: errors.length === 0,
    errors,
    warnings: [
      ...shape.warnings,
      ...semanticFindings.filter((finding) => finding.severity === 'warning')
    ],
    findings: [...shape.findings, ...semanticFindings]
  };
}

export async function lintWorkflowTool(input: WorkflowInput) {
  return runAnalysis(loadWorkflowInput(input), { config: loadConfig().config });
}

export async function scoreWorkflowTool(input: WorkflowInput) {
  return scoreWorkflow(loadWorkflowInput(input));
}

export async function runTestsTool(input: {
  glob?: string;
  filter?: string;
  bail?: boolean;
  updateSnapshots?: boolean;
  live?: boolean;
}) {
  return runFlowForgeTests(input.glob, {
    filter: input.filter,
    bail: input.bail,
    updateSnapshots: input.updateSnapshots,
    live: input.live
  });
}

export async function generatePayloadsTool(input: { type: string }) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-mcp-payloads-'));
  const files = generatePayloads(input.type, outDir);
  return Object.fromEntries(
    files.map((file) => [path.basename(file), JSON.parse(fs.readFileSync(file, 'utf8'))])
  );
}

export async function diffWorkflowsTool(input: DiffInput) {
  return diffWorkflows(loadWorkflowPair(input, 'old'), loadWorkflowPair(input, 'new'));
}

export async function explainErrorTool(input: { error: string }) {
  const error = input.error;
  if (error.includes('TEST-UNSUPPORTED-NODE')) {
    return {
      explanation:
        'The regression simulator reached a node type it cannot execute deterministically.',
      suggestion: 'Add a mock for that node in the test case.'
    };
  }
  if (error.includes('SEM-UNKNOWN-PARAM')) {
    return {
      explanation: 'A node parameter is not present in the bundled catalog for that node type.',
      suggestion: 'Use the nearest-match fix or remove the unknown parameter.'
    };
  }
  if (error.includes('SEC-HARDCODED-SECRET')) {
    return {
      explanation: 'Workflow parameters contain secret-like material.',
      suggestion: 'Move credentials into n8n credentials and run sanitize before sharing.'
    };
  }
  return {
    explanation: 'FlowForge could not map this error to a specialized explanation.',
    suggestion: 'Run validate, analyze, and test for structured findings.'
  };
}

export async function suggestFixTool(input: WorkflowInput) {
  const workflow = loadWorkflowInput(input);
  const findings = [
    ...validateWorkflow(workflow).findings,
    ...validateWorkflowSemantics(workflow),
    ...runAnalysis(workflow, { config: loadConfig().config }).findings
  ];
  return {
    fixes: findings
      .filter((finding) => finding.fix)
      .map((finding) => ({ code: finding.code, message: finding.message, fix: finding.fix }))
  };
}

export async function healTool(input: WorkflowInput & { maxIterations?: number }) {
  const workflow = loadWorkflowInput(input);
  const result = await healWorkflow(workflow, input.path ?? '<inline>', {
    maxIterations: input.maxIterations
  });
  return { workflow: result.workflow, report: result.report };
}

export async function sanitizeTool(input: WorkflowInput & { strict?: boolean }) {
  const result = sanitizeWorkflow(loadWorkflowInput(input), input.strict ?? false);
  return {
    sanitizedWorkflow: result.sanitizedWorkflow,
    redactedCount: result.redactedCount,
    reportMd: result.reportMd
  };
}

export async function explainWorkflowTool(input: WorkflowInput) {
  return { explanation: explainWorkflow(loadWorkflowInput(input)) };
}

export function loadWorkflowInput(input: WorkflowInput): N8nWorkflow {
  if (input.workflow) {
    const parsed = parseWorkflowString(JSON.stringify(input.workflow));
    if (!parsed.success || !parsed.workflow)
      throw new Error(parsed.error ?? 'Invalid inline workflow.');
    return parsed.workflow;
  }
  if (input.path) {
    const parsed = parseWorkflowFile(input.path);
    if (!parsed.success || !parsed.workflow)
      throw new Error(parsed.error ?? `Unable to parse workflow at ${input.path}`);
    return parsed.workflow;
  }
  throw new Error('Provide either workflow or path.');
}

function loadWorkflowPair(input: DiffInput, side: 'old' | 'new'): N8nWorkflow {
  const workflow = side === 'old' ? input.oldWorkflow : input.newWorkflow;
  const workflowPath = side === 'old' ? input.oldPath : input.newPath;
  return loadWorkflowInput({ workflow, path: workflowPath });
}
