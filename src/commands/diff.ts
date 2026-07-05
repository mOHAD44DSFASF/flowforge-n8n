import { parseWorkflowFile } from '../core/workflowParser.js';
import { diffWorkflows } from '../core/workflowDiff.js';
import { renderSemanticDiffMarkdown, semanticDiffWorkflows } from '../core/semanticDiff.js';

export function executeDiff(
  oldPath: string,
  newPath: string,
  options: { json?: boolean; markdown?: boolean } = {}
) {
  const oldResult = parseWorkflowFile(oldPath);
  const newResult = parseWorkflowFile(newPath);

  if (!oldResult.success) {
    console.error(`\x1b[31m[ERROR] Error parsing old workflow file:\x1b[0m ${oldResult.error}`);
    process.exit(1);
  }
  if (!newResult.success) {
    console.error(`\x1b[31m[ERROR] Error parsing new workflow file:\x1b[0m ${newResult.error}`);
    process.exit(1);
  }

  if (options.json) {
    const report = semanticDiffWorkflows(oldResult.workflow!, newResult.workflow!);
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  if (options.markdown) {
    const report = semanticDiffWorkflows(oldResult.workflow!, newResult.workflow!);
    console.log(renderSemanticDiffMarkdown(report));
    process.exit(0);
  }

  const report = diffWorkflows(oldResult.workflow!, newResult.workflow!);

  console.log('\nComparing workflows:');
  console.log(`  Old: ${oldPath}`);
  console.log(`  New: ${newPath}`);
  console.log('='.repeat(50));

  let emptyDiff = true;

  if (report.addedNodes.length > 0) {
    emptyDiff = false;
    console.log('\x1b[32m[+] Added Nodes:\x1b[0m');
    report.addedNodes.forEach((n) => console.log(`  + ${n}`));
  }

  if (report.removedNodes.length > 0) {
    emptyDiff = false;
    console.log('\x1b[31m[-] Removed Nodes:\x1b[0m');
    report.removedNodes.forEach((n) => console.log(`  - ${n}`));
  }

  if (report.modifiedNodes.length > 0) {
    emptyDiff = false;
    console.log('\x1b[33m[*] Modified Nodes:\x1b[0m');
    report.modifiedNodes.forEach((change) => {
      console.log(`  * ${change.name} (${change.type}):`);
      change.changes.forEach((c) => console.log(`    - ${c}`));
    });
  }

  if (report.addedConnections.length > 0) {
    emptyDiff = false;
    console.log('\x1b[32m[+] Added Connections:\x1b[0m');
    report.addedConnections.forEach((c) => console.log(`  + ${c}`));
  }

  if (report.removedConnections.length > 0) {
    emptyDiff = false;
    console.log('\x1b[31m[-] Removed Connections:\x1b[0m');
    report.removedConnections.forEach((c) => console.log(`  - ${c}`));
  }

  if (emptyDiff) {
    console.log('\x1b[32m[OK] Workflows are structurally identical.\x1b[0m');
  }

  console.log('');
  process.exit(0);
}
