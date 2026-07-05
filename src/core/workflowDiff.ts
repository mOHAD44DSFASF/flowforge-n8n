import { N8nWorkflow, WorkflowNode } from './workflowSchema.js';

export interface NodeChange {
  name: string;
  type: string;
  changes: string[];
}

export interface DiffReport {
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: NodeChange[];
  addedConnections: string[];
  removedConnections: string[];
}

export function diffWorkflows(oldWorkflow: N8nWorkflow, newWorkflow: N8nWorkflow): DiffReport {
  const addedNodes: string[] = [];
  const removedNodes: string[] = [];
  const modifiedNodes: NodeChange[] = [];
  const addedConnections: string[] = [];
  const removedConnections: string[] = [];

  const oldNodes = oldWorkflow.nodes || [];
  const newNodes = newWorkflow.nodes || [];

  const oldNodeMap = new Map<string, WorkflowNode>();
  oldNodes.forEach((n) => oldNodeMap.set(n.name, n));

  const newNodeMap = new Map<string, WorkflowNode>();
  newNodes.forEach((n) => newNodeMap.set(n.name, n));

  // 1. Check added/removed/modified nodes
  newNodes.forEach((node) => {
    if (!oldNodeMap.has(node.name)) {
      addedNodes.push(node.name);
    } else {
      const oldNode = oldNodeMap.get(node.name)!;
      const changes: string[] = [];

      if (node.type !== oldNode.type) {
        changes.push(`Type changed from "${oldNode.type}" to "${node.type}"`);
      }
      if (node.typeVersion !== oldNode.typeVersion) {
        changes.push(`Version changed from v${oldNode.typeVersion} to v${node.typeVersion}`);
      }

      // Check parameter modifications
      const oldParamsStr = JSON.stringify(oldNode.parameters || {});
      const newParamsStr = JSON.stringify(node.parameters || {});
      if (oldParamsStr !== newParamsStr) {
        const oldKeys = Object.keys(oldNode.parameters || {});
        const newKeys = Object.keys(node.parameters || {});

        newKeys.forEach((k) => {
          if (!(k in oldNode.parameters)) {
            changes.push(`Parameter "${k}" added`);
          } else if (JSON.stringify(oldNode.parameters[k]) !== JSON.stringify(node.parameters[k])) {
            changes.push(`Parameter "${k}" value modified`);
          }
        });
        oldKeys.forEach((k) => {
          if (!(k in node.parameters)) {
            changes.push(`Parameter "${k}" removed`);
          }
        });
      }

      if (changes.length > 0) {
        modifiedNodes.push({
          name: node.name,
          type: node.type,
          changes
        });
      }
    }
  });

  oldNodes.forEach((node) => {
    if (!newNodeMap.has(node.name)) {
      removedNodes.push(node.name);
    }
  });

  // 2. Parse connections as flat strings for comparison
  function parseConnectionsList(workflow: N8nWorkflow): Set<string> {
    const list = new Set<string>();
    const conns = workflow.connections || {};
    for (const [sourceName, sourceConns] of Object.entries(conns)) {
      if (sourceConns && sourceConns.main) {
        sourceConns.main.forEach((branch, outputIndex) => {
          if (!Array.isArray(branch)) return;
          branch.forEach((conn) => {
            list.add(`${sourceName}[out:${outputIndex}] -> ${conn.node}`);
          });
        });
      }
    }
    return list;
  }

  const oldConnsSet = parseConnectionsList(oldWorkflow);
  const newConnsSet = parseConnectionsList(newWorkflow);

  newConnsSet.forEach((c) => {
    if (!oldConnsSet.has(c)) {
      addedConnections.push(c);
    }
  });

  oldConnsSet.forEach((c) => {
    if (!newConnsSet.has(c)) {
      removedConnections.push(c);
    }
  });

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedConnections,
    removedConnections
  };
}
