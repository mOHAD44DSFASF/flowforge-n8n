import { parseWorkflowFile } from '../core/workflowParser.js';
import { lintWorkflow, lintWorkflowFindings } from '../core/workflowLinter.js';
import { FindingSeverity, hasFailingFindings, isFindingSeverity } from '../core/findings.js';
import { loadConfig } from '../core/config.js';

export function executeLint(
  filePath: string,
  options: { json?: boolean; failOn?: FindingSeverity; severity?: FindingSeverity }
) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    if (options.json) {
      console.log(
        JSON.stringify({ isValid: false, issues: [{ message: parseResult.error }] }, null, 2)
      );
    } else {
      console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    }
    process.exit(1);
  }

  const config = loadConfig().config;
  const minSeverity = parseSeverityOption(options.severity, '--severity');
  const failOn = parseSeverityOption(options.failOn, '--fail-on') ?? config.lint.failOn;
  const issues = lintWorkflow(parseResult.workflow!, { config, minSeverity });
  const findings = lintWorkflowFindings(parseResult.workflow!, { config, minSeverity });

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
        const color = issue.severity === 'error' ? '\x1b[31m' : '\x1b[33m';
        console.log(`  - ${color}[${issue.ruleId}]\x1b[0m ${issue.message}${nodeStr}`);
      });
      console.log('');
    }
  }

  process.exit(hasFailingFindings(findings, failOn) ? 1 : 0);
}

export function executeAnalyze(
  filePath: string,
  options: { json?: boolean; failOn?: FindingSeverity; severity?: FindingSeverity }
) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    if (options.json) {
      console.log(
        JSON.stringify({ isValid: false, findings: [{ message: parseResult.error }] }, null, 2)
      );
    } else {
      console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    }
    process.exit(1);
  }

  const config = loadConfig().config;
  const minSeverity = parseSeverityOption(options.severity, '--severity');
  const failOn = parseSeverityOption(options.failOn, '--fail-on') ?? config.lint.failOn;
  const findings = lintWorkflowFindings(parseResult.workflow!, { config, minSeverity });
  const report = {
    findings,
    summary: {
      total: findings.length,
      error: findings.filter((finding) => finding.severity === 'error').length,
      warning: findings.filter((finding) => finding.severity === 'warning').length,
      info: findings.filter((finding) => finding.severity === 'info').length
    }
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\nAnalysis: ${filePath}`);
    console.log('='.repeat(40));
    if (findings.length === 0) {
      console.log('\x1b[32m[OK] No analysis findings found.\x1b[0m');
    } else {
      for (const finding of findings) {
        const nodeStr = finding.nodeName ? ` [Node: ${finding.nodeName}]` : '';
        const color =
          finding.severity === 'error'
            ? '\x1b[31m'
            : finding.severity === 'warning'
              ? '\x1b[33m'
              : '\x1b[36m';
        console.log(`  - ${color}[${finding.code}]\x1b[0m ${finding.message}${nodeStr}`);
      }
    }
  }

  process.exit(hasFailingFindings(findings, failOn) ? 1 : 0);
}

function parseSeverityOption(value: unknown, flagName: string): FindingSeverity | undefined {
  if (value === undefined) return undefined;
  if (isFindingSeverity(value)) return value;
  console.error(`\x1b[31m[ERROR]\x1b[0m ${flagName} must be one of: info, warning, error`);
  process.exit(1);
}
