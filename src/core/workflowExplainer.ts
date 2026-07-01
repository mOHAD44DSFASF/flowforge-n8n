import { N8nWorkflow } from './workflowSchema.js';

export function explainWorkflow(workflow: N8nWorkflow): string {
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};

  const name = workflow.meta?.name || 'n8n Workflow';

  // 1. Identify starting points (triggers or nodes without incoming connections)
  const incoming = new Set<string>();
  for (const sourceName of Object.keys(connections)) {
    const sourceConns = connections[sourceName];
    if (sourceConns && sourceConns.main) {
      for (const branch of sourceConns.main) {
        if (!Array.isArray(branch)) continue;
        for (const conn of branch) {
          incoming.add(conn.node);
        }
      }
    }
  }

  const triggers = nodes.filter((n) => n.type.toLowerCase().includes('trigger') || n.type === 'n8n-nodes-base.webhook');
  const startNodes = triggers.length > 0 ? triggers : nodes.filter((n) => !incoming.has(n.name));

  let explanation = `=== Workflow Explanation: "${name}" ===\n\n`;

  // 2. Describe starting triggers
  explanation += `## 1. Workflow Activation / Triggers\n`;
  if (startNodes.length === 0) {
    explanation += `*   No starting nodes found in this workflow.\n`;
  } else {
    startNodes.forEach((node) => {
      let desc = 'Executes manually or as a processing step.';
      if (node.type === 'n8n-nodes-base.webhook') {
        desc = `Exposes an HTTP endpoint listening to [${node.parameters?.httpMethod || 'POST'}] requests on path: "/${node.parameters?.path || '...'}"`;
      } else if (node.type === 'n8n-nodes-base.scheduleTrigger') {
        desc = `Executes repeatedly on a schedule configuration.`;
      } else if (node.type === 'n8n-nodes-base.manualTrigger') {
        desc = 'Executes manually when the user triggers it in n8n UI.';
      }
      explanation += `*   **${node.name}** (\`${node.type}\`): ${desc}\n`;
    });
  }

  // 3. Describe processing steps & paths
  explanation += `\n## 2. Processing Steps & Logical Flow\n`;
  const nameToNode = new Map<string, typeof nodes[0]>();
  nodes.forEach((n) => nameToNode.set(n.name, n));

  const walked = new Set<string>();
  function describeNodeConnections(nodeName: string, depth: number = 0) {
    if (walked.has(nodeName) || depth > 10) return;
    walked.add(nodeName);

    const node = nameToNode.get(nodeName);
    if (!node) return;

    const sourceConns = connections[nodeName];
    if (sourceConns && sourceConns.main && sourceConns.main.length > 0) {
      sourceConns.main.forEach((branch, branchIndex) => {
        if (!Array.isArray(branch) || branch.length === 0) return;
        branch.forEach((conn) => {
          const targetNode = nameToNode.get(conn.node);
          if (!targetNode) return;

          let connectionDetail = '';
          if (node.type === 'n8n-nodes-base.if') {
            connectionDetail = ` on the [${branchIndex === 0 ? 'TRUE' : 'FALSE'}] branch`;
          } else if (node.type === 'n8n-nodes-base.switch') {
            connectionDetail = ` on path [output ${branchIndex}]`;
          }

          explanation += `    *   **${node.name}** connects${connectionDetail} to **${conn.node}** (\`${targetNode.type}\`)\n`;
          describeNodeConnections(conn.node, depth + 1);
        });
      });
    }
  }

  startNodes.forEach((start) => {
    explanation += `*   **Start Path** starting from "${start.name}":\n`;
    describeNodeConnections(start.name, 1);
  });

  // 4. Summarize external integrations and tools
  const integrations: string[] = [];
  nodes.forEach((n) => {
    if (n.type === 'n8n-nodes-base.httpRequest') {
      integrations.push(`HTTP Call to: ${n.parameters?.url || 'URL expression'}`);
    } else if (n.type.includes('slack')) {
      integrations.push('Slack notifications integration');
    } else if (n.type.includes('googleSheets')) {
      integrations.push('Google Sheets integration');
    } else if (n.type.includes('airtable')) {
      integrations.push('Airtable records updates');
    }
  });

  explanation += `\n## 3. External Integrations\n`;
  if (integrations.length > 0) {
    integrations.forEach((item) => {
      explanation += `*   ${item}\n`;
    });
  } else {
    explanation += `*   No external API integration nodes found.\n`;
  }

  return explanation;
}
