import { N8nWorkflow } from './workflowSchema.js';

function mermaidId(rawId: string, index: number): string {
  const sanitized = rawId.replace(/[^a-zA-Z0-9_]/g, '_');
  return `node_${index}_${sanitized || 'unnamed'}`;
}

function escapeLabel(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function generateMermaidDiagram(workflow: N8nWorkflow): string {
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};

  let mmd = 'flowchart TD\n';
  const idToMermaidId = new Map<string, string>();

  nodes.forEach((node, index) => {
    const nodeId = mermaidId(node.id, index + 1);
    idToMermaidId.set(node.id, nodeId);
    const safeName = escapeLabel(node.name);

    if (node.type === 'n8n-nodes-base.webhook' || node.type.toLowerCase().includes('trigger')) {
      mmd += `    ${nodeId}("${safeName} (Trigger)")\n`;
    } else if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
      mmd += `    ${nodeId}{"${safeName}"}\n`;
    } else if (node.type === 'n8n-nodes-base.stickyNote') {
      mmd += `    ${nodeId}["Sticky Note: ${safeName}"]\n`;
    } else {
      mmd += `    ${nodeId}["${safeName}"]\n`;
    }
  });

  mmd += '\n';

  const nameToId = new Map<string, string>();
  const idToType = new Map<string, string>();
  nodes.forEach((n) => {
    const nodeId = idToMermaidId.get(n.id);
    if (nodeId) {
      nameToId.set(n.name, nodeId);
      idToType.set(nodeId, n.type);
    }
  });

  for (const [sourceName, sourceConns] of Object.entries(connections)) {
    const sourceId = nameToId.get(sourceName);
    if (!sourceId) continue;

    const sourceType = idToType.get(sourceId);

    if (sourceConns && sourceConns.main) {
      sourceConns.main.forEach((branch, outputIndex) => {
        if (!Array.isArray(branch)) return;
        branch.forEach((conn) => {
          const targetId = nameToId.get(conn.node);
          if (!targetId) return;

          let wireLabel = '';
          if (sourceType === 'n8n-nodes-base.if') {
            wireLabel = outputIndex === 0 ? ' -->|true| ' : ' -->|false| ';
          } else if (sourceType === 'n8n-nodes-base.switch') {
            wireLabel = ` -->|output ${outputIndex}| `;
          } else {
            wireLabel = ' --> ';
          }

          mmd += `    ${sourceId}${wireLabel}${targetId}\n`;
        });
      });
    }
  }

  mmd += '\n';

  nodes.forEach((node) => {
    const nodeId = idToMermaidId.get(node.id);
    if (!nodeId) return;

    if (node.type === 'n8n-nodes-base.webhook' || node.type.toLowerCase().includes('trigger')) {
      mmd += `    style ${nodeId} fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#1e1b4b\n`;
    } else if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
      mmd += `    style ${nodeId} fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#451a03\n`;
    } else if (node.type === 'n8n-nodes-base.stickyNote') {
      mmd += `    style ${nodeId} fill:#fef08a,stroke:#ca8a04,stroke-dasharray: 5 5,color:#422006\n`;
    } else if (node.type === 'n8n-nodes-base.code') {
      mmd += `    style ${nodeId} fill:#f3f4f6,stroke:#4b5563,stroke-width:2px,color:#111827\n`;
    } else {
      mmd += `    style ${nodeId} fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b\n`;
    }
  });

  return mmd;
}
