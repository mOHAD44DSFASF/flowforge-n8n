import { runEval, renderEvalJson, renderEvalTty } from '../eval/runner.js';

export async function executeEval(
  pattern: string | undefined,
  options: { live?: boolean; baseline?: string; reporter?: 'tty' | 'json' } = {}
) {
  try {
    const result = await runEval(pattern, { live: options.live, baseline: options.baseline });
    if (options.reporter === 'json') console.log(renderEvalJson(result));
    else console.log(renderEvalTty(result));
    process.exit(result.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
  }
}
