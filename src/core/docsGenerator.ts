import { N8nWorkflow, WorkflowNode } from './workflowSchema.js';

function getStringParam(node: WorkflowNode, key: string): string | undefined {
  const value = node.parameters?.[key];
  return typeof value === 'string' ? value : undefined;
}

function hasAuthorizationHeader(node: WorkflowNode): boolean {
  const headers = node.parameters?.headers;
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

export function generateDocs(workflow: N8nWorkflow, filename: string = 'workflow.json'): string {
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};
  const workflowName =
    workflow.name || (typeof workflow.meta?.name === 'string' ? workflow.meta.name : filename);

  const credentialsList: string[] = [];
  nodes.forEach((n) => {
    if (n.credentials) {
      Object.keys(n.credentials).forEach((credType) => {
        if (!credentialsList.includes(credType)) {
          credentialsList.push(credType);
        }
      });
    }
  });

  let nodesTable =
    '| Node Name | Node Type | Version | Role / Context |\n| :--- | :--- | :--- | :--- |\n';
  nodes.forEach((n) => {
    let role = 'Processing element';
    if (n.type === 'n8n-nodes-base.webhook') {
      role = `Webhook endpoint trigger (${getStringParam(n, 'httpMethod') || 'POST'})`;
    } else if (n.type.toLowerCase().includes('trigger')) {
      role = 'Trigger event handler';
    } else if (n.type === 'n8n-nodes-base.if') {
      role = 'Conditional routing element';
    } else if (n.type === 'n8n-nodes-base.code') {
      role = 'Code block execution';
    } else if (n.type === 'n8n-nodes-base.httpRequest') {
      role = 'Outbound HTTP API integration';
    } else if (n.type.includes('email') || n.type.includes('gmail')) {
      role = 'Outbound email notification';
    }

    nodesTable += `| **${n.name}** | \`${n.type}\` | v${n.typeVersion} | ${role} |\n`;
  });

  const risks: string[] = [];
  nodes.forEach((n) => {
    const paramsStr = JSON.stringify(n.parameters || {});
    if (
      paramsStr.includes('sk_live_') ||
      paramsStr.includes('sk_test_') ||
      paramsStr.includes('xoxb-') ||
      paramsStr.includes('ghp_')
    ) {
      risks.push(
        `*   **Critical security risk:** Node \`${n.name}\` contains hardcoded token-like values.`
      );
    }

    if (n.type === 'n8n-nodes-base.httpRequest') {
      if (hasAuthorizationHeader(n)) {
        risks.push(
          `*   **Security warning:** Node \`${n.name}\` uses an Authorization header in parameters. Prefer n8n credential objects.`
        );
      }
      if (!n.parameters?.onError && !n.parameters?.retryOnFail) {
        risks.push(
          `*   **Reliability warning:** HTTP Request node \`${n.name}\` has no retry or error handling option configured.`
        );
      }
    }
  });

  if (risks.length === 0) {
    risks.push('*   No obvious hardcoded secret patterns were identified by the static scanner.');
  }

  const connectionCount = Object.values(connections).reduce((total, sourceConns) => {
    return (
      total +
      (sourceConns.main || []).reduce((branchTotal, branch) => branchTotal + branch.length, 0)
    );
  }, 0);

  return `# Workflow Documentation: ${workflowName}

This documentation was compiled locally by FlowForge n8n from static workflow JSON. It is not proof that the workflow has executed successfully in n8n.

## Summary
*   **Workflow file:** \`${filename}\`
*   **Total nodes:** ${nodes.length}
*   **Total connections:** ${connectionCount}
*   **Active status in JSON:** ${workflow.active ? 'Active' : 'Inactive or unspecified'}

---

## 1. Node Topology

${nodesTable}

---

## 2. Credentials Required
${
  credentialsList.length > 0
    ? credentialsList
        .map((c) => `*   **${c}**: configure this credential inside the target n8n instance.`)
        .join('\n')
    : '*   No credential objects are referenced in this JSON. HTTP/API placeholders may still require credentials before real use.'
}

---

## 3. Local Test Helpers
1.  Generate mock JSON with \`flowforge payload <type> --out <dir>\`.
2.  For workflows with Webhook nodes, run \`flowforge test-webhook ${filename}\` to write a curl script and usage notes. The generated script is not executed automatically.

---

## 4. Diagnostics & Risk Notes
${risks.join('\n')}

---

## 5. n8n Runtime Notes
*   Webhook test URLs only listen while the n8n editor is waiting for a test event.
*   Production webhook URLs require the workflow to be activated in n8n.
*   Credential IDs and service-specific node parameters must be verified in the target n8n version before import or activation.
`;
}
