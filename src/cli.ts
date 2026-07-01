import { Command } from 'commander';
import { executeNew } from './commands/new.js';
import { executeValidate } from './commands/validate.js';
import { executeLint } from './commands/lint.js';
import { executeSanitize } from './commands/sanitize.js';
import { executePayload } from './commands/payload.js';
import { executeTestWebhook } from './commands/testWebhook.js';
import { executeDiagram } from './commands/diagram.js';
import { executeDocs } from './commands/docs.js';
import { executeExplain } from './commands/explain.js';
import { executeScore } from './commands/score.js';
import { executeDiff } from './commands/diff.js';

import { executeNodeNew } from './commands/nodeNew.js';

const program = new Command();

program
  .name('flowforge')
  .description('The AI engineering toolkit for generating, validating, testing, documenting, and debugging n8n workflows.')
  .version('0.1.0');

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
  .action((file, options) => {
    executeValidate(file, options);
  });

program
  .command('lint <file>')
  .description('Quality static linting for maintainability and security')
  .option('--json', 'Output lint report as JSON')
  .action((file, options) => {
    executeLint(file, options);
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
  .action((oldFile, newFile) => {
    executeDiff(oldFile, newFile);
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
