import { expect, test } from 'vitest';
import { generateCustomNode } from '../../src/custom-node/customNodeGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

test('custom node scaffolding creates standard n8n package layouts', () => {
  const tmpDir = path.join(__dirname, '../../tmp/node-new-run');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const generated = generateCustomNode('MyService', {
    auth: 'apiKey',
    resource: 'leads',
    operation: 'create,list,get'
  }, tmpDir);

  expect(generated.length).toBe(7);

  const folder = path.join(tmpDir, 'n8n-nodes-my-service');
  expect(fs.existsSync(path.join(folder, 'package.json'))).toBe(true);
  expect(fs.existsSync(path.join(folder, 'tsconfig.json'))).toBe(true);
  expect(fs.existsSync(path.join(folder, 'README.md'))).toBe(true);
  expect(fs.existsSync(path.join(folder, 'credentials/MyServiceApi.credentials.ts'))).toBe(true);
  expect(fs.existsSync(path.join(folder, 'nodes/MyService/MyService.node.ts'))).toBe(true);
  expect(fs.existsSync(path.join(folder, 'nodes/MyService/MyService.node.json'))).toBe(true);
  expect(fs.existsSync(path.join(folder, 'nodes/MyService/MyService.svg'))).toBe(true);

  // Validate package.json contents
  const pkg = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf-8'));
  expect(pkg.name).toBe('n8n-nodes-my-service');
  expect(pkg.version).toBe('0.1.0');
  expect(pkg.n8n.nodes).toContain('dist/nodes/MyService/MyService.node.js');

  // Validate Credentials content
  const credsTs = fs.readFileSync(path.join(folder, 'credentials/MyServiceApi.credentials.ts'), 'utf-8');
  expect(credsTs).toContain("name = 'myServiceApi'");

  // Validate Node class content
  const nodeTs = fs.readFileSync(path.join(folder, 'nodes/MyService/MyService.node.ts'), 'utf-8');
  expect(nodeTs).toContain('class MyService implements INodeType');
  expect(nodeTs).toContain("name: 'myServiceApi'");
  expect(nodeTs).toContain("name: 'myService'");
  expect(nodeTs).toContain("name: 'Leads'");
  expect(nodeTs).toContain('"name": "Create"');
  expect(nodeTs).toContain('scaffold: true');
});
