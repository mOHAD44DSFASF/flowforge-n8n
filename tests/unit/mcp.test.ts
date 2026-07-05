import { expect, test } from 'vitest';
import { annotationsForTool, createFlowForgeMcpServer } from '../../src/mcp/server.js';
import {
  diffWorkflowsTool,
  explainErrorTool,
  generatePayloadsTool,
  healTool,
  explainWorkflowTool,
  lintWorkflowTool,
  sanitizeTool,
  validateWorkflowTool
} from '../../src/mcp/tools.js';

const workflow = {
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
  connections: {},
  active: false,
  settings: {}
};

test('creates an MCP server instance', () => {
  expect(createFlowForgeMcpServer().isConnected()).toBe(false);
});

test('MCP tools validate, lint, heal, sanitize, diff, and generate payloads', async () => {
  const validation = await validateWorkflowTool({ workflow });
  expect(validation.findings.map((finding) => finding.code)).toContain('SEM-INVALID-TYPE-VERSION');

  const lint = await lintWorkflowTool({ workflow });
  expect(lint.summary.total).toBeGreaterThan(0);

  const healed = await healTool({ workflow, maxIterations: 2 });
  expect(healed.workflow.nodes[0].typeVersion).toBe(2);
  expect(healed.workflow.nodes[0].parameters.httpMethod).toBe('POST');

  const sanitized = await sanitizeTool({
    workflow: {
      nodes: [
        {
          id: '1',
          name: 'HTTP',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [0, 0],
          parameters: {
            headers: {
              parameter: [
                { name: 'Authorization', value: 'Bearer xoxb-dummyslack' }
              ]
            }
          }
        }
      ],
      connections: {}
    }
  });
  expect(sanitized.redactedCount).toBeGreaterThan(0);

  const diff = await diffWorkflowsTool({ oldWorkflow: workflow, newWorkflow: healed.workflow });
  expect(diff.modifiedNodes[0].name).toBe('Webhook');

  const payloads = await generatePayloadsTool({ type: 'lead' });
  expect(payloads['valid.json']).toMatchObject({ email: 'jane.doe@example.com' });
});

test('MCP explain error maps known failure classes', async () => {
  await expect(explainErrorTool({ error: 'TEST-UNSUPPORTED-NODE: Slack' })).resolves.toMatchObject({
    suggestion: 'Add a mock for that node in the test case.'
  });
});

test('MCP annotations do not mark mutating or live-capable test runs as read-only', () => {
  expect(annotationsForTool('flowforge_run_tests')).toMatchObject({
    readOnlyHint: false,
    idempotentHint: false,
    openWorldHint: true
  });
  expect(annotationsForTool('flowforge_validate_workflow')).toMatchObject({
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false
  });
});

test('MCP workflow explanations redact token-bearing paths and URLs', async () => {
  const result = await explainWorkflowTool({
    workflow: {
      nodes: [
        {
          id: '1',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [0, 0],
          parameters: { path: 'lead?token=dummy-secret-value', httpMethod: 'POST' }
        },
        {
          id: '2',
          name: 'HTTP',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [200, 0],
          parameters: { url: 'https://user:pass@example.test/path?api_key=secretvalue123' }
        }
      ],
      connections: { Webhook: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] } }
    }
  });

  expect(result.explanation).not.toContain('dummy-secret-value');
  expect(result.explanation).not.toContain('secretvalue123');
  expect(result.explanation).not.toContain('user:pass');
  expect(result.explanation).toContain('**REDACTED_SECRET**');
});
