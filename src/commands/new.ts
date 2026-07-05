import {
  getTemplateNames,
  writeTemplateToDir,
  scaffoldFromDescription
} from '../core/templates.js';
import { generateDocs } from '../core/docsGenerator.js';
import { generateMermaidDiagram } from '../core/diagramGenerator.js';
import { generateWebhookTest } from '../core/webhookTestGenerator.js';
import { generatePayloads } from '../core/payloadGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function executeNew(
  description: string | undefined,
  options: { template?: string; out?: string }
) {
  if (options.template) {
    const templateName = options.template.toLowerCase().trim();
    const names = getTemplateNames();

    if (!names.includes(templateName)) {
      console.error(`\x1b[31m[ERROR] Unknown template:\x1b[0m "${options.template}".`);
      console.error(`Available templates: ${names.join(', ')}`);
      process.exit(1);
    }

    const outDir = options.out || path.join(process.cwd(), 'workflows', templateName);

    try {
      const { files } = writeTemplateToDir(templateName, outDir);
      console.log(`\n\x1b[32m[OK] Template "${templateName}" scaffold generated.\x1b[0m`);
      console.log(`Created files in directory: ${outDir}`);
      files.forEach((f) => console.log(`  - ${path.relative(process.cwd(), f)}`));
      console.log('');
    } catch (err: unknown) {
      console.error(`\x1b[31m[ERROR] Error generating template:\x1b[0m ${getErrorMessage(err)}`);
      process.exit(1);
    }
  } else {
    if (!description || description.trim().length === 0) {
      console.error('\x1b[31m[ERROR] Missing workflow description.\x1b[0m');
      console.error('Usage: flowforge new "<description>" or flowforge new --template <name>');
      process.exit(1);
    }

    const workflow = scaffoldFromDescription(description);
    const outPath = options.out || path.join(process.cwd(), 'workflows', 'scaffold-workflow.json');
    const outDir = path.dirname(outPath);

    try {
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf-8');
      console.log(`\n\x1b[32m[OK] Scaffold workflow generated.\x1b[0m`);
      console.log(`Saved workflow JSON to: ${outPath}`);

      const docsContent = generateDocs(workflow, path.basename(outPath));
      const docsPath = outPath.replace(/\.json$/, '-README.md');
      fs.writeFileSync(docsPath, docsContent, 'utf-8');
      console.log(`Saved explanation README to: ${docsPath}`);

      const mmdContent = generateMermaidDiagram(workflow);
      const mmdPath = outPath.replace(/\.json$/, '.diagram.mmd');
      fs.writeFileSync(mmdPath, mmdContent, 'utf-8');
      console.log(`Saved Mermaid diagram to: ${mmdPath}`);

      const payloadDir = path.join(outDir, 'payloads');
      generatePayloads('generic', payloadDir);
      console.log(`Saved sample payload variants to: ${payloadDir}`);

      const webhookNodes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.webhook');
      if (webhookNodes.length > 0) {
        const shScriptPath = outPath.replace(/\.json$/, '-test.sh');
        const validPayloadPath = path.join(payloadDir, 'valid.json');
        const { shScriptContent } = generateWebhookTest(
          workflow,
          'http://localhost:5678',
          validPayloadPath
        );
        fs.writeFileSync(shScriptPath, shScriptContent, { encoding: 'utf-8', mode: 0o755 });
        console.log(`Saved test webhook shell script to: ${shScriptPath}`);
      }

      console.log('');
    } catch (err: unknown) {
      console.error(`\x1b[31m[ERROR] Error generating scaffold:\x1b[0m ${getErrorMessage(err)}`);
      process.exit(1);
    }
  }

  process.exit(0);
}
