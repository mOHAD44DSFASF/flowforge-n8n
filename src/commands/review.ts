import fs from 'node:fs';
import path from 'node:path';
import { parseWorkflowFile } from '../core/workflowParser.js';
import { renderReviewMarkdown, reviewWorkflows } from '../core/semanticDiff.js';

export function executeReview(
  basePath: string,
  headPath: string,
  options: { json?: boolean; out?: string } = {}
) {
  const base = parseWorkflowFile(basePath);
  const head = parseWorkflowFile(headPath);

  if (!base.success || !base.workflow) {
    console.error(`\x1b[31m[ERROR] Error parsing base workflow:\x1b[0m ${base.error}`);
    process.exit(1);
  }
  if (!head.success || !head.workflow) {
    console.error(`\x1b[31m[ERROR] Error parsing head workflow:\x1b[0m ${head.error}`);
    process.exit(1);
  }

  const report = reviewWorkflows(base.workflow, head.workflow);

  if (options.json) {
    const output = JSON.stringify(report, null, 2);
    if (options.out) writeOutput(options.out, output);
    else console.log(output);
    process.exit(report.introducedFindings.some((finding) => finding.severity === 'error') ? 1 : 0);
  }

  const markdown = renderReviewMarkdown(report);
  if (options.out) writeOutput(options.out, markdown);
  else console.log(markdown);
  process.exit(report.introducedFindings.some((finding) => finding.severity === 'error') ? 1 : 0);
}

function writeOutput(outPath: string, content: string): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
}
