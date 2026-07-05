import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { applyFix } from '../../src/healing/fixes.js';
import { healWorkflowFile, writeHealResult } from '../../src/healing/loop.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';

function tempWorkflowPath(workflow: N8nWorkflow): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-heal-'));
  const filePath = path.join(dir, 'workflow.json');
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  return filePath;
}

test('fix appliers update versions, params, node properties, and removals', () => {
  const workflow: N8nWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 99,
        position: [0, 0],
        parameters: { httpMethd: 'POST', path: 'lead', extra: true }
      }
    ],
    connections: {}
  };

  expect(
    applyFix(workflow, { kind: 'bump-type-version', path: '/nodes/0/typeVersion', value: 2 })
  ).toBe(true);
  expect(
    applyFix(workflow, {
      kind: 'rename-param',
      path: '/nodes/0/parameters/httpMethd',
      from: 'httpMethd',
      to: 'httpMethod'
    })
  ).toBe(true);
  expect(
    applyFix(workflow, {
      kind: 'set-node-property',
      path: '/nodes/Webhook/retryOnFail',
      value: true
    })
  ).toBe(true);
  expect(applyFix(workflow, { kind: 'remove-param', path: '/nodes/0/parameters/extra' })).toBe(
    true
  );

  expect(workflow.nodes[0].typeVersion).toBe(2);
  expect(workflow.nodes[0].parameters.httpMethod).toBe('POST');
  expect(workflow.nodes[0].retryOnFail).toBe(true);
  expect(workflow.nodes[0].parameters.extra).toBeUndefined();
});

test('healing loop applies semantic and analysis fixes over iterations', async () => {
  const filePath = tempWorkflowPath({
    nodes: [
      {
        id: '1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 99,
        position: [0, 0],
        parameters: { path: 'lead', httpMethd: 'POST' }
      },
      {
        id: '2',
        name: 'Call API',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [200, 0],
        parameters: { url: 'https://api.example.test' }
      }
    ],
    connections: { Webhook: { main: [[{ node: 'Call API', type: 'main', index: 0 }]] } }
  });

  const result = await healWorkflowFile(filePath, { maxIterations: 4 });

  expect(result.report.changed).toBe(true);
  expect(result.report.iterations.map((iteration) => iteration.finding?.code)).toEqual(
    expect.arrayContaining([
      'SEM-INVALID-TYPE-VERSION',
      'SEM-UNKNOWN-PARAM',
      'REL-NO-ERROR-HANDLING'
    ])
  );
  expect(result.workflow.nodes[0].typeVersion).toBe(2);
  expect(result.workflow.nodes[0].parameters.httpMethod).toBe('POST');
  expect(result.workflow.nodes[1].retryOnFail).toBe(true);
});

test('writeHealResult writes healed copy and heal report by default', async () => {
  const filePath = tempWorkflowPath({
    nodes: [
      {
        id: '1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 99,
        position: [0, 0],
        parameters: { path: 'lead', httpMethd: 'POST' }
      }
    ],
    connections: {}
  });
  const result = await healWorkflowFile(filePath, { maxIterations: 2 });
  const written = writeHealResult(filePath, result);

  expect(written.workflowPath?.endsWith('workflow.healed.json')).toBe(true);
  expect(fs.existsSync(written.workflowPath!)).toBe(true);
  expect(fs.existsSync(written.reportPath)).toBe(true);
});
