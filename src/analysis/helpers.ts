import { Finding } from '../core/findings.js';
import { N8nWorkflow, WorkflowNode } from '../core/workflowSchema.js';

export function getStringParam(
  parameters: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = parameters?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function getBooleanParam(
  parameters: Record<string, unknown> | undefined,
  key: string
): boolean | undefined {
  const value = parameters?.[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function hasAuthorizationHeader(parameters: Record<string, unknown> | undefined): boolean {
  const headers = parameters?.headers;
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return false;

  const parameter = (headers as { parameter?: unknown }).parameter;
  if (!Array.isArray(parameter)) return false;

  return parameter.some((header) => {
    if (!header || typeof header !== 'object' || Array.isArray(header)) return false;
    const name = (header as { name?: unknown }).name;
    return typeof name === 'string' && name.toLowerCase() === 'authorization';
  });
}

export function getNodeTargets(connections: N8nWorkflow['connections']): Set<string> {
  const targets = new Set<string>();
  for (const sourceConns of Object.values(connections)) {
    for (const branch of sourceConns.main ?? []) {
      if (!Array.isArray(branch)) continue;
      for (const conn of branch) targets.add(conn.node);
    }
  }
  return targets;
}

export function getNodeSources(connections: N8nWorkflow['connections']): Set<string> {
  return new Set(Object.keys(connections));
}

export function getIncomingCounts(connections: N8nWorkflow['connections']): Map<string, number> {
  const counts = new Map<string, number>();
  for (const sourceConns of Object.values(connections)) {
    for (const branch of sourceConns.main ?? []) {
      if (!Array.isArray(branch)) continue;
      for (const conn of branch) counts.set(conn.node, (counts.get(conn.node) ?? 0) + 1);
    }
  }
  return counts;
}

export function hasUpstreamNodeType(
  workflow: N8nWorkflow,
  startNodeName: string,
  predicate: (node: WorkflowNode) => boolean,
  seen = new Set<string>()
): boolean {
  if (seen.has(startNodeName)) return false;
  seen.add(startNodeName);

  for (const [sourceName, sourceConns] of Object.entries(workflow.connections)) {
    const connectsToStart = (sourceConns.main ?? []).some(
      (branch) =>
        Array.isArray(branch) && branch.some((connection) => connection.node === startNodeName)
    );
    if (!connectsToStart) continue;

    const sourceNode = workflow.nodes.find((node) => node.name === sourceName);
    if (sourceNode && predicate(sourceNode)) return true;
    if (sourceNode && hasUpstreamNodeType(workflow, sourceName, predicate, seen)) return true;
  }

  return false;
}

export function secretFindingForNode(node: WorkflowNode): Finding | undefined {
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]{24,}/,
    /sk_test_[a-zA-Z0-9]{24,}/,
    /xoxb-[a-zA-Z0-9-]{10,}/,
    /xoxp-[a-zA-Z0-9-]{10,}/,
    /ghp_[a-zA-Z0-9]{36}/,
    /github_pat_[a-zA-Z0-9_]{50,}/,
    /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/i
  ];
  const params = JSON.stringify(node.parameters ?? {});
  if (!secretPatterns.some((pattern) => pattern.test(params))) return undefined;

  return {
    code: 'SEC-HARDCODED-SECRET',
    severity: 'error',
    category: 'security',
    message: `Node "${node.name}" contains hardcoded secret-like material.`,
    nodeId: node.id,
    nodeName: node.name,
    fix: {
      kind: 'set-param',
      path: `/nodes/${node.name}/credentials`,
      value: '**CREDENTIAL_PLACEHOLDER**',
      rationale: 'Move secret material into n8n credentials.'
    }
  };
}

export function isLlmNode(node: WorkflowNode): boolean {
  const type = node.type.toLowerCase();
  return (
    type.includes('langchain') ||
    type.includes('openai') ||
    type.includes('lmchat') ||
    type.includes('agent')
  );
}
