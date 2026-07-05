import { runAnalysis } from '../analysis/engine.js';
import { loadConfig } from './config.js';
import { Finding } from './findings.js';
import { diffWorkflows, DiffReport } from './workflowDiff.js';
import { N8nWorkflow } from './workflowSchema.js';

export interface SemanticDiffReport extends DiffReport {
  changedCredentials: string[];
  changedTypeVersions: string[];
  changedBranchLogic: string[];
  behavioralSummary: string[];
}

export interface ReviewReport {
  diff: SemanticDiffReport;
  introducedFindings: Finding[];
  costImpact: {
    before: number;
    after: number;
    delta: number;
  };
  failingTests: string[];
}

export function semanticDiffWorkflows(
  oldWorkflow: N8nWorkflow,
  newWorkflow: N8nWorkflow
): SemanticDiffReport {
  const structural = diffWorkflows(oldWorkflow, newWorkflow);
  const oldNodes = new Map(oldWorkflow.nodes.map((node) => [node.name, node]));
  const changedCredentials: string[] = [];
  const changedTypeVersions: string[] = [];
  const changedBranchLogic: string[] = [];

  for (const node of newWorkflow.nodes) {
    const oldNode = oldNodes.get(node.name);
    if (!oldNode) continue;

    if (JSON.stringify(oldNode.credentials ?? {}) !== JSON.stringify(node.credentials ?? {})) {
      changedCredentials.push(node.name);
    }
    if (oldNode.typeVersion !== node.typeVersion) {
      changedTypeVersions.push(`${node.name}: v${oldNode.typeVersion} -> v${node.typeVersion}`);
    }
    if (
      (node.type === 'n8n-nodes-base.if' ||
        node.type === 'n8n-nodes-base.switch' ||
        node.type === 'n8n-nodes-base.filter') &&
      JSON.stringify(oldNode.parameters ?? {}) !== JSON.stringify(node.parameters ?? {})
    ) {
      changedBranchLogic.push(node.name);
    }
  }

  return {
    ...structural,
    changedCredentials,
    changedTypeVersions,
    changedBranchLogic,
    behavioralSummary: summarizeBehavior(
      structural,
      changedCredentials,
      changedTypeVersions,
      changedBranchLogic
    )
  };
}

export function reviewWorkflows(oldWorkflow: N8nWorkflow, newWorkflow: N8nWorkflow): ReviewReport {
  const config = loadConfig().config;
  const beforeFindings = runAnalysis(oldWorkflow, { config }).findings;
  const afterFindings = runAnalysis(newWorkflow, { config }).findings;
  const beforeKeys = new Set(beforeFindings.map(findingKey));
  const introducedFindings = afterFindings.filter(
    (finding) => !beforeKeys.has(findingKey(finding))
  );
  const beforeCost = beforeFindings.filter((finding) => finding.category === 'cost').length;
  const afterCost = afterFindings.filter((finding) => finding.category === 'cost').length;

  return {
    diff: semanticDiffWorkflows(oldWorkflow, newWorkflow),
    introducedFindings,
    costImpact: {
      before: beforeCost,
      after: afterCost,
      delta: afterCost - beforeCost
    },
    failingTests: []
  };
}

export function renderSemanticDiffMarkdown(report: SemanticDiffReport): string {
  const lines = ['# FlowForge Semantic Diff', ''];
  pushList(lines, 'Added nodes', report.addedNodes);
  pushList(lines, 'Removed nodes', report.removedNodes);
  pushList(
    lines,
    'Modified nodes',
    report.modifiedNodes.map((node) => `${node.name}: ${node.changes.join('; ')}`)
  );
  pushList(lines, 'Added connections', report.addedConnections);
  pushList(lines, 'Removed connections', report.removedConnections);
  pushList(lines, 'Credential changes', report.changedCredentials);
  pushList(lines, 'Type version changes', report.changedTypeVersions);
  pushList(lines, 'Branch logic changes', report.changedBranchLogic);
  pushList(lines, 'Behavioral summary', report.behavioralSummary);
  return `${lines.join('\n')}\n`;
}

export function renderReviewMarkdown(report: ReviewReport): string {
  const lines = [
    '# FlowForge Review',
    '',
    renderSemanticDiffMarkdown(report.diff),
    '## Introduced Findings'
  ];
  if (report.introducedFindings.length === 0) {
    lines.push('', '- None');
  } else {
    lines.push(
      '',
      ...report.introducedFindings.map(
        (finding) => `- **${finding.severity}** ${finding.code}: ${finding.message}`
      )
    );
  }
  lines.push('', '## Cost Impact', '', `- Before cost findings: ${report.costImpact.before}`);
  lines.push(`- After cost findings: ${report.costImpact.after}`);
  lines.push(`- Delta: ${report.costImpact.delta}`);
  lines.push('', '## Failing Tests', '');
  lines.push(
    ...(report.failingTests.length === 0
      ? ['- Not run or none failed']
      : report.failingTests.map((test) => `- ${test}`))
  );
  return `${lines.join('\n')}\n`;
}

function summarizeBehavior(
  diff: DiffReport,
  credentials: string[],
  versions: string[],
  branches: string[]
): string[] {
  const summary: string[] = [];
  if (diff.addedNodes.length > 0)
    summary.push(`${diff.addedNodes.length} node(s) added to execution surface.`);
  if (diff.removedNodes.length > 0)
    summary.push(`${diff.removedNodes.length} node(s) removed from execution surface.`);
  if (diff.addedConnections.length || diff.removedConnections.length)
    summary.push('Execution routing changed.');
  if (credentials.length > 0) summary.push('Credential references changed.');
  if (versions.length > 0) summary.push('Node runtime versions changed.');
  if (branches.length > 0) summary.push('Branching logic changed.');
  if (summary.length === 0) summary.push('No behavioral changes detected.');
  return summary;
}

function pushList(lines: string[], title: string, items: string[]): void {
  lines.push(`## ${title}`, '');
  lines.push(...(items.length === 0 ? ['- None'] : items.map((item) => `- ${item}`)), '');
}

function findingKey(finding: Finding): string {
  return `${finding.code}|${finding.nodeName ?? ''}|${finding.message}`;
}
