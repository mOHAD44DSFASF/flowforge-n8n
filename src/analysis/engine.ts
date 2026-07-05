import {
  applyRuleSeverityOverride,
  FlowForgeConfig,
  isRuleEnabled,
  loadConfig
} from '../core/config.js';
import { Finding, sortFindings } from '../core/findings.js';
import { N8nWorkflow } from '../core/workflowSchema.js';
import { allRules } from './rules/index.js';
import { AnalysisReport, AnalysisRule } from './types.js';

export interface RunAnalysisOptions {
  config?: FlowForgeConfig;
  rules?: AnalysisRule[];
}

export function runAnalysis(
  workflow: N8nWorkflow,
  options: RunAnalysisOptions = {}
): AnalysisReport {
  const config = options.config ?? loadConfig().config;
  const rules = options.rules ?? allRules;
  const findings: Finding[] = [];

  for (const rule of rules) {
    if (!isRuleEnabled(config, rule.code)) continue;

    for (const finding of rule.run({
      workflow,
      config,
      nodes: workflow.nodes,
      connections: workflow.connections
    })) {
      const severity = applyRuleSeverityOverride(config, finding.code, finding.severity);
      findings.push({ ...finding, severity });
    }
  }

  const sorted = sortFindings(findings);
  return {
    findings: sorted,
    summary: {
      total: sorted.length,
      error: sorted.filter((finding) => finding.severity === 'error').length,
      warning: sorted.filter((finding) => finding.severity === 'warning').length,
      info: sorted.filter((finding) => finding.severity === 'info').length
    }
  };
}
