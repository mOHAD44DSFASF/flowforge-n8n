import { parseWorkflowFile } from '../core/workflowParser.js';
import { generateWebhookTest } from '../core/webhookTestGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

export function executeTestWebhook(filePath: string, options: { url?: string; payload?: string }) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    process.exit(1);
  }

  const baseUrl = options.url || 'http://localhost:5678';
  const { tests, shScriptContent, readmeContent } = generateWebhookTest(parseResult.workflow!, baseUrl, options.payload);

  if (tests.length === 0) {
    console.log(`\nNo Webhook trigger nodes identified in: ${filePath}`);
    process.exit(0);
  }

  const dir = path.dirname(filePath);
  const shScriptPath = path.join(dir, 'test-webhook.sh');
  const readmePath = path.join(dir, 'test-webhook-readme.md');

  try {
    fs.writeFileSync(shScriptPath, shScriptContent, { encoding: 'utf-8', mode: 0o755 });
    fs.writeFileSync(readmePath, readmeContent, 'utf-8');

    console.log(`\n\x1b[32m[OK] Webhook test scripts generated.\x1b[0m`);
    console.log(`Exposed ${tests.length} webhook trigger(s):`);
    tests.forEach((t) => console.log(`  - Node: "${t.nodeName}" [${t.method}] on /webhook-test/${t.path}`));
    console.log(`\nSaved trigger shell script to: ${shScriptPath}`);
    console.log(`Saved instructions documentation to: ${readmePath}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m[ERROR] Failed to write webhook test files:\x1b[0m ${message}`);
    process.exit(1);
  }

  process.exit(0);
}
