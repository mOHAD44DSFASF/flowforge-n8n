import { Command } from 'commander';
import { executeNew } from './commands/new.js';
import { executeValidate } from './commands/validate.js';
import { executeAnalyze, executeLint } from './commands/lint.js';
import { executeSanitize } from './commands/sanitize.js';
import { executePayload } from './commands/payload.js';
import { executeTestWebhook } from './commands/testWebhook.js';
import { executeTest } from './commands/test.js';
import { executeDiagram } from './commands/diagram.js';
import { executeDocs } from './commands/docs.js';
import { executeExplain } from './commands/explain.js';
import { executeScore } from './commands/score.js';
import { executeDiff } from './commands/diff.js';
import { executeHeal } from './commands/heal.js';
import { executeMcp } from './commands/mcp.js';
import { executeReview } from './commands/review.js';
import { executeEval } from './commands/eval.js';
import { executeCi } from './commands/ci.js';

import { executeNodeNew } from './commands/nodeNew.js';

const program = new Command();

program
  .name('flowforge')
  .description(
    'The AI engineering toolkit for generating, validating, testing, documenting, and debugging n8n workflows.'
  )
  .version('0.2.0');

program
  .command('new [description]')
  .description('Generate an n8n workflow scaffold from a description or template')
  .option('-t, --template <name>', 'Use a template as a starting point')
  .option('-o, --out <file>', 'Output JSON file path')
  .action((description: string | undefined, options) => {
    executeNew(description, options);
  });

program
  .command('validate <file>')
  .description('Validate n8n workflow JSON structure')
  .option('--json', 'Output validation report as JSON')
  .option('--no-semantic', 'Disable bundled catalog semantic validation')
  .option('--offline', 'Run shape-only validation and skip semantic checks')
  .action((file, options) => {
    executeValidate(file, options);
  });

program
  .command('lint <file>')
  .description('Quality static linting for maintainability and security')
  .option('--json', 'Output lint report as JSON')
  .option(
    '--fail-on <severity>',
    'Exit non-zero when findings at or above severity exist: info, warning, error'
  )
  .option('--severity <severity>', 'Only show findings at or above severity: info, warning, error')
  .action((file, options) => {
    executeLint(file, options);
  });

program
  .command('analyze <file>')
  .description('Deep static analysis for security, reliability, cost, and maintainability')
  .option('--json', 'Output analysis report as JSON')
  .option(
    '--fail-on <severity>',
    'Exit non-zero when findings at or above severity exist: info, warning, error'
  )
  .option('--severity <severity>', 'Only show findings at or above severity: info, warning, error')
  .action((file, options) => {
    executeAnalyze(file, options);
  });

program
  .command('sanitize <file>')
  .description('Sanitize and redact credentials or keys to create safe-share JSON')
  .option('-s, --strict', 'Strict mode redacts email addresses and internal endpoints')
  .option('-o, --out <file>', 'Output path for sanitized JSON')
  .action((file, options) => {
    executeSanitize(file, options);
  });

program
  .command('payload <type>')
  .description('Generate sample simulation payloads for testing workflows')
  .option('-o, --out <dir>', 'Output directory for generated payloads')
  .action((type, options) => {
    executePayload(type, options);
  });

program
  .command('test-webhook <file>')
  .description('Generate local webhook curl scripts without executing them')
  .option('-u, --url <url>', 'Endpoint URL of testing instance')
  .option('-p, --payload <file>', 'JSON file containing post body data')
  .action((file, options) => {
    executeTestWebhook(file, options);
  });

program
  .command('test [glob]')
  .description('Run deterministic FlowForge workflow regression tests')
  .option('--live', 'Run tests against a live n8n instance')
  .option('--update-snapshots', 'Write or update stored snapshots')
  .option('--reporter <reporter>', 'Reporter: tty, json, or junit', 'tty')
  .option('--filter <text>', 'Only run test cases whose name contains text')
  .option('--bail', 'Stop after the first failed test case')
  .action((glob, options) => {
    executeTest(glob, options);
  });

program
  .command('diagram <file>')
  .description('Generate Mermaid workflow flowcharts')
  .option('-o, --out <file>', 'Output path for mmd diagram')
  .action((file, options) => {
    executeDiagram(file, options);
  });

program
  .command('docs <file>')
  .description('Generate markdown documentation for the workflow')
  .option('-o, --out <file>', 'Output path for generated markdown')
  .action((file, options) => {
    executeDocs(file, options);
  });

program
  .command('explain <file>')
  .description('Analyze and explain the workflow path in plain language')
  .action((file) => {
    executeExplain(file);
  });

program
  .command('score <file>')
  .description('Calculate n8n workflow quality scoring (0-100)')
  .option('--json', 'Output score report as JSON')
  .action((file, options) => {
    executeScore(file, options);
  });

program
  .command('diff <oldFile> <newFile>')
  .description('Print human-readable structural changes between two workflow revisions')
  .option('--json', 'Output semantic diff JSON')
  .option('--markdown', 'Output semantic diff Markdown')
  .action((oldFile, newFile, options) => {
    executeDiff(oldFile, newFile, options);
  });

program
  .command('review <base> <head>')
  .description('Review semantic workflow changes and introduced findings')
  .option('--json', 'Output review report as JSON')
  .option('--out <file>', 'Write report to a file')
  .action((base, head, options) => {
    executeReview(base, head, options);
  });

program
  .command('eval [glob]')
  .description('Run deterministic AI-agent evals from recorded model responses')
  .option('--live', 'Run live eval mode')
  .option('--baseline <file>', 'Compare against a previous JSON eval report')
  .option('--reporter <reporter>', 'Reporter: tty or json', 'tty')
  .action((glob, options) => {
    executeEval(glob, options);
  });

program
  .command('ci [dir]')
  .description('Run offline FlowForge CI checks with one exit code')
  .option('--json', 'Output CI report as JSON')
  .action((dir, options) => {
    executeCi(dir, options);
  });

program
  .command('heal <file>')
  .description('Apply deterministic validation and analysis fixes to a workflow')
  .option('--max-iterations <n>', 'Maximum heal iterations', '5')
  .option('--write', 'Modify the workflow file in place')
  .option('--dry-run', 'Run healing and emit a report without writing workflow JSON')
  .option('--live', 'Allow live-mode healing checks')
  .option('--json', 'Output heal report as JSON')
  .action((file, options) => {
    executeHeal(file, options);
  });

program
  .command('mcp')
  .description('Start the FlowForge MCP server over stdio or HTTP')
  .option('--http', 'Use Streamable HTTP transport instead of stdio')
  .option('--port <n>', 'HTTP port', '3333')
  .action((options) => {
    executeMcp(options);
  });

program
  .command('node-new <name>')
  .description('Scaffold editable custom n8n community node files')
  .option('--auth <type>', 'Auth mechanism: apiKey or oauth2', 'apiKey')
  .option('--resource <name>', 'Primary API resource name', 'contacts')
  .option('--operation <list>', 'Comma-separated operations list', 'create,list,get,update')
  .action((name, options) => {
    executeNodeNew(name, options);
  });

program.parse(process.argv);
