import { runFlowForgeTests } from '../testing/runner.js';
import { renderJsonReport } from '../testing/reporters/json.js';
import { renderJUnitReport } from '../testing/reporters/junit.js';
import { renderTtyReport } from '../testing/reporters/tty.js';

export async function executeTest(
  pattern: string | undefined,
  options: {
    live?: boolean;
    updateSnapshots?: boolean;
    reporter?: 'tty' | 'json' | 'junit';
    filter?: string;
    bail?: boolean;
  }
) {
  try {
    const result = await runFlowForgeTests(pattern, {
      live: options.live,
      updateSnapshots: options.updateSnapshots,
      filter: options.filter,
      bail: options.bail
    });

    const reporter = options.reporter ?? 'tty';
    if (reporter === 'json') console.log(renderJsonReport(result));
    else if (reporter === 'junit') console.log(renderJUnitReport(result));
    else console.log(renderTtyReport(result));

    process.exit(result.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
  }
}
