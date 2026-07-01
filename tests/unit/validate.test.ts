import { expect, test } from 'vitest';
import { parseWorkflowFile } from '../../src/core/workflowParser.js';
import { validateWorkflow } from '../../src/core/workflowValidator.js';
import * as path from 'path';

test('valid workflow validation', () => {
  const filePath = path.join(__dirname, '../fixtures/valid-workflow.json');
  const parseResult = parseWorkflowFile(filePath);
  expect(parseResult.success).toBe(true);
  
  const report = validateWorkflow(parseResult.workflow!);
  expect(report.isValid).toBe(true);
  expect(report.errors.length).toBe(0);
});

test('invalid workflow validation (schema & non-existent connection)', () => {
  const filePath = path.join(__dirname, '../fixtures/invalid-workflow.json');
  const parseResult = parseWorkflowFile(filePath);
  // Zod parsing will catch the structural issues first
  expect(parseResult.success).toBe(false);
  expect(parseResult.error).toContain('Schema validation failed');
});

test('connection integrity and duplicate check', () => {
  // Let's create an in-memory workflow object to test specific validator rules
  const mockWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [100, 200] as [number, number],
        parameters: { path: 'trigger', httpMethod: 'GET' }
      },
      {
        id: '1', // Duplicate ID
        name: 'Format Data',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [300, 200] as [number, number],
        parameters: {}
      },
      {
        id: '3',
        name: 'Format Data', // Duplicate Name
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [500, 200] as [number, number],
        parameters: {}
      }
    ],
    connections: {
      'Webhook Trigger': {
        main: [
          [
            {
              node: 'Missing Target Node', // Target does not exist
              type: 'main',
              index: 0
            }
          ]
        ]
      }
    }
  };

  const report = validateWorkflow(mockWorkflow);
  expect(report.isValid).toBe(false);
  
  const messages = report.errors.map(e => e.message);
  expect(messages).toContain('Duplicate node ID found: "1"');
  expect(messages).toContain('Duplicate node name found: "Format Data"');
  expect(messages).toContain('Node "Webhook Trigger" connects to non-existent target node: "Missing Target Node"');
});

test('secrets validation triggers warnings', () => {
  const filePath = path.join(__dirname, '../fixtures/workflow-with-secrets.json');
  const parseResult = parseWorkflowFile(filePath);
  expect(parseResult.success).toBe(true);

  const report = validateWorkflow(parseResult.workflow!);
  expect(report.warnings.length).toBeGreaterThan(0);
  
  const hasSecretWarning = report.warnings.some(w => w.message.includes('obvious hardcoded API key or token pattern'));
  expect(hasSecretWarning).toBe(true);
});
