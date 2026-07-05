import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

interface RawNodeDescription {
  name?: string;
  displayName?: string;
  version?: number | number[];
  defaults?: { name?: string };
  properties?: RawNodeProperty[];
  credentials?: Array<{ name?: string; required?: boolean }>;
  displayOptions?: Record<string, unknown>;
}

interface RawNodeProperty {
  name?: string;
  type?: string;
  required?: boolean;
  default?: unknown;
  displayOptions?: Record<string, unknown>;
}

interface NormalizedNode {
  type: string;
  displayName: string;
  versions: number[];
  latestVersion: number;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: unknown;
    displayOptions?: Record<string, unknown>;
  }>;
  credentials: Array<{ name: string; required: boolean }>;
  displayOptions?: Record<string, unknown>;
}

type NodeConstructor = new () => { description?: RawNodeDescription };

const require = createRequire(import.meta.url);
const packageNames = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'];
const outputPath = path.resolve('src/catalog/data/catalog.json');

function main() {
  const nodes: NormalizedNode[] = [];
  const packageVersions: string[] = [];

  for (const packageName of packageNames) {
    const packageJsonPath = resolvePackageJson(packageName);
    const packageRoot = path.dirname(packageJsonPath);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version?: string };
    packageVersions.push(`${packageName}@${packageJson.version ?? 'unknown'}`);
    nodes.push(...loadPackageNodes(packageName, packageRoot));
  }

  if (nodes.length === 0) {
    throw new Error('No n8n node descriptions were discovered.');
  }

  const snapshot = {
    sourceN8nVersion: packageVersions.join(', '),
    generatedAt: new Date().toISOString(),
    nodes: nodes.sort((a, b) => a.type.localeCompare(b.type))
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${nodes.length} catalog node(s) to ${outputPath}`);
}

function resolvePackageJson(packageName: string): string {
  try {
    return require.resolve(`${packageName}/package.json`);
  } catch {
    throw new Error(
      `Cannot find ${packageName}. Install n8n node packages beside FlowForge before running update:catalog.\n` +
        'Example: pnpm add -D n8n-nodes-base @n8n/n8n-nodes-langchain'
    );
  }
}

function loadPackageNodes(packageName: string, packageRoot: string): NormalizedNode[] {
  const distDir = path.join(packageRoot, 'dist');
  const searchRoot = fs.existsSync(distDir) ? distDir : packageRoot;
  const files = collectJsFiles(searchRoot);
  const nodes: NormalizedNode[] = [];

  for (const file of files) {
    const loaded = tryRequire(file);
    if (!loaded || typeof loaded !== 'object') continue;
    for (const value of Object.values(loaded as Record<string, unknown>)) {
      const normalized = normalizeExport(packageName, value);
      if (normalized) nodes.push(normalized);
    }
  }

  return dedupeNodes(nodes);
}

function normalizeExport(packageName: string, exported: unknown): NormalizedNode | undefined {
  let instance: { description?: RawNodeDescription } | undefined;
  try {
    if (typeof exported === 'function') {
      const Constructor = exported as NodeConstructor;
      instance = new Constructor();
    } else if (exported && typeof exported === 'object' && 'description' in exported) {
      instance = exported as { description?: RawNodeDescription };
    }
  } catch {
    return undefined;
  }

  const description = instance?.description;
  if (!description?.name && !description?.displayName) return undefined;

  const typePrefix = packageName === '@n8n/n8n-nodes-langchain' ? '@n8n/n8n-nodes-langchain' : 'n8n-nodes-base';
  const name = description.name ?? String(description.displayName).replace(/\s+/g, '');
  const versions = Array.isArray(description.version) ? description.version : [description.version ?? 1];

  return {
    type: `${typePrefix}.${name}`,
    displayName: description.displayName ?? description.defaults?.name ?? name,
    versions,
    latestVersion: Math.max(...versions),
    parameters: (description.properties ?? [])
      .filter((property): property is RawNodeProperty & { name: string } => typeof property.name === 'string')
      .map((property) => ({
        name: property.name,
        type: property.type ?? 'unknown',
        required: property.required ?? false,
        default: property.default,
        displayOptions: property.displayOptions
      })),
    credentials: (description.credentials ?? [])
      .filter((credential): credential is { name: string; required?: boolean } => typeof credential.name === 'string')
      .map((credential) => ({ name: credential.name, required: credential.required ?? false })),
    displayOptions: description.displayOptions
  };
}

function collectJsFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function tryRequire(file: string): unknown {
  try {
    return require(file);
  } catch {
    return undefined;
  }
}

function dedupeNodes(nodes: NormalizedNode[]): NormalizedNode[] {
  return [...new Map(nodes.map((node) => [node.type, node])).values()];
}

main();
