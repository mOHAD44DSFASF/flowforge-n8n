import { runOfflineCi } from '../ci/offlineCi.js';

export async function executeCi(dir: string | undefined, options: { json?: boolean } = {}) {
  try {
    const result = await runOfflineCi(dir ?? '.');
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Workflows checked: ${result.workflowsChecked}`);
      console.log(`Findings: ${result.findings.length}`);
      console.log(
        `Tests: ${result.testSummary.cases - result.testSummary.failed}/${result.testSummary.cases} passed`
      );
      console.log(`Report: ${result.reportPath}`);
      console.log(`JUnit: ${result.junitPath}`);
    }
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
  }
}
