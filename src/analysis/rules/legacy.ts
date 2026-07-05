import { Finding } from '../../core/findings.js';
import { getNodeSources, getNodeTargets, getStringParam } from '../helpers.js';
import { AnalysisRule } from '../types.js';

const defaultNames = [
  'Set',
  'Code',
  'IF',
  'HTTP Request',
  'Webhook',
  'Slack',
  'Google Sheets',
  'Airtable',
  'Gmail',
  'NoOp',
  'Switch'
];

export const legacyMaintainabilityRule: AnalysisRule = {
  code: 'MNT-LEGACY',
  description: 'Preserves v0.1 lint checks for naming, size, code complexity, and orphan branches.',
  run({ nodes, connections }) {
    const findings: Finding[] = [];
    const hasStickyNote = nodes.some((node) => node.type === 'n8n-nodes-base.stickyNote');
    if (nodes.length > 25 && !hasStickyNote) {
      findings.push({
        code: 'MNT-SIZE',
        severity: 'warning',
        category: 'maintainability',
        message: `Workflow is large (${nodes.length} nodes) and does not contain any sticky notes/annotations to explain execution flow.`
      });
    }

    const sources = getNodeSources(connections);
    const targets = getNodeTargets(connections);

    for (const node of nodes) {
      const matchDefault = defaultNames.some(
        (defaultName) =>
          node.name.toLowerCase() === defaultName.toLowerCase() ||
          node.name.match(new RegExp(`^${defaultName}\\s*\\d*$`, 'i'))
      );
      if (matchDefault) {
        findings.push({
          code: 'MNT-NAMING',
          severity: 'warning',
          category: 'maintainability',
          message: `Node "${node.name}" uses an ambiguous default name. Provide a description of what this node does instead.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }

      if (node.type === 'n8n-nodes-base.code') {
        const code = getStringParam(node.parameters, 'jsCode') ?? '';
        if (code.length > 2000) {
          findings.push({
            code: 'MNT-CODE-COMPLEXITY',
            severity: 'warning',
            category: 'maintainability',
            message: `Code node "${node.name}" contains very large scripts (${code.length} chars). Consider refactoring this logic into standard nodes or a custom node package.`,
            nodeId: node.id,
            nodeName: node.name
          });
        }
      }

      if (!sources.has(node.name) && !targets.has(node.name)) {
        findings.push({
          code: 'REL-ORPHAN-BRANCH',
          severity: 'warning',
          category: 'reliability',
          message: `Orphan branch detected: Node "${node.name}" is not connected to any other node.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }

    return findings;
  }
};

export const legacyWebhookResponseAliasRule: AnalysisRule = {
  code: 'REL-WEBHOOK-RESPONSE',
  description: 'Preserves the v0.1 webhook response rule id.',
  run({ nodes }) {
    const hasWebhook = nodes.some((node) => node.type === 'n8n-nodes-base.webhook');
    const hasRespond = nodes.some((node) => node.type === 'n8n-nodes-base.respondToWebhook');
    if (!hasWebhook || hasRespond) return [];
    return [
      {
        code: 'REL-WEBHOOK-RESPONSE',
        severity: 'warning',
        category: 'reliability',
        message:
          'Webhook trigger node is present but no "Respond to Webhook" node exists. The caller will receive a default response rather than a custom JSON body.'
      }
    ];
  }
};

export const legacyErrorHandlingAliasRule: AnalysisRule = {
  code: 'REL-ERROR-HANDLING',
  description: 'Preserves the v0.1 HTTP Request error handling rule id.',
  run({ nodes }) {
    return nodes
      .filter((node) => node.type === 'n8n-nodes-base.httpRequest')
      .filter(
        (node) =>
          !node.parameters?.onError &&
          !node.parameters?.retryOnFail &&
          !node.onError &&
          !node.retryOnFail
      )
      .map((node) => ({
        code: 'REL-ERROR-HANDLING',
        severity: 'warning',
        category: 'reliability',
        message: `External HTTP Request node "${node.name}" does not have retry/error handling strategies defined.`,
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};
