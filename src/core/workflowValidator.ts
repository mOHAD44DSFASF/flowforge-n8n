import { N8nWorkflow, WorkflowNode } from './workflowSchema.js';

export interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  nodeName?: string;
}

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateWorkflow(workflow: N8nWorkflow): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};

  const nodeNames = new Set<string>();
  const nodeIds = new Set<string>();

  // 1. Check node names and IDs uniqueness
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        severity: 'error',
        message: `Duplicate node ID found: "${node.id}"`,
        nodeId: node.id,
        nodeName: node.name
      });
    }
    nodeIds.add(node.id);

    if (nodeNames.has(node.name)) {
      errors.push({
        severity: 'error',
        message: `Duplicate node name found: "${node.name}"`,
        nodeId: node.id,
        nodeName: node.name
      });
    }
    nodeNames.add(node.name);
  }

  // 2. Map of connection endpoints for disconnected/orphan checking
  const nodesWithOutgoing = new Set<string>();
  const nodesWithIncoming = new Set<string>();

  // Check connections validity
  for (const [sourceName, sourceConns] of Object.entries(connections)) {
    // Check if source node exists
    if (!nodeNames.has(sourceName)) {
      errors.push({
        severity: 'error',
        message: `Connection references non-existent source node: "${sourceName}"`
      });
      continue;
    }

    if (sourceConns && sourceConns.main) {
      for (const branch of sourceConns.main) {
        if (!Array.isArray(branch)) continue;
        for (const conn of branch) {
          nodesWithOutgoing.add(sourceName);
          
          // Check if target node exists
          if (!nodeNames.has(conn.node)) {
            errors.push({
              severity: 'error',
              message: `Node "${sourceName}" connects to non-existent target node: "${conn.node}"`,
              nodeName: sourceName
            });
          } else {
            nodesWithIncoming.add(conn.node);
          }
        }
      }
    }
  }

  // 3. Disconnected / Orphan nodes checking
  for (const node of nodes) {
    const isTriggerOrManual = 
      node.type === 'n8n-nodes-base.webhook' || 
      node.type === 'n8n-nodes-base.manualTrigger' ||
      node.type === 'n8n-nodes-base.scheduleTrigger';

    const hasOutgoing = nodesWithOutgoing.has(node.name);
    const hasIncoming = nodesWithIncoming.has(node.name);

    if (!hasOutgoing && !hasIncoming) {
      // Exclude Sticky Notes/NoOp nodes from being strict errors, treat as warning
      if (node.type === 'n8n-nodes-base.noOp' || node.type === 'n8n-nodes-base.stickyNote') {
        warnings.push({
          severity: 'warning',
          message: `Sticky note or NoOp node "${node.name}" is disconnected.`,
          nodeId: node.id,
          nodeName: node.name
        });
      } else {
        warnings.push({
          severity: 'warning',
          message: `Node "${node.name}" is completely disconnected.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }
  }

  // 4. Node parameter validations (Webhook, HTTP Request, Secret checking)
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]{24,}/,
    /sk_test_[a-zA-Z0-9]{24,}/,
    /xoxb-[a-zA-Z0-9-]{10,}/,
    /xoxp-[a-zA-Z0-9-]{10,}/,
    /ghp_[a-zA-Z0-9]{36}/,
    /github_pat_[a-zA-Z0-9_]{82}/
  ];

  for (const node of nodes) {
    // Webhook specific validation
    if (node.type === 'n8n-nodes-base.webhook') {
      const path = node.parameters?.path;
      if (!path) {
        errors.push({
          severity: 'error',
          message: `Webhook node "${node.name}" is missing a trigger path.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
      const method = node.parameters?.httpMethod;
      if (!method) {
        errors.push({
          severity: 'error',
          message: `Webhook node "${node.name}" is missing an HTTP method.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }

    // HTTP Request specific validation
    if (node.type === 'n8n-nodes-base.httpRequest') {
      const url = node.parameters?.url;
      if (!url) {
        errors.push({
          severity: 'error',
          message: `HTTP Request node "${node.name}" is missing target URL.`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }

    // Obvious secrets check in parameters
    const paramsStr = JSON.stringify(node.parameters || {});
    for (const pattern of secretPatterns) {
      if (pattern.test(paramsStr)) {
        warnings.push({
          severity: 'warning',
          message: `Node "${node.name}" contains an obvious hardcoded API key or token pattern.`,
          nodeId: node.id,
          nodeName: node.name
        });
        break; // Trigger warning once per node
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
