import path from 'node:path';
import { expect, test } from 'vitest';
import { closestParameter, getCatalogNode, latestTypeVersion } from '../../src/catalog/index.js';
import { parseWorkflowFile } from '../../src/core/workflowParser.js';
import { validateWorkflowSemantics } from '../../src/core/semanticValidator.js';
import { N8nWorkflow } from '../../src/core/workflowSchema.js';

test('catalog lookup exposes bundled node metadata', () => {
  expect(getCatalogNode('n8n-nodes-base.webhook')?.displayName).toBe('Webhook');
  expect(latestTypeVersion('n8n-nodes-base.httpRequest')).toBe(4);
  expect(closestParameter('n8n-nodes-base.webhook', 'httpMethd')?.name).toBe('httpMethod');
});

test('semantic validation detects catalog, version, parameter, and credential issues', () => {
  const filePath = path.join(__dirname, '../fixtures/v2/semantic-errors-workflow.json');
  const parseResult = parseWorkflowFile(filePath);
  expect(parseResult.success).toBe(true);

  const findings = validateWorkflowSemantics(parseResult.workflow!);
  const codes = findings.map((finding) => finding.code);

  expect(codes).toContain('SEM-INVALID-TYPE-VERSION');
  expect(codes).toContain('SEM-UNKNOWN-PARAM');
  expect(codes).toContain('SEM-MISSING-REQUIRED-PARAM');
  expect(findings.find((finding) => finding.code === 'SEM-UNKNOWN-PARAM')?.fix?.kind).toBe(
    'rename-param'
  );
});

test('semantic validation reports missing credentials and unknown expression node references', () => {
  const workflow: N8nWorkflow = {
    nodes: [
      {
        id: '1',
        name: 'Post Slack Message',
        type: 'n8n-nodes-base.slack',
        typeVersion: 2,
        position: [0, 0],
        parameters: {
          resource: 'message',
          operation: 'post',
          text: '={{ $("Missing Node").item.json.text }}'
        }
      }
    ],
    connections: {}
  };

  const findings = validateWorkflowSemantics(workflow);
  expect(findings.map((finding) => finding.code)).toEqual(
    expect.arrayContaining(['SEM-MISSING-CREDENTIALS', 'SEM-EXPR-UNKNOWN-NODE-REF'])
  );
});
