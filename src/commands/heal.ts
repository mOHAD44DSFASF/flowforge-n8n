import { healWorkflowFile, writeHealResult } from '../healing/loop.js';

export async function executeHeal(
  filePath: string,
  options: {
    maxIterations?: string;
    write?: boolean;
    dryRun?: boolean;
    live?: boolean;
    json?: boolean;
  }
) {
  try {
    const maxIterations =
      options.maxIterations === undefined ? undefined : Number(options.maxIterations);
    if (maxIterations !== undefined && (!Number.isInteger(maxIterations) || maxIterations < 0)) {
      throw new Error('--max-iterations must be a non-negative integer.');
    }

    const result = await healWorkflowFile(filePath, {
      maxIterations,
      write: options.write,
      dryRun: options.dryRun,
      live: options.live
    });
    const written = options.dryRun
      ? { workflowPath: undefined, reportPath: undefined }
      : writeHealResult(filePath, result, { write: options.write });

    if (options.json) {
      console.log(JSON.stringify({ ...result.report, reportPath: written.reportPath }, null, 2));
    } else {
      console.log(`Heal iterations: ${result.report.iterations.length}`);
      console.log(`Changed: ${result.report.changed ? 'yes' : 'no'}`);
      console.log(`Converged: ${result.report.converged ? 'yes' : 'no'}`);
      if (written.workflowPath) console.log(`Workflow: ${written.workflowPath}`);
      console.log(
        options.dryRun ? 'Report: not written in dry-run mode' : `Report: ${written.reportPath}`
      );
    }

    process.exit(
      result.report.finalFindings.some((finding) => finding.severity === 'error') ? 1 : 0
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
  }
}
