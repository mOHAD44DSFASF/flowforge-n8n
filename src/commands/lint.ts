import { parseWorkflowFile } from '../core/workflowParser.js';
import { lintWorkflow } from '../core/workflowLinter.js';

export function executeLint(filePath: string, options: { json?: boolean }) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    if (options.json) {
      console.log(JSON.stringify({ isValid: false, issues: [{ message: parseResult.error }] }, null, 2));
    } else {
      console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    }
    process.exit(1);
  }

  const issues = lintWorkflow(parseResult.workflow!);

  if (options.json) {
    console.log(JSON.stringify(issues, null, 2));
  } else {
    console.log(`\nLinting Rules Check: ${filePath}`);
    console.log('='.repeat(40));

    if (issues.length === 0) {
      console.log('\x1b[32m[OK] No maintainability or quality issues found.\x1b[0m');
    } else {
      console.log(`Found ${issues.length} recommendation(s):\n`);
      issues.forEach((issue) => {
        const nodeStr = issue.nodeName ? ` [Node: ${issue.nodeName}]` : '';
        console.log(`  - \x1b[33m[${issue.ruleId}]\x1b[0m ${issue.message}${nodeStr}`);
      });
      console.log('');
    }
  }

  process.exit(0);
}
