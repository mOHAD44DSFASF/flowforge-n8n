import { parseWorkflowFile } from '../core/workflowParser.js';
import { validateWorkflow, ValidationReport } from '../core/workflowValidator.js';
import { validateWorkflowSemantics } from '../core/semanticValidator.js';
import { Finding } from '../core/findings.js';

export function executeValidate(
  filePath: string,
  options: { json?: boolean; semantic?: boolean; offline?: boolean }
) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    if (options.json) {
      console.log(
        JSON.stringify({ isValid: false, errors: [{ message: parseResult.error }] }, null, 2)
      );
    } else {
      console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    }
    process.exit(1);
  }

  const shapeReport = validateWorkflow(parseResult.workflow!);
  const runSemantic = options.semantic !== false && options.offline !== true;
  const semanticFindings = runSemantic ? validateWorkflowSemantics(parseResult.workflow!) : [];
  const report = mergeSemanticFindings(shapeReport, semanticFindings);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ...report,
          semantic: runSemantic,
          notices: options.offline
            ? ['Offline validation requested; semantic catalog checks were skipped.']
            : []
        },
        null,
        2
      )
    );
  } else {
    console.log(`\nAnalyzing: ${filePath}`);
    console.log('='.repeat(40));
    if (options.offline) {
      console.log(
        '\x1b[36m[INFO] Offline validation requested; semantic catalog checks were skipped.\x1b[0m'
      );
    }

    if (report.isValid) {
      console.log('\x1b[32m[OK] Schema structure is valid.\x1b[0m');
    } else {
      console.error(
        `\x1b[31m[ERROR] Schema structure validation failed with ${report.errors.length} error(s).\x1b[0m`
      );
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

    const infos = report.findings.filter((finding) => finding.severity === 'info');
    if (infos.length > 0) {
      console.log('\nInfo:');
      infos.forEach((info) => {
        const nodeStr = info.nodeName ? ` [Node: ${info.nodeName}]` : '';
        console.log(`  - \x1b[36m[${info.code}]\x1b[0m ${info.message}${nodeStr}`);
      });
    }

    console.log('');
  }

  process.exit(report.isValid ? 0 : 1);
}

function mergeSemanticFindings(
  report: ValidationReport,
  semanticFindings: Finding[]
): ValidationReport {
  const errors = [...report.errors];
  const warnings = [...report.warnings];

  for (const finding of semanticFindings) {
    if (finding.severity === 'error') {
      errors.push({
        severity: 'error',
        message: `[${finding.code}] ${finding.message}`,
        nodeId: finding.nodeId,
        nodeName: finding.nodeName
      });
    } else if (finding.severity === 'warning') {
      warnings.push({
        severity: 'warning',
        message: `[${finding.code}] ${finding.message}`,
        nodeId: finding.nodeId,
        nodeName: finding.nodeName
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    findings: [...report.findings, ...semanticFindings]
  };
}
