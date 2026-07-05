import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import {
  renderReviewMarkdown,
  semanticDiffWorkflows,
  reviewWorkflows
} from '../../src/core/semanticDiff.js';
import { runEval } from '../../src/eval/runner.js';
import { runOfflineCi } from '../../src/ci/offlineCi.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';

const before: N8nWorkflow = {
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
      name: 'Set Status',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [200, 0],
      parameters: { values: {} }
    }
  ],
  connections: { Manual: { main: [[{ node: 'Set Status', type: 'main', index: 0 }]] } }
};

const after: N8nWorkflow = {
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
      name: 'Set Status',
      type: 'n8n-nodes-base.set',
      typeVersion: 3,
      position: [200, 0],
      parameters: { values: {} }
    },
    {
      id: '3',
      name: 'Call API',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [400, 0],
      parameters: { url: 'http://api.example.test' }
    }
  ],
  connections: {
    Manual: { main: [[{ node: 'Set Status', type: 'main', index: 0 }]] },
    'Set Status': { main: [[{ node: 'Call API', type: 'main', index: 0 }]] }
  }
};

test('semantic diff and review report behavioral changes and introduced findings', () => {
  const diff = semanticDiffWorkflows(before, after);
  expect(diff.addedNodes).toContain('Call API');
  expect(diff.changedTypeVersions[0]).toContain('Set Status');

  const review = reviewWorkflows(before, after);
  expect(review.introducedFindings.map((finding) => finding.code)).toContain('SEC-HTTP-NO-TLS');
  expect(renderReviewMarkdown(review)).toContain('# FlowForge Review');
});

test('eval runner replays recordings and computes pass rate', async () => {
  const result = await runEval('tests/fixtures/v2/basic.flowforge.eval.json');
  expect(result.summary).toMatchObject({ cases: 2, passed: 2, failed: 0, passRate: 1 });
});

test('offline CI writes reports for an isolated workflow directory', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-ci-'));
  fs.writeFileSync(path.join(dir, 'workflow.json'), JSON.stringify(before, null, 2));
  fs.writeFileSync(
    path.join(dir, 'basic.flowforge.test.json'),
    JSON.stringify({
      workflow: 'workflow.json',
      cases: [
        {
          name: 'manual run',
          trigger: { payload: { ok: true } },
          expect: { nodesExecuted: ['Manual'] }
        }
      ]
    })
  );

  const result = await runOfflineCi(dir);
  expect(result.workflowsChecked).toBe(1);
  expect(fs.existsSync(result.reportPath)).toBe(true);
  expect(fs.existsSync(result.junitPath)).toBe(true);
});

test('offline CI ignores repository fixtures and templates when scanning workflows', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-ci-'));
  fs.mkdirSync(path.join(dir, 'tests', 'fixtures'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'templates', 'bad-template'), { recursive: true });

  fs.writeFileSync(path.join(dir, 'workflow.json'), JSON.stringify(before, null, 2));
  fs.writeFileSync(
    path.join(dir, 'tests', 'fixtures', 'intentional-secret.json'),
    JSON.stringify({
      nodes: [
        {
          id: '1',
          name: 'Bad Fixture',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [0, 0],
          parameters: {
            url: 'https://api.example.test',
            headers: {
              parameter: [
                { name: 'Authorization', value: 'Bearer xoxb-dummyslack' }
              ]
            }
          }
        }
      ],
      connections: {}
    })
  );
  fs.writeFileSync(
    path.join(dir, 'templates', 'bad-template', 'workflow.json'),
    fs.readFileSync(path.join(dir, 'tests', 'fixtures', 'intentional-secret.json'))
  );
  fs.writeFileSync(
    path.join(dir, 'basic.flowforge.test.json'),
    JSON.stringify({
      workflow: 'workflow.json',
      cases: [
        {
          name: 'manual run',
          trigger: { payload: { ok: true } },
          expect: { nodesExecuted: ['Manual'] }
        }
      ]
    })
  );

  const result = await runOfflineCi(dir);

  expect(result.workflowsChecked).toBe(1);
  expect(result.success).toBe(true);
});

test('offline CI reports invalid workflow JSON as a failing finding', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-ci-invalid-'));
  fs.writeFileSync(
    path.join(dir, 'workflow.json'),
    JSON.stringify({ nodes: 'not-an-array', connections: {} })
  );
  fs.writeFileSync(
    path.join(dir, 'basic.flowforge.test.json'),
    JSON.stringify({
      workflow: {
        nodes: [
          {
            id: '1',
            name: 'Manual',
            type: 'n8n-nodes-base.manualTrigger',
            typeVersion: 1,
            position: [0, 0],
            parameters: {}
          }
        ],
        connections: {}
      },
      cases: [
        {
          name: 'manual run',
          trigger: { payload: { ok: true } },
          expect: { nodesExecuted: ['Manual'] }
        }
      ]
    })
  );

  const result = await runOfflineCi(dir);

  expect(result.success).toBe(false);
  expect(result.findings.map((finding) => finding.code)).toContain('CI-WORKFLOW-INVALID');
});
