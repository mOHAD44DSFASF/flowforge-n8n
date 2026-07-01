import { parseWorkflowFile } from '../core/workflowParser.js';
import { validateWorkflow } from '../core/workflowValidator.js';

export function executeValidate(filePath: string, options: { json?: boolean }) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    if (options.json) {
      console.log(JSON.stringify({ isValid: false, errors: [{ message: parseResult.error }] }, null, 2));
    } else {
      console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    }
    process.exit(1);
  }

  const report = validateWorkflow(parseResult.workflow!);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\nAnalyzing: ${filePath}`);
    console.log('='.repeat(40));

    if (report.isValid) {
      console.log('\x1b[32m[OK] Schema structure is valid.\x1b[0m');
    } else {
      console.error(`\x1b[31m[ERROR] Schema structure validation failed with ${report.errors.length} error(s).\x1b[0m`);
    }

    if (report.errors.length > 0) {
      console.log('\nErrors:');
      report.errors.forEach((err) => {
        const nodeStr = err.nodeName ? ` [Node: ${err.nodeName}]` : '';
        console.error(`  - \x1b[31m[ERROR]\x1b[0m ${err.message}${nodeStr}`);
      });
    }

    if (report.warnings.length > 0) {
      console.log('\nWarnings:');
      report.warnings.forEach((warn) => {
        const nodeStr = warn.nodeName ? ` [Node: ${warn.nodeName}]` : '';
        console.log(`  - \x1b[33m[WARNING]\x1b[0m ${warn.message}${nodeStr}`);
      });
    }

    console.log('');
  }

  process.exit(report.isValid ? 0 : 1);
}
