import { runAnalysis } from '../analysis/engine.js';
import { FlowForgeConfig } from './config.js';
import {
  Finding,
  FindingCategory,
  FindingFix,
  FindingSeverity,
  severityMeetsThreshold
} from './findings.js';
import { N8nWorkflow } from './workflowSchema.js';

export interface LintIssue {
  ruleId: string;
  severity: 'warning' | 'error';
  message: string;
  nodeName?: string;
  nodeId?: string;
  category?: FindingCategory;
  fix?: FindingFix;
  detail?: string;
}

export interface LintWorkflowOptions {
  config?: FlowForgeConfig;
  minSeverity?: FindingSeverity;
}

export function lintIssueToFinding(issue: LintIssue): Finding {
  return {
    code: issue.ruleId,
    severity: issue.severity,
    category: issue.category ?? 'maintainability',
    message: issue.message,
    nodeId: issue.nodeId,
    nodeName: issue.nodeName,
    detail: issue.detail,
    fix: issue.fix
  };
}

export function findingToLintIssue(finding: Finding): LintIssue | undefined {
  if (finding.severity === 'info') return undefined;
  return {
    ruleId: finding.code,
    severity: finding.severity,
    category: finding.category,
    message: finding.message,
    nodeId: finding.nodeId,
    nodeName: finding.nodeName,
    detail: finding.detail,
    fix: finding.fix
  };
}

export function lintWorkflow(
  workflow: N8nWorkflow,
  options: LintWorkflowOptions = {}
): LintIssue[] {
  const findings = lintWorkflowFindings(workflow, options);
  return findings.map(findingToLintIssue).filter((issue): issue is LintIssue => Boolean(issue));
}

export function lintWorkflowFindings(
  workflow: N8nWorkflow,
  options: LintWorkflowOptions = {}
): Finding[] {
  const findings = runAnalysis(workflow, { config: options.config }).findings;
  if (!options.minSeverity) return findings;
  return findings.filter((finding) =>
    severityMeetsThreshold(finding.severity, options.minSeverity!)
  );
}
