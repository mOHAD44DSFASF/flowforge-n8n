import { expect, test } from 'vitest';
import { lintWorkflow, lintWorkflowFindings } from '../../src/core/workflowLinter.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';

test('lint rules detect naming, headers, errors and webhook warnings', () => {
  const mockWorkflow: N8nWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Webhook', // default name
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [100, 200],
        parameters: { path: 'test', httpMethod: 'GET' }
      },
      {
        id: '2',
        name: 'HTTP Request', // default name
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 3,
        position: [300, 200],
        parameters: {
          url: 'https://api.example.com',
          headers: {
            parameter: [
              {
                name: 'Authorization',
                value: 'Bearer something'
              }
            ]
          }
        }
      }
    ],
    connections: {
      Webhook: {
        main: [
          [
            {
              node: 'HTTP Request',
              type: 'main',
              index: 0
            }
          ]
        ]
      }
    }
  };

  const issues = lintWorkflow(mockWorkflow);
  expect(issues.length).toBeGreaterThan(0);

  const ruleIds = issues.map((i) => i.ruleId);
  // Default names flagged
  expect(ruleIds).toContain('MNT-NAMING');
  // Hardcoded authorization header flagged
  expect(ruleIds).toContain('SEC-AUTH-HEADER');
  // Missing error handling on HTTP request node flagged
  expect(ruleIds).toContain('REL-ERROR-HANDLING');
  // Webhook trigger present but no Respond-to-Webhook flagged
  expect(ruleIds).toContain('REL-WEBHOOK-RESPONSE');

  const findings = lintWorkflowFindings(mockWorkflow);
  expect(findings.map((f) => f.code)).toEqual(expect.arrayContaining(ruleIds));
  expect(findings.some((f) => f.code === 'SEC-AUTH-HEADER' && f.category === 'security')).toBe(
    true
  );
});
