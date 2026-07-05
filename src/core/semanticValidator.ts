import { closestParameter, getCatalogNode } from '../catalog/index.js';
import { CatalogParameter } from '../catalog/types.js';
import { Finding } from './findings.js';
import { N8nWorkflow, WorkflowNode } from './workflowSchema.js';

export interface SemanticValidationOptions {
  warnOnOutdatedTypeVersion?: boolean;
}

export function validateWorkflowSemantics(
  workflow: N8nWorkflow,
  options: SemanticValidationOptions = {}
): Finding[] {
  const findings: Finding[] = [];
  const warnOnOutdatedTypeVersion = options.warnOnOutdatedTypeVersion ?? true;
  const nodeNames = new Set(workflow.nodes.map((node) => node.name));

  for (let nodeIndex = 0; nodeIndex < workflow.nodes.length; nodeIndex += 1) {
    const node = workflow.nodes[nodeIndex];
    const catalogNode = getCatalogNode(node.type);

    if (!catalogNode) {
      findings.push({
        code: 'SEM-NOT-IN-CATALOG',
        severity: 'info',
        category: 'semantic',
        message: `Node type "${node.type}" is not in the bundled catalog; semantic checks were skipped for this node.`,
        nodeId: node.id,
        nodeName: node.name
      });
      findings.push(...findUnknownNodeReferenceFindings(node, nodeNames));
      continue;
    }

    if (!catalogNode.versions.includes(node.typeVersion)) {
      findings.push({
        code: 'SEM-INVALID-TYPE-VERSION',
        severity: 'error',
        category: 'semantic',
        message: `Node "${node.name}" uses unsupported typeVersion ${node.typeVersion} for ${node.type}.`,
        detail: `Supported versions: ${catalogNode.versions.join(', ')}.`,
        nodeId: node.id,
        nodeName: node.name,
        fix: {
          kind: 'bump-type-version',
          path: `/nodes/${nodeIndex}/typeVersion`,
          value: catalogNode.latestVersion,
          rationale: `Use the latest bundled catalog version for ${catalogNode.displayName}.`
        }
      });
    } else if (warnOnOutdatedTypeVersion && node.typeVersion < catalogNode.latestVersion) {
      findings.push({
        code: 'SEM-OUTDATED-TYPE-VERSION',
        severity: 'warning',
        category: 'semantic',
        message: `Node "${node.name}" uses typeVersion ${node.typeVersion}; latest bundled catalog version is ${catalogNode.latestVersion}.`,
        nodeId: node.id,
        nodeName: node.name,
        fix: {
          kind: 'bump-type-version',
          path: `/nodes/${nodeIndex}/typeVersion`,
          value: catalogNode.latestVersion,
          rationale: `Upgrade ${catalogNode.displayName} to the latest catalog version.`
        }
      });
    }

    findings.push(...findParameterFindings(node, nodeIndex, catalogNode.parameters));
    findings.push(...findCredentialFindings(node, catalogNode.credentials));
    findings.push(...findUnknownNodeReferenceFindings(node, nodeNames));
  }

  return findings;
}

function findParameterFindings(
  node: WorkflowNode,
  nodeIndex: number,
  parameters: CatalogParameter[]
): Finding[] {
  const findings: Finding[] = [];
  const knownParameters = new Set(parameters.map((parameter) => parameter.name));
  const nodeParameters = node.parameters ?? {};

  for (const parameterName of Object.keys(nodeParameters)) {
    if (knownParameters.has(parameterName)) continue;

    const nearest = closestParameter(node.type, parameterName);
    findings.push({
      code: 'SEM-UNKNOWN-PARAM',
      severity: 'error',
      category: 'semantic',
      message: `Node "${node.name}" has unknown parameter "${parameterName}".`,
      detail: nearest ? `Did you mean "${nearest.name}"?` : undefined,
      nodeId: node.id,
      nodeName: node.name,
      fix: nearest
        ? {
            kind: 'rename-param',
            path: `/nodes/${nodeIndex}/parameters/${parameterName}`,
            from: parameterName,
            to: nearest.name,
            rationale: `Rename misspelled parameter "${parameterName}" to "${nearest.name}".`
          }
        : undefined
    });
  }

  for (const parameter of parameters) {
    if (!parameter.required) continue;
    const value = nodeParameters[parameter.name];
    if (value !== undefined && value !== null && value !== '') continue;

    findings.push({
      code: 'SEM-MISSING-REQUIRED-PARAM',
      severity: 'error',
      category: 'semantic',
      message: `Node "${node.name}" is missing required parameter "${parameter.name}".`,
      nodeId: node.id,
      nodeName: node.name,
      fix:
        parameter.default !== undefined
          ? {
              kind: 'set-param',
              path: `/nodes/${nodeIndex}/parameters/${parameter.name}`,
              value: parameter.default,
              rationale: `Set documented default value for required parameter "${parameter.name}".`
            }
          : undefined
    });
  }

  return findings;
}

function findCredentialFindings(
  node: WorkflowNode,
  credentials: { name: string; required: boolean }[]
): Finding[] {
  const findings: Finding[] = [];
  const nodeCredentials = node.credentials ?? {};

  for (const credential of credentials) {
    if (!credential.required || nodeCredentials[credential.name]) continue;

    findings.push({
      code: 'SEM-MISSING-CREDENTIALS',
      severity: 'error',
      category: 'semantic',
      message: `Node "${node.name}" requires n8n credential "${credential.name}".`,
      nodeId: node.id,
      nodeName: node.name
    });
  }

  return findings;
}

function findUnknownNodeReferenceFindings(node: WorkflowNode, nodeNames: Set<string>): Finding[] {
  const findings: Finding[] = [];
  const references = findExpressionNodeReferences(node.parameters ?? {});

  for (const reference of references) {
    if (nodeNames.has(reference)) continue;
    findings.push({
      code: 'SEM-EXPR-UNKNOWN-NODE-REF',
      severity: 'error',
      category: 'semantic',
      message: `Node "${node.name}" expression references unknown node "${reference}".`,
      nodeId: node.id,
      nodeName: node.name
    });
  }

  return findings;
}

function findExpressionNodeReferences(value: unknown): string[] {
  const references = new Set<string>();

  function visit(current: unknown): void {
    if (typeof current === 'string') {
      for (const match of current.matchAll(/\$\(['"]([^'"]+)['"]\)/g)) {
        references.add(match[1]);
      }
      for (const match of current.matchAll(/\$node\[['"]([^'"]+)['"]\]/g)) {
        references.add(match[1]);
      }
      return;
    }

    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    if (current && typeof current === 'object') {
      Object.values(current).forEach(visit);
    }
  }

  visit(value);
  return [...references];
}
