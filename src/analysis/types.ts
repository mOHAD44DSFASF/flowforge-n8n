import { FlowForgeConfig } from '../core/config.js';
import { Finding } from '../core/findings.js';
import { N8nWorkflow, WorkflowNode } from '../core/workflowSchema.js';

export interface AnalysisContext {
  workflow: N8nWorkflow;
  config: FlowForgeConfig;
  nodes: WorkflowNode[];
  connections: N8nWorkflow['connections'];
}

export interface AnalysisRule {
  code: string;
  description: string;
  run(context: AnalysisContext): Finding[];
}

export interface AnalysisReport {
  findings: Finding[];
  summary: {
    total: number;
    error: number;
    warning: number;
    info: number;
  };
}
