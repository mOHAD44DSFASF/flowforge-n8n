import { Finding, FindingFix } from '../core/findings.js';
import { N8nWorkflow, WorkflowNode } from '../core/workflowSchema.js';
import { AppliedFix } from './types.js';

export function applyFindingFix(
  workflow: N8nWorkflow,
  finding: Finding
): { workflow: N8nWorkflow; applied: AppliedFix } {
  const cloned = structuredClone(workflow) as N8nWorkflow;
  const fix = finding.fix;

  if (!fix) {
    return {
      workflow: cloned,
      applied: { finding, changed: false, rationale: 'Finding has no deterministic fix.' }
    };
  }

  const changed = applyFix(cloned, fix);
  return {
    workflow: cloned,
    applied: {
      finding,
      changed,
      rationale: fix.rationale ?? `Applied ${fix.kind}.`
    }
  };
}

export function applyFix(workflow: N8nWorkflow, fix: FindingFix): boolean {
  if (fix.kind === 'rename-param') return renameParam(workflow, fix);
  if (fix.kind === 'set-param') return setParam(workflow, fix);
  if (fix.kind === 'bump-type-version') return setJsonPointer(workflow, fix.path, fix.value);
  if (fix.kind === 'set-node-property') return setJsonPointer(workflow, fix.path, fix.value);
  if (fix.kind === 'remove-param') return removeJsonPointer(workflow, fix.path);
  return false;
}

function renameParam(workflow: N8nWorkflow, fix: FindingFix): boolean {
  if (!fix.from || !fix.to) return false;
  const node = resolveNodeFromPath(workflow, fix.path);
  if (!node || !(fix.from in node.parameters)) return false;
  if (fix.to in node.parameters) return false;

  node.parameters[fix.to] = node.parameters[fix.from];
  delete node.parameters[fix.from];
  return true;
}

function setParam(workflow: N8nWorkflow, fix: FindingFix): boolean {
  return setJsonPointer(workflow, fix.path, fix.value);
}

function setJsonPointer(workflow: N8nWorkflow, pointer: string, value: unknown): boolean {
  const resolved = resolvePointerParent(workflow, pointer);
  if (!resolved) return false;
  const before = JSON.stringify(resolved.parent[resolved.key]);
  resolved.parent[resolved.key] = value;
  return before !== JSON.stringify(value);
}

function removeJsonPointer(workflow: N8nWorkflow, pointer: string): boolean {
  const resolved = resolvePointerParent(workflow, pointer);
  if (!resolved || !(resolved.key in resolved.parent)) return false;
  delete resolved.parent[resolved.key];
  return true;
}

function resolveNodeFromPath(workflow: N8nWorkflow, pointer: string): WorkflowNode | undefined {
  const parts = pointer.split('/').filter(Boolean);
  if (parts[0] !== 'nodes' || parts.length < 2) return undefined;
  const identifier = decodePointer(parts[1]);
  const index = Number(identifier);
  if (Number.isInteger(index)) return workflow.nodes[index];
  return workflow.nodes.find((node) => node.name === identifier);
}

function resolvePointerParent(
  workflow: N8nWorkflow,
  pointer: string
): { parent: Record<string, unknown>; key: string } | undefined {
  const parts = pointer.split('/').filter(Boolean).map(decodePointer);
  if (parts.length === 0) return undefined;

  let current: unknown = workflow;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const nextPart = parts[index + 1];

    if (part === 'nodes' && Array.isArray((current as { nodes?: unknown }).nodes)) {
      current = (current as { nodes: WorkflowNode[] }).nodes;
      continue;
    }

    if (Array.isArray(current)) {
      const numeric = Number(part);
      current = Number.isInteger(numeric)
        ? current[numeric]
        : current.find((node) => node.name === part);
      continue;
    }

    if (!current || typeof current !== 'object') return undefined;
    const record = current as Record<string, unknown>;
    if (!(part in record)) {
      record[part] = nextPart && Number.isInteger(Number(nextPart)) ? [] : {};
    }
    current = record[part];
  }

  if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
  return { parent: current as Record<string, unknown>, key: parts[parts.length - 1] };
}

function decodePointer(value: string): string {
  return value.replace(/~1/g, '/').replace(/~0/g, '~');
}
