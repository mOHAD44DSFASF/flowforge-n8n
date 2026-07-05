import catalogJson from './data/catalog.json' with { type: 'json' };
import { CatalogNode, CatalogParameter, NodeCatalogSnapshot } from './types.js';

const catalog = catalogJson as NodeCatalogSnapshot;
const nodesByType = new Map(catalog.nodes.map((node) => [node.type, node]));

export function getCatalog(): NodeCatalogSnapshot {
  return catalog;
}

export function getCatalogNode(type: string): CatalogNode | undefined {
  return nodesByType.get(type);
}

export function latestTypeVersion(type: string): number | undefined {
  return getCatalogNode(type)?.latestVersion;
}

export function getCatalogParameter(
  nodeType: string,
  parameterName: string
): CatalogParameter | undefined {
  return getCatalogNode(nodeType)?.parameters.find((parameter) => parameter.name === parameterName);
}

export function closestParameter(
  nodeType: string,
  parameterName: string
): CatalogParameter | undefined {
  const parameters = getCatalogNode(nodeType)?.parameters ?? [];
  let closest: { parameter: CatalogParameter; distance: number } | undefined;

  for (const parameter of parameters) {
    const distance = levenshtein(parameter.name.toLowerCase(), parameterName.toLowerCase());
    if (!closest || distance < closest.distance) {
      closest = { parameter, distance };
    }
  }

  if (!closest || closest.distance > Math.max(2, Math.floor(parameterName.length / 3))) {
    return undefined;
  }

  return closest.parameter;
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 0; i < a.length; i += 1) {
    const current = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const insert = current[j] + 1;
      const remove = previous[j + 1] + 1;
      const replace = previous[j] + (a[i] === b[j] ? 0 : 1);
      current.push(Math.min(insert, remove, replace));
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}
