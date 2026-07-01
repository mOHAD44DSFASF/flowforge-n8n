import { parseWorkflowFile } from '../core/workflowParser.js';
import { explainWorkflow } from '../core/workflowExplainer.js';

export function executeExplain(filePath: string) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    process.exit(1);
  }

  const explanation = explainWorkflow(parseResult.workflow!);
  console.log('\n' + explanation + '\n');
  process.exit(0);
}
