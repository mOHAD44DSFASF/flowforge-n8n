import { expect, test } from 'vitest';
import { generatePayloads } from '../../src/core/payloadGenerator.js';
import { generateWebhookTest } from '../../src/core/webhookTestGenerator.js';
import { generateMermaidDiagram } from '../../src/core/diagramGenerator.js';
import { generateDocs } from '../../src/core/docsGenerator.js';
import { explainWorkflow } from '../../src/core/workflowExplainer.js';
import { scoreWorkflow } from '../../src/core/workflowScorer.js';
import { diffWorkflows } from '../../src/core/workflowDiff.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';
import * as fs from 'fs';
import * as path from 'path';

const mockWorkflow: N8nWorkflow = {
  meta: { name: 'Lead Form Sync' },
  nodes: [
    {
      id: '1',
      name: 'Webhook Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [100, 200],
      parameters: { path: 'lead-webhook', httpMethod: 'POST' }
    },
    {
      id: '2',
      name: 'Format Set',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [300, 200],
      parameters: { values: { string: [{ name: 'email', value: '={{ $json.body.email }}' }] } }
    },
    {
      id: '3',
      name: 'CRM Update',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 3,
      position: [500, 200],
      parameters: { url: 'https://api.crm.local/leads', method: 'POST' }
    }
  ],
  connections: {
    'Webhook Trigger': {
      main: [[{ node: 'Format Set', type: 'main', index: 0 }]]
    },
    'Format Set': {
      main: [[{ node: 'CRM Update', type: 'main', index: 0 }]]
    }
  }
};

test('payload generation outputs valid file variants', () => {
  const tmpDir = path.join(__dirname, '../../tmp/payload-test');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const generated = generatePayloads('lead-form', tmpDir);
  expect(generated.length).toBe(6);
  
  const expectedFiles = [
    'valid.json',
    'missing-required-field.json',
    'invalid-email.json',
    'empty-body.json',
    'unexpected-fields.json',
    'large-payload.json'
  ];
  
  expectedFiles.forEach((file) => {
    const fullPath = path.join(tmpDir, file);
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(fullPath, 'utf-8'))).toBeDefined();
  });
});

test('webhook testing script compilation', () => {
  const result = generateWebhookTest(mockWorkflow, 'http://my-n8n.local:5678');
  expect(result.tests.length).toBe(1);
  expect(result.tests[0].nodeName).toBe('Webhook Trigger');
  expect(result.tests[0].testUrl).toBe('http://my-n8n.local:5678/webhook-test/lead-webhook');
  expect(result.shScriptContent).toContain('Triggering n8n local Webhook simulations...');
  expect(result.shScriptContent).toContain('curl -X POST');
  expect(result.readmeContent).toContain('Local Webhook Testing Instructions');
});

test('diagram outputs valid Mermaid strings', () => {
  const mmd = generateMermaidDiagram(mockWorkflow);
  expect(mmd).toContain('flowchart TD');
  expect(mmd).toContain('node_1_1("Webhook Trigger (Trigger)")');
  expect(mmd).toContain('node_2_2["Format Set"]');
  expect(mmd).toContain('node_1_1 --> node_2_2');
  expect(mmd).toContain('style node_1_1 fill:');
});

test('documentation compile outputs markdown layout', () => {
  const docs = generateDocs(mockWorkflow, 'lead.json');
  expect(docs).toContain('# Workflow Documentation: Lead Form Sync');
  expect(docs).toContain('| Node Name | Node Type |');
  expect(docs).toContain('Webhook Trigger');
  expect(docs).toContain('CRM Update');
});

test('workflow explanation path walkthrough', () => {
  const expl = explainWorkflow(mockWorkflow);
  expect(expl).toContain('Webhook Trigger');
  expect(expl).toContain('Format Set');
  expect(expl).toContain('CRM Update');
  expect(expl).toContain('HTTP Call to: https://api.crm.local/leads');
});

test('workflow scorer evaluations', () => {
  const report = scoreWorkflow(mockWorkflow);
  // Expected deductions: Webhook trigger exists but no Respond-to-Webhook (reliability -10)
  // HTTP integration has no retry/error configurations (reliability -5)
  // Total score should be around 75/100 or less
  expect(report.score.total).toBeLessThan(100);
  expect(report.recommendations.some(r => r.includes('Respond to Webhook'))).toBe(true);
});

test('workflow diff identification', () => {
  const oldWorkflow: N8nWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [100, 200],
        parameters: { path: 'lead-webhook', httpMethod: 'POST' }
      }
    ],
    connections: {}
  };

  const diff = diffWorkflows(oldWorkflow, mockWorkflow);
  expect(diff.addedNodes).toContain('Format Set');
  expect(diff.addedNodes).toContain('CRM Update');
  expect(diff.addedConnections.length).toBe(2);
});
