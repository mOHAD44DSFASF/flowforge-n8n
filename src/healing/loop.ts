import fs from 'node:fs';
import path from 'node:path';
import { runAnalysis } from '../analysis/engine.js';
import { loadConfig } from '../core/config.js';
import { Finding } from '../core/findings.js';
import { assertOnline } from '../core/offline.js';
import { parseWorkflowFile } from '../core/workflowParser.js';
import { validateWorkflowSemantics } from '../core/semanticValidator.js';
import { diffWorkflows } from '../core/workflowDiff.js';
import { validateWorkflow } from '../core/workflowValidator.js';
import { N8nWorkflow } from '../core/workflowSchema.js';
import { checkLiveN8n } from '../live/n8nClient.js';
import { runFlowForgeTests } from '../testing/runner.js';
import { TestRunSummary } from '../testing/types.js';
import { applyFindingFix } from './fixes.js';
import { HealIteration, HealOptions, HealReport, HealResult } from './types.js';

interface HealEvidence {
  findings: Finding[];
  testSummary?: TestRunSummary;
}

export async function healWorkflowFile(
  filePath: string,
  options: HealOptions = {}
): Promise<HealResult> {
  if (options.live) assertOnline('live healing');

  const parsed = parseWorkflowFile(filePath);
  if (!parsed.success || !parsed.workflow) {
    throw new Error(parsed.error ?? `Unable to parse workflow file: ${filePath}`);
  }

  const sourceFile = path.resolve(filePath);
  return healWorkflow(parsed.workflow, sourceFile, options);
}

export async function healWorkflow(
  workflow: N8nWorkflow,
  sourceFile = '<inline>',
  options: HealOptions = {}
): Promise<HealResult> {
  if (options.live) {
    assertOnline('live healing');
    await checkLiveN8n('live healing');
  }

  const maxIterations = options.maxIterations ?? 5;
  const originalWorkflow = workflow;
  let currentWorkflow = structuredClone(originalWorkflow) as N8nWorkflow;
  const iterations: HealIteration[] = [];
  let changed = false;

  for (let index = 0; index < maxIterations; index += 1) {
    const before = await collectHealEvidence(currentWorkflow, sourceFile, options);
    const selected = pickFix(before.findings);
    if (!selected) break;

    const beforeWorkflow = structuredClone(currentWorkflow) as N8nWorkflow;
    const applied = applyFindingFix(currentWorkflow, selected);
    const after = await collectHealEvidence(applied.workflow, sourceFile, options);
    const diff = diffWorkflows(beforeWorkflow, applied.workflow);

    currentWorkflow = applied.workflow;
    changed = changed || applied.applied.changed;
    iterations.push({
      iteration: index + 1,
      finding: selected,
      rationale: applied.applied.rationale,
      changed: applied.applied.changed,
      beforeFindings: before.findings,
      afterFindings: after.findings,
      beforeTestSummary: before.testSummary,
      afterTestSummary: after.testSummary,
      diff
    });

    if (!applied.applied.changed) break;
  }

  const final = await collectHealEvidence(currentWorkflow, sourceFile, options);
  const report: HealReport = {
    sourceFile,
    outputFile: resolveOutputFile(sourceFile, options),
    writeMode: options.dryRun ? 'dry-run' : options.write ? 'in-place' : 'copy',
    maxIterations,
    iterations,
    finalFindings: final.findings,
    finalTestSummary: final.testSummary,
    changed,
    converged: pickFix(final.findings) === undefined
  };

  return { workflow: currentWorkflow, report };
}

export function writeHealResult(
  filePath: string,
  result: HealResult,
  options: HealOptions = {}
): { workflowPath?: string; reportPath: string } {
  const sourceFile = path.resolve(filePath);
  const reportPath = path.join(path.dirname(sourceFile), 'heal-report.json');

  if (!options.dryRun) {
    const workflowPath = resolveOutputFile(sourceFile, options);
    if (!workflowPath) throw new Error('Unable to resolve healed workflow path.');
    fs.writeFileSync(workflowPath, `${JSON.stringify(result.workflow, null, 2)}\n`);
    result.report.outputFile = workflowPath;
  }

  fs.writeFileSync(reportPath, `${JSON.stringify(result.report, null, 2)}\n`);
  return { workflowPath: options.dryRun ? undefined : result.report.outputFile, reportPath };
}

export function collectHealFindings(workflow: N8nWorkflow): Finding[] {
  const config = loadConfig().config;
  const shapeReport = validateWorkflow(workflow);
  return [
    ...shapeReport.findings,
    ...validateWorkflowSemantics(workflow),
    ...runAnalysis(workflow, { config }).findings
  ].filter((finding) => finding.severity !== 'info');
}

async function collectHealEvidence(
  workflow: N8nWorkflow,
  sourceFile: string,
  options: HealOptions
): Promise<HealEvidence> {
  const findings = collectHealFindings(workflow);
  const testSummary = await runSiblingTests(sourceFile, options);
  if (testSummary && testSummary.failed > 0) {
    findings.push({
      code: 'TEST-FAILED',
      severity: 'error',
      category: 'testing',
      message: `${testSummary.failed} regression test case(s) failed during healing.`
    });
  }
  return { findings, testSummary };
}

async function runSiblingTests(
  sourceFile: string,
  options: HealOptions
): Promise<TestRunSummary | undefined> {
  if (sourceFile === '<inline>') return undefined;
  const cwd = path.dirname(path.resolve(sourceFile));
  const result = await runFlowForgeTests('*.flowforge.test.json', {
    cwd,
    live: options.live,
    allowEmpty: true
  });
  return result.summary;
}

function pickFix(findings: Finding[]): Finding | undefined {
  const priority = [
    'SEM-INVALID-TYPE-VERSION',
    'SEM-OUTDATED-TYPE-VERSION',
    'SEM-UNKNOWN-PARAM',
    'SEM-MISSING-REQUIRED-PARAM',
    'REL-NO-ERROR-HANDLING',
    'REL-ERROR-HANDLING'
  ];

  return findings
    .filter((finding) => finding.fix)
    .sort((a, b) => priorityIndex(priority, a.code) - priorityIndex(priority, b.code))[0];
}

function priorityIndex(priority: string[], code: string): number {
  const index = priority.indexOf(code);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function resolveOutputFile(sourceFile: string, options: HealOptions): string | undefined {
  if (options.dryRun) return undefined;
  if (options.write) return sourceFile;
  const parsed = path.parse(sourceFile);
  return path.join(parsed.dir, `${parsed.name}.healed${parsed.ext}`);
}
