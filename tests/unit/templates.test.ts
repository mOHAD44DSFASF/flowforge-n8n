import { expect, test } from 'vitest';
import {
  getTemplateNames,
  writeTemplateToDir,
  scaffoldFromDescription
} from '../../src/core/templates.js';
import * as fs from 'fs';
import * as path from 'path';

test('template names listing', () => {
  const names = getTemplateNames();
  expect(names).toContain('lead-to-crm');
  expect(names).toContain('stripe-payment-alert');
  expect(names.length).toBe(20);
});

test('keyword-based scaffold generation', () => {
  const workflow = scaffoldFromDescription(
    'Create a webhook trigger, format it, update sheets, notify slack and respond'
  );
  expect(workflow.nodes.length).toBeGreaterThan(3);

  const types = workflow.nodes.map((n) => n.type);
  expect(types).toContain('n8n-nodes-base.webhook');
  expect(types).toContain('n8n-nodes-base.set');
  expect(types).toContain('n8n-nodes-base.httpRequest');
  expect(types).toContain('n8n-nodes-base.respondToWebhook');
});

test('writing template files builds structured directories', () => {
  const tmpDir = path.join(__dirname, '../../tmp/template-run');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const { files } = writeTemplateToDir('lead-to-crm', tmpDir);
  expect(files.length).toBeGreaterThan(4);

  expect(fs.existsSync(path.join(tmpDir, 'workflow.json'))).toBe(true);
  expect(fs.existsSync(path.join(tmpDir, 'README.md'))).toBe(true);
  expect(fs.existsSync(path.join(tmpDir, 'credentials-needed.md'))).toBe(true);
  expect(fs.existsSync(path.join(tmpDir, 'diagram.mmd'))).toBe(true);
  expect(fs.existsSync(path.join(tmpDir, 'test-webhook.sh'))).toBe(true);
  expect(fs.existsSync(path.join(tmpDir, 'sample-payloads/valid.json'))).toBe(true);
});
