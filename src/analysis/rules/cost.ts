import { Finding } from '../../core/findings.js';
import { hasUpstreamNodeType, isLlmNode } from '../helpers.js';
import { AnalysisRule } from '../types.js';

export const llmInLoopRule: AnalysisRule = {
  code: 'COST-LLM-IN-LOOP',
  description:
    'LLM calls inside loops or batch fanout should be called out with a rough cost warning.',
  run({ workflow, nodes }) {
    return nodes
      .filter(isLlmNode)
      .filter((node) =>
        hasUpstreamNodeType(
          workflow,
          node.name,
          (upstream) => upstream.type === 'n8n-nodes-base.splitInBatches'
        )
      )
      .map((node) => ({
        code: 'COST-LLM-IN-LOOP',
        severity: 'warning',
        category: 'cost',
        message: `LLM node "${node.name}" is downstream of Split In Batches; cost scales with item count.`,
        detail: 'Rough estimate: model calls ~= input items processed by the batch loop.',
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};

export const unboundedTriggerFanoutRule: AnalysisRule = {
  code: 'COST-UNBOUNDED-TRIGGER-FANOUT',
  description: 'Triggers feeding fanout nodes should include a bound.',
  run({ nodes, connections }) {
    const triggerNames = new Set(
      nodes
        .filter(
          (node) =>
            node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.scheduleTrigger'
        )
        .map((node) => node.name)
    );
    const splitNames = new Set(
      nodes.filter((node) => node.type === 'n8n-nodes-base.splitInBatches').map((node) => node.name)
    );
    const findings: Finding[] = [];

    for (const [sourceName, sourceConns] of Object.entries(connections)) {
      if (!triggerNames.has(sourceName)) continue;
      for (const branch of sourceConns.main ?? []) {
        if (!Array.isArray(branch)) continue;
        for (const connection of branch) {
          if (!splitNames.has(connection.node)) continue;
          const splitNode = nodes.find((node) => node.name === connection.node);
          if (splitNode?.parameters?.batchSize !== undefined) continue;
          findings.push({
            code: 'COST-UNBOUNDED-TRIGGER-FANOUT',
            severity: 'warning',
            category: 'cost',
            message: `Trigger "${sourceName}" fans out into "${connection.node}" without an explicit batch size.`,
            nodeName: connection.node,
            nodeId: splitNode?.id
          });
        }
      }
    }

    return findings;
  }
};
