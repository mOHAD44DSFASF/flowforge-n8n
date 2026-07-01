import { parseWorkflowFile } from '../core/workflowParser.js';
import { generateDocs } from '../core/docsGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

function resolveDocsOutPath(filePath: string, out?: string): string {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const defaultName = `${base}-README.md`;

  if (!out) {
    return path.join(path.dirname(filePath), defaultName);
  }

  if (fs.existsSync(out) && fs.statSync(out).isFile()) {
    return out;
  }

  const outExt = path.extname(out);
  if (fs.existsSync(out) && fs.statSync(out).isDirectory()) {
    return path.join(out, defaultName);
  }

  if (!outExt) {
    return path.join(out, defaultName);
  }

  return out;
}

export function executeDocs(filePath: string, options: { out?: string }) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    process.exit(1);
  }

  const docsContent = generateDocs(parseResult.workflow!, path.basename(filePath));
  const outPath = resolveDocsOutPath(filePath, options.out);

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, docsContent, 'utf-8');
    console.log(`\n\x1b[32m[OK] Documentation compile complete.\x1b[0m`);
    console.log(`Saved markdown README to: ${outPath}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m[ERROR] Failed to write documentation file:\x1b[0m ${message}`);
    process.exit(1);
  }

  process.exit(0);
}
