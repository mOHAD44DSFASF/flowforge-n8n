import { Finding } from '../../core/findings.js';
import { getBooleanParam, getIncomingCounts, getStringParam } from '../helpers.js';
import { AnalysisRule } from '../types.js';

export const noErrorHandlingRule: AnalysisRule = {
  code: 'REL-NO-ERROR-HANDLING',
  description: 'External action nodes should define retry or error handling.',
  run({ nodes }) {
    const findings: Finding[] = [];
    for (const node of nodes) {
      const isExternal =
        node.type === 'n8n-nodes-base.httpRequest' ||
        node.type === 'n8n-nodes-base.gmail' ||
        node.type === 'n8n-nodes-base.emailSend';
      if (!isExternal) continue;

      const onError = getStringParam(node.parameters, 'onError') ?? node.onError;
      const retryOnFail = getBooleanParam(node.parameters, 'retryOnFail') ?? node.retryOnFail;
      if (onError || retryOnFail) continue;

      findings.push({
        code: 'REL-NO-ERROR-HANDLING',
        severity: 'warning',
        category: 'reliability',
        message: `External node "${node.name}" does not define retry or error handling.`,
        nodeId: node.id,
        nodeName: node.name,
        fix: {
          kind: 'set-node-property',
          path: `/nodes/${node.name}/retryOnFail`,
          value: true,
          rationale: 'Enable retry handling for transient external failures.'
        }
      });
    }
    return findings;
  }
};

export const non2xxSuccessRule: AnalysisRule = {
  code: 'REL-NON-2XX-SUCCESS',
  description:
    'HTTP Request nodes should not treat non-2xx responses as success without an explicit failure path.',
  run({ nodes }) {
    return nodes
      .filter((node) => node.type === 'n8n-nodes-base.httpRequest')
      .filter(
        (node) =>
          getBooleanParam(node.parameters, 'ignoreResponseCode') === true ||
          getBooleanParam(node.parameters, 'neverError') === true
      )
      .map((node) => ({
        code: 'REL-NON-2XX-SUCCESS',
        severity: 'warning',
        category: 'reliability',
        message: `HTTP Request node "${node.name}" treats non-2xx responses as successful.`,
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};

export const unboundedPaginationRule: AnalysisRule = {
  code: 'REL-UNBOUNDED-PAGINATION',
  description: 'Pagination should have an explicit limit or termination guard.',
  run({ nodes }) {
    return nodes
      .filter((node) => node.type === 'n8n-nodes-base.httpRequest')
      .filter((node) => {
        const options = node.parameters?.options;
        const pagination =
          node.parameters?.pagination ??
          (options && typeof options === 'object'
            ? (options as Record<string, unknown>).pagination
            : undefined);
        if (!pagination) return false;
        const limit = node.parameters?.limit ?? node.parameters?.maxRequests;
        return limit === undefined;
      })
      .map((node) => ({
        code: 'REL-UNBOUNDED-PAGINATION',
        severity: 'warning',
        category: 'reliability',
        message: `HTTP Request node "${node.name}" enables pagination without an explicit request limit.`,
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};

export const missingWebhookResponseRule: AnalysisRule = {
  code: 'REL-MISSING-WEBHOOK-RESPONSE',
  description: 'Webhook workflows should explicitly respond to callers.',
  run({ nodes }) {
    const hasWebhook = nodes.some((node) => node.type === 'n8n-nodes-base.webhook');
    const hasRespond = nodes.some((node) => node.type === 'n8n-nodes-base.respondToWebhook');
    if (!hasWebhook || hasRespond) return [];
    return [
      {
        code: 'REL-MISSING-WEBHOOK-RESPONSE',
        severity: 'warning',
        category: 'reliability',
        message: 'Webhook trigger node is present but no Respond to Webhook node exists.'
      }
    ];
  }
};

export const raceConditionRule: AnalysisRule = {
  code: 'REL-RACE-CONDITION',
  description: 'Multiple branches joining stateful nodes can create race-prone side effects.',
  run({ nodes, connections }) {
    const incomingCounts = getIncomingCounts(connections);
    return nodes
      .filter((node) => (incomingCounts.get(node.name) ?? 0) > 1)
      .filter(
        (node) =>
          node.type === 'n8n-nodes-base.httpRequest' ||
          node.type.includes('sheets') ||
          node.type.includes('database')
      )
      .map((node) => ({
        code: 'REL-RACE-CONDITION',
        severity: 'warning',
        category: 'reliability',
        message: `Node "${node.name}" has multiple incoming branches and may perform race-prone side effects.`,
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};
