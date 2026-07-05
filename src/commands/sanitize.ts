import * as fs from 'fs';
import * as path from 'path';
import { parseWorkflowFile } from '../core/workflowParser.js';
import { sanitizeWorkflow } from '../core/workflowSanitizer.js';

export function executeSanitize(filePath: string, options: { strict?: boolean; out?: string }) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    process.exit(1);
  }

  const { sanitizedWorkflow, redactedCount, reportMd } = sanitizeWorkflow(
    parseResult.workflow!,
    !!options.strict
  );

  let outPath = options.out;
  if (!outPath) {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    outPath = path.join(dir, `${base}.safe${ext}`);
  }

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(sanitizedWorkflow, null, 2), 'utf-8');
    console.log(`\n\x1b[32m[OK] Sanitize complete.\x1b[0m Redacted ${redactedCount} item(s).`);
    console.log(`Saved safe-share workflow to: ${outPath}`);

    const reportDir = path.join(process.cwd(), '.flowforge', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'sanitize-report.md');
    fs.writeFileSync(reportPath, reportMd, 'utf-8');
    console.log(`Audit report generated at: ${reportPath}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m[ERROR] Failed to write output files:\x1b[0m ${message}`);
    process.exit(1);
  }

  process.exit(0);
}
