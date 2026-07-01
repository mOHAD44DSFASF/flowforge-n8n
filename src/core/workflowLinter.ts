import { N8nWorkflow } from './workflowSchema.js';

export interface LintIssue {
  ruleId: string;
  severity: 'warning' | 'error';
  message: string;
  nodeName?: string;
  nodeId?: string;
}

function hasAuthorizationHeader(parameters: Record<string, unknown> | undefined): boolean {
  const headers = parameters?.headers;
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return false;
  }

  const parameter = (headers as { parameter?: unknown }).parameter;
  if (!Array.isArray(parameter)) {
    return false;
  }

  return parameter.some((header) => {
    if (!header || typeof header !== 'object' || Array.isArray(header)) {
      return false;
    }
    const name = (header as { name?: unknown }).name;
    return typeof name === 'string' && name.toLowerCase() === 'authorization';
  });
}

function getBooleanParam(parameters: Record<string, unknown> | undefined, key: string): boolean | undefined {
  const value = parameters?.[key];
  return typeof value === 'boolean' ? value : undefined;
}

function getStringParam(parameters: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = parameters?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function lintWorkflow(workflow: N8nWorkflow): LintIssue[] {
  const issues: LintIssue[] = [];
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};

  const nodeNames = nodes.map((n) => n.name);
  const defaultNames = ['Set', 'Code', 'IF', 'HTTP Request', 'Webhook', 'Slack', 'Google Sheets', 'Airtable', 'Gmail', 'NoOp', 'Switch'];

  // Check unique node count to see if it is a large workflow without sticky notes
  const hasStickyNote = nodes.some((n) => n.type === 'n8n-nodes-base.stickyNote');
  if (nodes.length > 25 && !hasStickyNote) {
    issues.push({
      ruleId: 'MNT-SIZE',
      severity: 'warning',
      message: `Workflow is large (${nodes.length} nodes) and does not contain any sticky notes/annotations to explain execution flow.`
    });
  }

  // Set connections maps to see where nodes connect to
  const targets = new Set<string>();
  const sources = new Set<string>();
  let hasRespondToWebhook = false;
  let hasWebhook = false;

  for (const [sourceName, sourceConns] of Object.entries(connections)) {
    sources.add(sourceName);
    if (sourceConns && sourceConns.main) {
      for (const branch of sourceConns.main) {
        if (!Array.isArray(branch)) continue;
        for (const conn of branch) {
          targets.add(conn.node);
        }
      }
    }
  }

  for (const node of nodes) {
    if (node.type === 'n8n-nodes-base.webhook') {
      hasWebhook = true;
    }
    if (node.type === 'n8n-nodes-base.respondToWebhook') {
      hasRespondToWebhook = true;
    }

    // 1. Descriptive names checks
    const matchDefault = defaultNames.some(
      (defName) => node.name.toLowerCase() === defName.toLowerCase() || node.name.match(new RegExp(`^${defName}\\s*\\d*$`, 'i'))
    );
    if (matchDefault) {
      issues.push({
        ruleId: 'MNT-NAMING',
        severity: 'warning',
        message: `Node "${node.name}" uses an ambiguous default name. Provide a description of what this node does instead.`,
        nodeId: node.id,
        nodeName: node.name
      });
    }

    // 2. HTTP Request check (credentials vs hardcoded auth)
    if (node.type === 'n8n-nodes-base.httpRequest') {
      if (hasAuthorizationHeader(node.parameters)) {
        issues.push({
          ruleId: 'SEC-AUTH-HEADER',
          severity: 'warning',
          message: `HTTP Request node "${node.name}" contains a hardcoded Authorization header. Rely on n8n Credentials configurations instead.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }

      // Check on-error/retry settings
      const onError = getStringParam(node.parameters, 'onError');
      const retryOnFail = getBooleanParam(node.parameters, 'retryOnFail');
      if (!onError && !retryOnFail) {
        issues.push({
          ruleId: 'REL-ERROR-HANDLING',
          severity: 'warning',
          message: `External HTTP Request node "${node.name}" does not have retry/error handling strategies defined.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }

    // 3. Email/Gmail specific warnings
    if (node.type === 'n8n-nodes-base.gmail' || node.type === 'n8n-nodes-base.emailSend') {
      const onError = getStringParam(node.parameters, 'onError');
      if (!onError) {
        issues.push({
          ruleId: 'REL-EXTERNAL-INTEGRATION',
          severity: 'warning',
          message: `External messaging node "${node.name}" lacks failure path fallback handling.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }

    // 4. Code node size warnings
    if (node.type === 'n8n-nodes-base.code') {
      const codeStr = getStringParam(node.parameters, 'jsCode') || '';
      if (codeStr.length > 2000) {
        issues.push({
          ruleId: 'MNT-CODE-COMPLEXITY',
          severity: 'warning',
          message: `Code node "${node.name}" contains very large scripts (${codeStr.length} chars). Consider refactoring this logic into standard nodes or a custom node package.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }

    // 5. Check orphan / disconnected branches
    const isSource = sources.has(node.name);
    const isTarget = targets.has(node.name);
    if (!isSource && !isTarget) {
      issues.push({
        ruleId: 'REL-ORPHAN-BRANCH',
        severity: 'warning',
        message: `Orphan branch detected: Node "${node.name}" is not connected to any other node.`,
        nodeId: node.id,
        nodeName: node.name
      });
    }
  }

  // 6. Webhook responds checks
  if (hasWebhook && !hasRespondToWebhook) {
    issues.push({
      ruleId: 'REL-WEBHOOK-RESPONSE',
      severity: 'warning',
      message: 'Webhook trigger node is present but no "Respond to Webhook" node exists. The caller will receive a default response rather than a custom JSON body.'
    });
  }

  return issues;
}
