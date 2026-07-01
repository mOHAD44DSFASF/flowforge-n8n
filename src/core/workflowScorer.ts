import { N8nWorkflow } from './workflowSchema.js';

export interface ScoreBreakdown {
  reliability: number; // Max 25
  security: number;    // Max 25
  testability: number; // Max 20
  maintainability: number; // Max 20
  documentation: number; // Max 10
  total: number;
}

export interface ScoreReport {
  score: ScoreBreakdown;
  recommendations: string[];
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

export function scoreWorkflow(workflow: N8nWorkflow): ScoreReport {
  const recommendations: string[] = [];
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};

  // Default max scores
  let reliability = 25;
  let security = 25;
  let testability = 20;
  let maintainability = 20;
  let documentation = 10;

  // 1. Reliability (Max 25)
  // Check for disconnected nodes
  const targets = new Set<string>();
  const sources = new Set<string>();
  let hasWebhook = false;
  let hasRespondToWebhook = false;

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

  let hasDisconnected = false;
  nodes.forEach((n) => {
    const isSource = sources.has(n.name);
    const isTarget = targets.has(n.name);
    if (!isSource && !isTarget) {
      hasDisconnected = true;
    }

    if (n.type === 'n8n-nodes-base.webhook') hasWebhook = true;
    if (n.type === 'n8n-nodes-base.respondToWebhook') hasRespondToWebhook = true;

    // HTTP integrations missing error options
    if (n.type === 'n8n-nodes-base.httpRequest') {
      const onError = getStringParam(n.parameters, 'onError');
      const retryOnFail = getBooleanParam(n.parameters, 'retryOnFail');
      if (!onError && !retryOnFail) {
        reliability -= 5; // Deduct up to 10
        recommendations.push(`Add retry or on-error capture to HTTP node: "${n.name}".`);
      }
    }
  });

  if (hasDisconnected) {
    reliability -= 5;
    recommendations.push('Connect or remove disconnected (orphan) nodes.');
  }

  if (hasWebhook && !hasRespondToWebhook) {
    reliability -= 10;
    recommendations.push('Add a "Respond to Webhook" node to return custom payloads to callers.');
  }

  reliability = Math.max(0, reliability);

  // 2. Security (Max 25)
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]{24,}/,
    /sk_test_[a-zA-Z0-9]{24,}/,
    /xoxb-[a-zA-Z0-9-]{10,}/,
    /xoxp-[a-zA-Z0-9-]{10,}/,
    /ghp_[a-zA-Z0-9]{36}/,
    /github_pat_[a-zA-Z0-9_]{82}/
  ];

  let hasSecrets = false;
  nodes.forEach((n) => {
    const paramsStr = JSON.stringify(n.parameters || {});
    for (const pattern of secretPatterns) {
      if (pattern.test(paramsStr)) {
        hasSecrets = true;
        recommendations.push(`Redact hardcoded keys in node "${n.name}" parameters.`);
        break;
      }
    }

    if (n.type === 'n8n-nodes-base.httpRequest') {
      if (hasAuthorizationHeader(n.parameters)) {
        security -= 10;
        recommendations.push(`Rely on credentials profiles instead of hardcoded Authorization header in: "${n.name}".`);
      }
    }
  });

  if (hasSecrets) {
    security -= 15;
  }

  security = Math.max(0, security);

  // 3. Testability (Max 20)
  // Having triggers that ease testing increases score
  const triggers = nodes.filter((n) => n.type.toLowerCase().includes('trigger') || n.type === 'n8n-nodes-base.webhook');
  const hasManualTrigger = nodes.some((n) => n.type === 'n8n-nodes-base.manualTrigger');
  
  if (triggers.length === 0) {
    testability -= 10;
    recommendations.push('Add a trigger node (Webhook, Manual Trigger) to make testing simple.');
  } else if (!hasManualTrigger && triggers.some(t => t.type !== 'n8n-nodes-base.manualTrigger')) {
    // If has webhook/cron triggers, but no manual test shortcut, deduct slightly
    testability -= 5;
    recommendations.push('Add a manual trigger input block to run simulations during editing.');
  }

  testability = Math.max(0, testability);

  // 4. Maintainability (Max 20)
  const defaultNames = ['Set', 'Code', 'IF', 'HTTP Request', 'Webhook', 'Slack', 'Google Sheets', 'Airtable', 'Gmail', 'NoOp', 'Switch'];
  let hasDefaultName = false;
  nodes.forEach((n) => {
    const matchDefault = defaultNames.some(
      (def) => n.name.toLowerCase() === def.toLowerCase() || n.name.match(new RegExp(`^${def}\\s*\\d*$`, 'i'))
    );
    if (matchDefault) {
      hasDefaultName = true;
    }
  });

  if (hasDefaultName) {
    maintainability -= 10;
    recommendations.push('Provide descriptive names for nodes currently using default names.');
  }

  if (nodes.length > 20) {
    const hasNotes = nodes.some((n) => n.type === 'n8n-nodes-base.stickyNote');
    if (!hasNotes) {
      maintainability -= 5;
      recommendations.push('Consider adding Sticky Notes to document large workflows.');
    }
  }

  maintainability = Math.max(0, maintainability);

  // 5. Documentation (Max 10)
  const hasSticky = nodes.some((n) => n.type === 'n8n-nodes-base.stickyNote');
  if (!hasSticky) {
    documentation -= 5;
  }
  
  const hasNotice = nodes.some((n) => n.parameters?.notes || n.parameters?.notice);
  if (!hasNotice) {
    documentation -= 5;
  }

  if (documentation < 10) {
    recommendations.push('Add annotations (sticky notes or node parameter notices) to explain logic.');
  }

  documentation = Math.max(0, documentation);

  const total = reliability + security + testability + maintainability + documentation;

  return {
    score: {
      reliability,
      security,
      testability,
      maintainability,
      documentation,
      total
    },
    recommendations
  };
}
