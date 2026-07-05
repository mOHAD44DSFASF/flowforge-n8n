import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { evaluateExpressionString } from '../../src/testing/expressions.js';
import { renderJUnitReport } from '../../src/testing/reporters/junit.js';
import { renderJsonReport } from '../../src/testing/reporters/json.js';
import { renderTtyReport } from '../../src/testing/reporters/tty.js';
import { runFlowForgeTests } from '../../src/testing/runner.js';
import { simulateWorkflow } from '../../src/testing/simulator.js';
import { FlowForgeTestCase } from '../../src/testing/types.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';

test('evaluates n8n-style expressions with $json and node lookups', () => {
  const nodeOutputs = new Map<string, unknown>([['Previous', { value: 'ok' }]]);
  expect(
    evaluateExpressionString('={{ $json.body.email }}', {
      json: { body: { email: 'jane@example.com' } },
      nodeOutputs
    })
  ).toBe('jane@example.com');
  expect(
    evaluateExpressionString('={{ $("Previous").item.json.value }}', { json: {}, nodeOutputs })
  ).toBe('ok');
});

test('simulator fails loudly on unsupported nodes without mocks', () => {
  const workflow: N8nWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Manual',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [0, 0],
        parameters: {}
      },
      {
        id: '2',
        name: 'Slack',
        type: 'n8n-nodes-base.slack',
        typeVersion: 2,
        position: [200, 0],
        parameters: {}
      }
    ],
    connections: { Manual: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] } }
  };
  const testCase: FlowForgeTestCase = {
    name: 'unsupported',
    trigger: { payload: {} },
    mocks: {},
    expect: {},
    snapshot: false
  };

  const result = simulateWorkflow(workflow, testCase);
  expect(result.status).toBe('failed');
  expect(result.errors[0]).toContain('TEST-UNSUPPORTED-NODE');
});

test('runner executes regression files and updates snapshots', async () => {
  const fixture = path.resolve('tests/fixtures/v2/regression-basic.flowforge.test.json');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-test-'));
  const testPath = path.join(tempDir, 'regression-basic.flowforge.test.json');
  fs.copyFileSync(fixture, testPath);

  const result = await runFlowForgeTests(testPath, { updateSnapshots: true });

  expect(result.summary).toMatchObject({ files: 1, cases: 1, passed: 1, failed: 0 });
  expect(
    fs.existsSync(
      path.join(tempDir, '__snapshots__', 'regression-basic.flowforge.test.json.snap.json')
    )
  ).toBe(true);
});

test('runner fails missing snapshots unless update mode is explicit', async () => {
  const fixture = path.resolve('tests/fixtures/v2/regression-basic.flowforge.test.json');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-test-'));
  const testPath = path.join(tempDir, 'regression-basic.flowforge.test.json');
  fs.copyFileSync(fixture, testPath);

  const result = await runFlowForgeTests(testPath);

  expect(result.summary).toMatchObject({ files: 1, cases: 1, passed: 0, failed: 1 });
  expect(result.files[0].results[0].errors).toEqual(
    expect.arrayContaining([expect.stringContaining('TEST-SNAPSHOT-MISSING')])
  );
  expect(
    fs.existsSync(
      path.join(tempDir, '__snapshots__', 'regression-basic.flowforge.test.json.snap.json')
    )
  ).toBe(false);
});

test('runner fails when no test files match', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-test-empty-'));

  const result = await runFlowForgeTests('missing/**/*.flowforge.test.json', { cwd: tempDir });

  expect(result.summary).toMatchObject({ files: 0, cases: 1, passed: 0, failed: 1 });
  expect(result.files[0].results[0].errors[0]).toContain('TEST-NO-TEST-FILES');
});

test('runner supports mocks for unsupported external nodes', async () => {
  const result = await runFlowForgeTests('tests/fixtures/v2/regression-mock.flowforge.test.json');

  expect(result.summary.failed).toBe(0);
  expect(result.files[0].results[0].nodesExecuted).toEqual(['Manual', 'Call CRM']);
});

test('simulator honors branch and no-side-effects expectations', () => {
  const workflow: N8nWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Manual',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [0, 0],
        parameters: {}
      },
      {
        id: '2',
        name: 'Choose',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [200, 0],
        parameters: { condition: '={{ $json.pass }}' }
      },
      {
        id: '3',
        name: 'Yes',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [400, 0],
        parameters: { values: { string: [{ name: 'path', value: 'yes' }] } }
      },
      {
        id: '4',
        name: 'No',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [400, 200],
        parameters: { values: { string: [{ name: 'path', value: 'no' }] } }
      },
      {
        id: '5',
        name: 'Call API',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [600, 0],
        parameters: { url: 'https://api.example.test' }
      }
    ],
    connections: {
      Manual: { main: [[{ node: 'Choose', type: 'main', index: 0 }]] },
      Choose: {
        main: [[{ node: 'Yes', type: 'main', index: 0 }], [{ node: 'No', type: 'main', index: 0 }]]
      },
      Yes: { main: [[{ node: 'Call API', type: 'main', index: 0 }]] }
    }
  };

  const branchResult = simulateWorkflow(workflow, {
    name: 'wrong branch',
    trigger: { payload: { pass: true } },
    mocks: { 'Call API': { output: { ok: true } } },
    expect: { branch: 'No' },
    snapshot: false
  });
  const sideEffectResult = simulateWorkflow(workflow, {
    name: 'side effect',
    trigger: { payload: { pass: true } },
    mocks: { 'Call API': { output: { ok: true } } },
    expect: { noSideEffects: true },
    snapshot: false
  });

  expect(branchResult.status).toBe('failed');
  expect(branchResult.errors).toEqual(
    expect.arrayContaining([expect.stringContaining('TEST-BRANCH-MISMATCH')])
  );
  expect(sideEffectResult.status).toBe('failed');
  expect(sideEffectResult.errors).toEqual(
    expect.arrayContaining([expect.stringContaining('TEST-SIDE-EFFECTS')])
  );
});

test('reporters render json, tty, and junit output', async () => {
  const result = await runFlowForgeTests('tests/fixtures/v2/regression-mock.flowforge.test.json');

  expect(JSON.parse(renderJsonReport(result)).summary.passed).toBe(1);
  expect(renderTtyReport(result)).toContain('[PASS] uses http mock');
  expect(renderJUnitReport(result)).toContain('<testsuite name="flowforge"');
});
