import { parseWorkflowFile } from '../core/workflowParser.js';
import { scoreWorkflow } from '../core/workflowScorer.js';

export function executeScore(filePath: string, options: { json?: boolean }) {
  const parseResult = parseWorkflowFile(filePath);

  if (!parseResult.success) {
    if (options.json) {
      console.log(JSON.stringify({ isValid: false, errors: [{ message: parseResult.error }] }, null, 2));
    } else {
      console.error(`\x1b[31m[ERROR] Error parsing workflow file:\x1b[0m ${parseResult.error}`);
    }
    process.exit(1);
  }

  const report = scoreWorkflow(parseResult.workflow!);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const s = report.score;
    console.log(`\nFlowForge Quality Scorecard: ${filePath}`);
    console.log('='.repeat(50));
    console.log(`  Reliability:     ${s.reliability}/25`);
    console.log(`  Security:        ${s.security}/25`);
    console.log(`  Testability:     ${s.testability}/20`);
    console.log(`  Maintainability: ${s.maintainability}/20`);
    console.log(`  Documentation:   ${s.documentation}/10`);
    console.log('-'.repeat(50));

    let scoreColor = '\x1b[31m';
    if (s.total >= 80) {
      scoreColor = '\x1b[32m';
    } else if (s.total >= 50) {
      scoreColor = '\x1b[33m';
    }

    console.log(`  \x1b[1mTOTAL SCORE:     ${scoreColor}${s.total}/100\x1b[0m`);
    console.log('='.repeat(50));

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations for Improvement:');
      report.recommendations.forEach((rec) => console.log(`  - ${rec}`));
      console.log('');
    } else {
      console.log('\x1b[32m  [OK] No improvements recommended by static scoring.\x1b[0m\n');
    }
  }

  process.exit(0);
}
