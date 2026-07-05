import { expect, test } from 'vitest';
import { runAnalysis } from '../../src/analysis/engine.js';
import { loadConfig } from '../../src/core/config.js';
import { lintWorkflow, lintWorkflowFindings } from '../../src/core/workflowLinter.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';

function buildAnalysisFixture(): N8nWorkflow {
  return {
    nodes: [
      {
        id: '1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [0, 0],
        parameters: { path: 'orders', httpMethod: 'POST' }
      },
      {
        id: '2',
        name: 'Fetch Orders',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 3,
        position: [200, 0],
        parameters: {
          url: 'http://api.example.test/orders',
          ignoreResponseCode: true,
          pagination: true,
          headers: {
            parameter: [
              { name: 'Authorization', value: 'Bearer xoxb-dummyslack' }
            ]
          }
        }
      },
      {
        id: '3',
        name: 'Split Orders',
        type: 'n8n-nodes-base.splitInBatches',
        typeVersion: 1,
        position: [400, 0],
        parameters: {}
      },
      {
        id: '4',
        name: 'Classify',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 1,
        position: [600, 0],
        parameters: { prompt: 'Classify order' }
      },
      {
        id: '5',
        name: 'Log Payload',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [800, 0],
        parameters: { jsCode: 'console.log($json.email); return items;' }
      }
    ],
    connections: {
      Webhook: { main: [[{ node: 'Fetch Orders', type: 'main', index: 0 }]] },
      'Fetch Orders': { main: [[{ node: 'Split Orders', type: 'main', index: 0 }]] },
      'Split Orders': { main: [[{ node: 'Classify', type: 'main', index: 0 }]] },
      Classify: { main: [[{ node: 'Log Payload', type: 'main', index: 0 }]] }
    }
  };
}

test('analysis engine reports security, reliability, cost, and legacy findings', () => {
  const report = runAnalysis(buildAnalysisFixture(), {
    config: loadConfig(process.cwd(), {}).config
  });
  const codes = report.findings.map((finding) => finding.code);

  expect(codes).toEqual(
    expect.arrayContaining([
      'SEC-HARDCODED-SECRET',
      'SEC-AUTH-HEADER',
      'SEC-HTTP-NO-TLS',
      'SEC-PII-IN-LOGS',
      'REL-NO-ERROR-HANDLING',
      'REL-ERROR-HANDLING',
      'REL-NON-2XX-SUCCESS',
      'REL-UNBOUNDED-PAGINATION',
      'REL-MISSING-WEBHOOK-RESPONSE',
      'REL-WEBHOOK-RESPONSE',
      'COST-LLM-IN-LOOP'
    ])
  );
  expect(report.summary.error).toBeGreaterThan(0);
});

test('analysis engine applies config rule toggles and severity overrides', () => {
  const config = loadConfig(process.cwd(), {}).config;
  config.rules['SEC-HTTP-NO-TLS'] = { enabled: false };
  config.rules['SEC-AUTH-HEADER'] = { severity: 'error' };

  const findings = runAnalysis(buildAnalysisFixture(), { config }).findings;

  expect(findings.map((finding) => finding.code)).not.toContain('SEC-HTTP-NO-TLS');
  expect(findings.find((finding) => finding.code === 'SEC-AUTH-HEADER')?.severity).toBe('error');
});

test('lint compatibility facade preserves old rule ids and supports severity filtering', () => {
  const workflow = buildAnalysisFixture();
  const issues = lintWorkflow(workflow, { config: loadConfig(process.cwd(), {}).config });
  expect(issues.map((issue) => issue.ruleId)).toEqual(
    expect.arrayContaining(['REL-ERROR-HANDLING', 'REL-WEBHOOK-RESPONSE'])
  );

  const errorsOnly = lintWorkflowFindings(workflow, {
    config: loadConfig(process.cwd(), {}).config,
    minSeverity: 'error'
  });
  expect(errorsOnly.every((finding) => finding.severity === 'error')).toBe(true);
  expect(errorsOnly.map((finding) => finding.code)).toContain('SEC-HARDCODED-SECRET');
});
