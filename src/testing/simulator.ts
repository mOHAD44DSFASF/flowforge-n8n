import vm from 'node:vm';
import { evaluateValue } from './expressions.js';
import { FlowForgeTestCase, TestCaseResult } from './types.js';
import { N8nWorkflow, WorkflowNode } from '../core/workflowSchema.js';

interface SimulatorState {
  currentJson: unknown;
  nodeOutputs: Map<string, unknown>;
  nodesExecuted: string[];
  sideEffectNodes: string[];
  errors: string[];
}

export function simulateWorkflow(
  workflow: N8nWorkflow,
  testCase: FlowForgeTestCase
): TestCaseResult {
  const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));
  const startNode = findStartNode(workflow, testCase.trigger.node);
  const state: SimulatorState = {
    currentJson: testCase.trigger.payload,
    nodeOutputs: new Map(),
    nodesExecuted: [],
    sideEffectNodes: [],
    errors: []
  };

  if (!startNode) {
    return {
      name: testCase.name,
      status: 'failed',
      output: undefined,
      nodesExecuted: [],
      errors: [
        `TEST-NO-TRIGGER: Could not find trigger node "${testCase.trigger.node ?? '<auto>'}".`
      ]
    };
  }

  executeNode(workflow, nodesByName, startNode, testCase, state, new Set());
  const expectationErrors = checkExpectations(testCase, state);
  const errors = [...state.errors, ...expectationErrors];

  return {
    name: testCase.name,
    status: errors.length === 0 ? 'passed' : 'failed',
    output: state.currentJson,
    nodesExecuted: state.nodesExecuted,
    errors
  };
}

function findStartNode(workflow: N8nWorkflow, triggerNodeName?: string): WorkflowNode | undefined {
  if (triggerNodeName) return workflow.nodes.find((node) => node.name === triggerNodeName);
  return workflow.nodes.find((node) =>
    [
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.manualTrigger',
      'n8n-nodes-base.scheduleTrigger',
      'n8n-nodes-base.executeWorkflowTrigger'
    ].includes(node.type)
  );
}

function executeNode(
  workflow: N8nWorkflow,
  nodesByName: Map<string, WorkflowNode>,
  node: WorkflowNode,
  testCase: FlowForgeTestCase,
  state: SimulatorState,
  seen: Set<string>
): void {
  if (seen.has(node.name)) {
    state.errors.push(
      `TEST-CYCLE: Node "${node.name}" was reached twice; loop simulation is bounded.`
    );
    return;
  }
  seen.add(node.name);
  state.nodesExecuted.push(node.name);
  if (isSideEffectNode(node)) state.sideEffectNodes.push(node.name);

  const mock = testCase.mocks[node.name];
  if (mock?.error) {
    state.errors.push(`TEST-MOCK-ERROR: ${node.name}: ${mock.error}`);
    return;
  }
  if (mock && 'output' in mock) {
    state.currentJson = mock.output;
  } else {
    const result = executeSupportedNode(node, state);
    if (!result.supported) {
      state.errors.push(
        `TEST-UNSUPPORTED-NODE: Node "${node.name}" of type "${node.type}" requires a mock.`
      );
      return;
    }
    state.currentJson = result.output;
  }

  state.nodeOutputs.set(node.name, state.currentJson);
  const branches = selectBranches(workflow, node, state.currentJson);
  for (const targetName of branches) {
    const target = nodesByName.get(targetName);
    if (!target) {
      state.errors.push(
        `TEST-MISSING-TARGET: Node "${node.name}" connects to missing node "${targetName}".`
      );
      continue;
    }
    executeNode(workflow, nodesByName, target, testCase, state, new Set(seen));
    if (state.errors.length > 0) return;
  }
}

function executeSupportedNode(
  node: WorkflowNode,
  state: SimulatorState
): { supported: boolean; output?: unknown } {
  const context = { json: state.currentJson, nodeOutputs: state.nodeOutputs };

  if (
    node.type === 'n8n-nodes-base.webhook' ||
    node.type === 'n8n-nodes-base.manualTrigger' ||
    node.type === 'n8n-nodes-base.scheduleTrigger' ||
    node.type === 'n8n-nodes-base.executeWorkflowTrigger' ||
    node.type === 'n8n-nodes-base.noOp' ||
    node.type === 'n8n-nodes-base.stickyNote'
  ) {
    return { supported: true, output: state.currentJson };
  }

  if (node.type === 'n8n-nodes-base.respondToWebhook') {
    const responseBody = node.parameters?.responseBody;
    return {
      supported: true,
      output: responseBody === undefined ? state.currentJson : evaluateValue(responseBody, context)
    };
  }

  if (node.type === 'n8n-nodes-base.set') {
    return { supported: true, output: executeSetNode(node, context) };
  }

  if (
    node.type === 'n8n-nodes-base.if' ||
    node.type === 'n8n-nodes-base.switch' ||
    node.type === 'n8n-nodes-base.filter'
  ) {
    return { supported: true, output: state.currentJson };
  }

  if (node.type === 'n8n-nodes-base.merge') {
    return { supported: true, output: state.currentJson };
  }

  if (node.type === 'n8n-nodes-base.splitInBatches') {
    const input = Array.isArray(state.currentJson) ? state.currentJson : [state.currentJson];
    const batchSize =
      typeof node.parameters?.batchSize === 'number' ? node.parameters.batchSize : input.length;
    return { supported: true, output: input.slice(0, Math.max(1, batchSize)) };
  }

  if (node.type === 'n8n-nodes-base.code') {
    return { supported: true, output: executeCodeNode(node, state.currentJson) };
  }

  return { supported: false };
}

function executeSetNode(
  node: WorkflowNode,
  context: { json: unknown; nodeOutputs: Map<string, unknown> }
): unknown {
  const params = node.parameters ?? {};
  const assignments = params.assignments;
  if (assignments && typeof assignments === 'object' && !Array.isArray(assignments)) {
    const assignmentValues = (assignments as { assignments?: unknown }).assignments;
    if (Array.isArray(assignmentValues)) {
      return Object.fromEntries(
        assignmentValues.map((assignment) => {
          const record = assignment as { name?: string; value?: unknown };
          return [record.name ?? 'value', evaluateValue(record.value, context)];
        })
      );
    }
  }

  const values = params.values;
  if (values && typeof values === 'object' && !Array.isArray(values)) {
    const output: Record<string, unknown> =
      params.keepOnlySet === true ? {} : { ...(isRecord(context.json) ? context.json : {}) };
    for (const group of Object.values(values)) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        const record = item as { name?: string; value?: unknown };
        if (record.name) output[record.name] = evaluateValue(record.value, context);
      }
    }
    return output;
  }

  return context.json;
}

function executeCodeNode(node: WorkflowNode, input: unknown): unknown {
  const jsCode =
    typeof node.parameters?.jsCode === 'string' ? node.parameters.jsCode : 'return items;';
  const items = Array.isArray(input) ? input.map((json) => ({ json })) : [{ json: input }];
  const script = `(function() { ${jsCode} })()`;
  const result = vm.runInNewContext(
    script,
    { items, $json: items[0]?.json, JSON, Math },
    { timeout: 100 }
  );
  if (Array.isArray(result)) {
    return result.map((item) => (isRecord(item) && 'json' in item ? item.json : item));
  }
  return result;
}

function selectBranches(workflow: N8nWorkflow, node: WorkflowNode, currentJson: unknown): string[] {
  const branches = workflow.connections[node.name]?.main ?? [];
  if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.filter') {
    return branchByBooleanCondition(branches, node, currentJson);
  }
  if (node.type === 'n8n-nodes-base.switch') {
    return branchBySwitch(branches, node, currentJson);
  }
  return branches.flatMap((branch) =>
    Array.isArray(branch) ? branch.map((connection) => connection.node) : []
  );
}

function branchByBooleanCondition(
  branches: N8nWorkflow['connections'][string]['main'],
  node: WorkflowNode,
  currentJson: unknown
): string[] {
  const raw = node.parameters?.condition ?? node.parameters?.conditions ?? true;
  const value =
    typeof raw === 'string'
      ? evaluateValue(raw, { json: currentJson, nodeOutputs: new Map() })
      : raw;
  const branchIndex = Boolean(value) ? 0 : 1;
  return (branches[branchIndex] ?? []).map((connection) => connection.node);
}

function branchBySwitch(
  branches: N8nWorkflow['connections'][string]['main'],
  node: WorkflowNode,
  currentJson: unknown
): string[] {
  const value = node.parameters?.value
    ? evaluateValue(node.parameters.value, { json: currentJson, nodeOutputs: new Map() })
    : undefined;
  const rules = node.parameters?.rules;
  if (rules && typeof rules === 'object' && !Array.isArray(rules)) {
    const ruleValues = (rules as { values?: unknown }).values;
    if (Array.isArray(ruleValues)) {
      const index = ruleValues.findIndex((rule) => (rule as { value?: unknown }).value === value);
      return (branches[index >= 0 ? index : branches.length - 1] ?? []).map(
        (connection) => connection.node
      );
    }
  }
  return (branches[0] ?? []).map((connection) => connection.node);
}

function checkExpectations(testCase: FlowForgeTestCase, state: SimulatorState): string[] {
  const errors: string[] = [];
  const expected = testCase.expect;

  if (
    expected.output !== undefined &&
    JSON.stringify(expected.output) !== JSON.stringify(state.currentJson)
  ) {
    errors.push(
      `TEST-OUTPUT-MISMATCH: expected ${JSON.stringify(expected.output)} but got ${JSON.stringify(state.currentJson)}.`
    );
  }

  for (const nodeName of expected.nodesExecuted ?? []) {
    if (!state.nodesExecuted.includes(nodeName))
      errors.push(`TEST-NODE-NOT-EXECUTED: Expected "${nodeName}" to execute.`);
  }

  for (const nodeName of expected.notExecuted ?? []) {
    if (state.nodesExecuted.includes(nodeName))
      errors.push(`TEST-NODE-EXECUTED: Expected "${nodeName}" not to execute.`);
  }

  if (expected.branch && !state.nodesExecuted.includes(expected.branch)) {
    errors.push(`TEST-BRANCH-MISMATCH: Expected branch "${expected.branch}" to execute.`);
  }

  if (expected.noSideEffects && state.sideEffectNodes.length > 0) {
    errors.push(
      `TEST-SIDE-EFFECTS: Expected no side-effect nodes, but executed ${state.sideEffectNodes.join(', ')}.`
    );
  }

  return errors;
}

function isSideEffectNode(node: WorkflowNode): boolean {
  if (node.type === 'n8n-nodes-base.httpRequest') return true;
  return [
    'n8n-nodes-base.slack',
    'n8n-nodes-base.googleSheets',
    'n8n-nodes-base.airtable',
    'n8n-nodes-base.gmail',
    'n8n-nodes-base.emailSend',
    'n8n-nodes-base.postgres',
    'n8n-nodes-base.mySql',
    'n8n-nodes-base.telegram',
    'n8n-nodes-base.discord',
    'n8n-nodes-base.stripe',
    'n8n-nodes-base.shopify',
    'n8n-nodes-base.hubspot',
    'n8n-nodes-base.salesforce',
    'n8n-nodes-base.notion',
    'n8n-nodes-base.jira',
    'n8n-nodes-base.trello',
    'n8n-nodes-base.asana',
    'n8n-nodes-base.microsoftTeams',
    'n8n-nodes-base.googleDrive',
    'n8n-nodes-base.googleCalendar',
    'n8n-nodes-base.writeBinaryFile'
  ].includes(node.type);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
