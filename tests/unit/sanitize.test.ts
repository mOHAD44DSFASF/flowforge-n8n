import { expect, test } from 'vitest';
import { sanitizeWorkflow } from '../../src/core/workflowSanitizer.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';

test('sanitize workflow redacts keys and produces report', () => {
  const mockWorkflow: N8nWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [100, 200],
        parameters: {
          path: 'test',
          httpMethod: 'POST',
          stripeSecret: 'sk_live_dummystripe',
          slackToken: 'xoxb-dummyslack',
          adminEmail: 'test@example.com',
          internalUrl: 'http://127.0.0.1:5678/webhook/local-test',
          customConfig: {
            client_secret: 'supersecretvalue123'
          }
        }
      }
    ],
    connections: {}
  };

  // Test Standard Sanitize
  const standardResult = sanitizeWorkflow(mockWorkflow, false);
  expect(standardResult.redactedCount).toBeGreaterThan(0);
  
  const parameters = standardResult.sanitizedWorkflow.nodes[0].parameters;
  expect(parameters.stripeSecret).toBe('**REDACTED_SECRET**');
  expect(parameters.slackToken).toBe('**CREDENTIAL_PLACEHOLDER**');
  expect(parameters.customConfig.client_secret).toBe('**REDACTED_SECRET**');
  // Email should NOT be redacted in standard mode
  expect(parameters.adminEmail).toBe('test@example.com');
  expect(standardResult.reportMd).toContain('FlowForge Sanitize Report');

  // Test Strict Sanitize
  const strictResult = sanitizeWorkflow(mockWorkflow, true);
  const strictParameters = strictResult.sanitizedWorkflow.nodes[0].parameters;
  // Email should be redacted in strict mode
  expect(strictParameters.adminEmail).toBe('[REDACTED_EMAIL]');
  expect(strictParameters.internalUrl).toBe('[REDACTED_INTERNAL_ENDPOINT]');
});
