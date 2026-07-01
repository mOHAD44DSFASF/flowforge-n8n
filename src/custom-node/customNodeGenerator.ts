import * as fs from 'fs';
import * as path from 'path';

export type CustomNodeAuth = 'apiKey' | 'oauth2';

export interface CustomNodeOptions {
  auth: string;
  resource: string;
  operation: string;
}

interface NormalizedOptions {
  auth: CustomNodeAuth;
  resourceName: string;
  resourceDisplayName: string;
  operations: string[];
}

function toPackageSegment(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPascalCase(value: string): string {
  const words = value.match(/[a-zA-Z0-9]+/g) || [];
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toOptionValue(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDisplayName(value: string): string {
  const words = value.match(/[a-zA-Z0-9]+/g) || [];
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function normalizeOptions(options: CustomNodeOptions): NormalizedOptions {
  const auth = options.auth === 'oauth2' ? 'oauth2' : options.auth === 'apiKey' ? 'apiKey' : undefined;
  if (!auth) {
    throw new Error('Unsupported auth type. Use "apiKey" or "oauth2".');
  }

  const resourceName = toOptionValue(options.resource);
  if (!resourceName) {
    throw new Error('Resource name must contain at least one letter or number.');
  }

  const operations = options.operation
    .split(',')
    .map(toOptionValue)
    .filter(Boolean);

  const uniqueOperations = Array.from(new Set(operations));
  if (uniqueOperations.length === 0) {
    throw new Error('At least one operation is required.');
  }

  return {
    auth,
    resourceName,
    resourceDisplayName: toDisplayName(options.resource),
    operations: uniqueOperations
  };
}

function writeFile(filePath: string, content: string, generatedFiles: string[]): void {
  fs.writeFileSync(filePath, content, 'utf-8');
  generatedFiles.push(filePath);
}

function credentialClass(className: string, credentialName: string, auth: CustomNodeAuth): string {
  if (auth === 'oauth2') {
    return `import {
\tICredentialType,
\tINodeProperties,
} from 'n8n-workflow';

export class ${className}OAuth2Api implements ICredentialType {
\tname = '${credentialName}';
\textends = ['oAuth2Api'];
\tdisplayName = '${className} OAuth2 API';
\tdocumentationUrl = 'https://example.invalid/docs/auth';
\tproperties: INodeProperties[] = [
\t\t{
\t\t\tdisplayName: 'Authorization URL',
\t\t\tname: 'authUrl',
\t\t\ttype: 'hidden',
\t\t\tdefault: 'https://example.invalid/oauth/authorize',
\t\t\trequired: true,
\t\t},
\t\t{
\t\t\tdisplayName: 'Access Token URL',
\t\t\tname: 'accessTokenUrl',
\t\t\ttype: 'hidden',
\t\t\tdefault: 'https://example.invalid/oauth/token',
\t\t\trequired: true,
\t\t},
\t\t{
\t\t\tdisplayName: 'Scope',
\t\t\tname: 'scope',
\t\t\ttype: 'hidden',
\t\t\tdefault: '',
\t\t},
\t];
}
`;
  }

  return `import {
\tICredentialType,
\tINodeProperties,
} from 'n8n-workflow';

export class ${className}Api implements ICredentialType {
\tname = '${credentialName}';
\tdisplayName = '${className} API';
\tdocumentationUrl = 'https://example.invalid/docs/auth';
\tproperties: INodeProperties[] = [
\t\t{
\t\t\tdisplayName: 'API Key',
\t\t\tname: 'apiKey',
\t\t\ttype: 'string',
\t\t\ttypeOptions: { password: true },
\t\t\tdefault: '',
\t\t\trequired: true,
\t\t\tdescription: 'API key for ${className}. Replace this scaffold with service-specific auth details.',
\t\t},
\t];
}
`;
}

export function generateCustomNode(name: string, options: CustomNodeOptions, targetParentDir: string): string[] {
  const packageSuffix = toPackageSegment(name);
  const className = toPascalCase(name);
  const nodeTypeName = toCamelCase(name);
  if (!packageSuffix || !className) {
    throw new Error('Node name must contain at least one letter or number.');
  }

  const normalized = normalizeOptions(options);
  const credentialClassName = normalized.auth === 'oauth2' ? `${className}OAuth2Api` : `${className}Api`;
  const credentialFileName = `${credentialClassName}.credentials.ts`;
  const credentialReferenceName = normalized.auth === 'oauth2' ? `${nodeTypeName}OAuth2Api` : `${nodeTypeName}Api`;

  const nodeDir = path.join(targetParentDir, `n8n-nodes-${packageSuffix}`);
  const credsDir = path.join(nodeDir, 'credentials');
  const specificNodeDir = path.join(nodeDir, 'nodes', className);

  [nodeDir, credsDir, specificNodeDir].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });

  const generatedFiles: string[] = [];
  const operationsArrayJson = JSON.stringify(
    normalized.operations.map((operation) => ({
      name: toDisplayName(operation),
      value: operation,
      action: `${toDisplayName(operation)} ${normalized.resourceDisplayName}`
    })),
    null,
    5
  );

  writeFile(
    path.join(nodeDir, 'package.json'),
    `{
  "name": "n8n-nodes-${packageSuffix}",
  "version": "0.1.0",
  "description": "Scaffold for a custom n8n community node integrating ${className}.",
  "main": "dist/nodes/${className}/${className}.node.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "n8n-community-node-package"
  ],
  "license": "MIT",
  "n8n": {
    "nodes": [
      "dist/nodes/${className}/${className}.node.js"
    ],
    "credentials": [
      "dist/credentials/${credentialFileName.replace(/\.ts$/, '.js')}"
    ]
  },
  "devDependencies": {
    "n8n-workflow": "^1.82.0",
    "typescript": "^5.4.5"
  }
}
`,
    generatedFiles
  );

  writeFile(
    path.join(nodeDir, 'tsconfig.json'),
    `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["credentials/**/*.ts", "nodes/**/*.ts"]
}
`,
    generatedFiles
  );

  writeFile(path.join(credsDir, credentialFileName), credentialClass(className, credentialReferenceName, normalized.auth), generatedFiles);

  writeFile(
    path.join(specificNodeDir, `${className}.node.ts`),
    `import {
\tIExecuteFunctions,
\tINodeExecutionData,
\tINodeType,
\tINodeTypeDescription,
\tNodeConnectionType,
} from 'n8n-workflow';

export class ${className} implements INodeType {
\tdescription: INodeTypeDescription = {
\t\tdisplayName: '${className}',
\t\tname: '${nodeTypeName}',
\t\ticon: 'file:${className}.svg',
\t\tgroup: ['transform'],
\t\tversion: 1,
\t\tdescription: 'Scaffolded ${className} API node. Replace placeholder execution logic before production use.',
\t\tdefaults: {
\t\t\tname: '${className}',
\t\t},
\t\tinputs: [NodeConnectionType.Main],
\t\toutputs: [NodeConnectionType.Main],
\t\tcredentials: [
\t\t\t{
\t\t\t\tname: '${credentialReferenceName}',
\t\t\t\trequired: true,
\t\t\t},
\t\t],
\t\tproperties: [
\t\t\t{
\t\t\t\tdisplayName: 'Resource',
\t\t\t\tname: 'resource',
\t\t\t\ttype: 'options',
\t\t\t\tnoDataExpression: true,
\t\t\t\toptions: [
\t\t\t\t\t{
\t\t\t\t\t\tname: '${normalized.resourceDisplayName}',
\t\t\t\t\t\tvalue: '${normalized.resourceName}',
\t\t\t\t\t},
\t\t\t\t],
\t\t\t\tdefault: '${normalized.resourceName}',
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: 'Operation',
\t\t\t\tname: 'operation',
\t\t\t\ttype: 'options',
\t\t\t\tnoDataExpression: true,
\t\t\t\tdisplayOptions: {
\t\t\t\t\tshow: {
\t\t\t\t\t\tresource: ['${normalized.resourceName}'],
\t\t\t\t\t},
\t\t\t\t},
\t\t\t\toptions: ${operationsArrayJson.replace(/\n/g, '\n\t\t\t\t')},
\t\t\t\tdefault: '${normalized.operations[0]}',
\t\t\t},
\t\t\t{
\t\t\t\tdisplayName: 'Record ID',
\t\t\t\tname: 'recordId',
\t\t\t\ttype: 'string',
\t\t\t\tdefault: '',
\t\t\t\trequired: false,
\t\t\t\tdescription: 'Placeholder input. Replace with fields required by the target API.',
\t\t\t},
\t\t],
\t};

\tasync execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
\t\tconst items = this.getInputData();
\t\tconst returnData: INodeExecutionData[] = [];

\t\tfor (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
\t\t\tconst resource = this.getNodeParameter('resource', itemIndex) as string;
\t\t\tconst operation = this.getNodeParameter('operation', itemIndex) as string;
\t\t\tconst recordId = this.getNodeParameter('recordId', itemIndex, '') as string;

\t\t\treturnData.push({
\t\t\t\tjson: {
\t\t\t\t\tscaffold: true,
\t\t\t\t\tresource,
\t\t\t\t\toperation,
\t\t\t\t\trecordId,
\t\t\t\t\tmessage: 'Replace this placeholder with service-specific API request logic before publishing.',
\t\t\t\t},
\t\t\t\tpairedItem: { item: itemIndex },
\t\t\t});
\t\t}

\t\treturn [returnData];
\t}
}
`,
    generatedFiles
  );

  writeFile(
    path.join(specificNodeDir, `${className}.node.json`),
    `{
  "displayName": "${className}",
  "name": "${packageSuffix}",
  "description": "Scaffolded integration for ${className}.",
  "icon": "file:${className}.svg"
}
`,
    generatedFiles
  );

  writeFile(
    path.join(specificNodeDir, `${className}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${className} icon">
  <rect width="64" height="64" rx="12" fill="#111827"/>
  <path d="M18 34h16c6 0 10-4 10-10S40 14 34 14H18v8h15c2 0 3 1 3 3s-1 3-3 3H18v6z" fill="#34d399"/>
  <path d="M46 30H30c-6 0-10 4-10 10s4 10 10 10h16v-8H31c-2 0-3-1-3-3s1-3 3-3h15v-6z" fill="#60a5fa"/>
</svg>
`,
    generatedFiles
  );

  writeFile(
    path.join(nodeDir, 'README.md'),
    `# n8n-nodes-${packageSuffix}

This is a FlowForge-generated scaffold for a custom n8n community node integrating **${className}**.

It is intentionally not production-ready until you replace the placeholder execution logic, API URLs, request/response mapping, error handling, and credential documentation.

## Build
\`\`\`bash
npm install
npm run build
\`\`\`

## Scaffolded Surface
*   Resource: \`${normalized.resourceName}\`
*   Operations: ${normalized.operations.map((operation) => `\`${operation}\``).join(', ')}
*   Auth: \`${normalized.auth}\`

## Required Follow-up
*   Replace placeholder API endpoints and OAuth URLs.
*   Add operation-specific fields and validation.
*   Implement request logic using n8n helpers.
*   Test inside a local n8n instance before publishing.
`,
    generatedFiles
  );

  return generatedFiles;
}
