import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { runAnalysis } from '../analysis/engine.js';
import { loadConfig } from '../core/config.js';
import { Finding } from '../core/findings.js';
import { parseWorkflowFile } from '../core/workflowParser.js';
import { validateWorkflowSemantics } from '../core/semanticValidator.js';
import { validateWorkflow } from '../core/workflowValidator.js';
import { runFlowForgeTests } from '../testing/runner.js';
import { renderJUnitReport } from '../testing/reporters/junit.js';

export interface OfflineCiResult {
  workflowsChecked: number;
  findings: Finding[];
  testSummary: {
    cases: number;
    failed: number;
  };
  reportPath: string;
  junitPath: string;
  success: boolean;
}

export async function runOfflineCi(dir = '.'): Promise<OfflineCiResult> {
  process.env.FLOWFORGE_OFFLINE = '1';
  const root = path.resolve(dir);
  const workflowFiles = await fg('**/*.json', {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    ignore: [
      'node_modules/**',
      'dist/**',
      '.flowforge/**',
      'tmp/**',
      '.claude/**',
      '.claude-plugin/**',
      '.github/**',
      'agents/**',
      'commands/**',
      'hooks/**',
      'schemas/**',
      'skills/**',
      'src/catalog/data/**',
      'templates/**',
      'tests/fixtures/**',
      '**/__snapshots__/**',
      '**/*.flowforge.test.json',
      '**/*.flowforge.eval.json',
      '**/package.json',
      '**/tsconfig.json'
    ]
  });
  const config = loadConfig(root).config;
  const findings: Finding[] = [];

  for (const file of workflowFiles) {
    const parsed = parseWorkflowFile(file);
    if (!parsed.success || !parsed.workflow) {
      findings.push({
        code: 'CI-WORKFLOW-INVALID',
        severity: 'error',
        category: 'schema',
        message: `Workflow file "${path.relative(root, file)}" could not be parsed or validated.`,
        detail: parsed.error
      });
      continue;
    }
    findings.push(
      ...validateWorkflow(parsed.workflow).findings,
      ...validateWorkflowSemantics(parsed.workflow),
      ...runAnalysis(parsed.workflow, { config }).findings
    );
  }

  const tests = await runFlowForgeTests('**/*.flowforge.test.json', { live: false, cwd: root });
  const reportDir = path.join(process.cwd(), '.flowforge', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const junitPath = path.join(reportDir, 'flowforge-ci-junit.xml');
  const reportPath = path.join(reportDir, 'flowforge-ci-report.json');
  fs.writeFileSync(junitPath, renderJUnitReport(tests));

  const failingFindings = findings.filter(
    (finding) => finding.severity === 'error' || finding.category === 'security'
  );
  const result: OfflineCiResult = {
    workflowsChecked: workflowFiles.length,
    findings,
    testSummary: {
      cases: tests.summary.cases,
      failed: tests.summary.failed
    },
    reportPath,
    junitPath,
    success: failingFindings.length === 0 && tests.summary.failed === 0
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
