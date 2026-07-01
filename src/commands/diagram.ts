import { parseWorkflowFile } from '../core/workflowParser.js';
import { generateMermaidDiagram } from '../core/diagramGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

export function executeDiagram(filePath: string, options: { out?: string }) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    process.exit(1);
  }

  const mmdContent = generateMermaidDiagram(parseResult.workflow!);

  let outPath = options.out;
  if (!outPath) {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    outPath = path.join(dir, `${base}.diagram.mmd`);
  }

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, mmdContent, 'utf-8');

    const mdPath = outPath.replace(/\.mmd$/, '.diagram.md');
    const mdWrapper = `# Mermaid Workflow Diagram

Copy the block below into Mermaid Live Editor or render it in a markdown reader:

\`\`\`mermaid
${mmdContent}\`\`\`
`;
    fs.writeFileSync(mdPath, mdWrapper, 'utf-8');

    console.log(`\n\x1b[32m[OK] Mermaid flowchart compiled.\x1b[0m`);
    console.log(`Saved Mermaid code to: ${outPath}`);
    console.log(`Saved Markdown preview to: ${mdPath}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m[ERROR] Failed to write diagram files:\x1b[0m ${message}`);
    process.exit(1);
  }

  process.exit(0);
}
