import { TestRunResult } from '../types.js';

export function renderTtyReport(result: TestRunResult): string {
  const lines: string[] = [];
  for (const file of result.files) {
    lines.push(`\n${file.file}`);
    for (const testCase of file.results) {
      const mark = testCase.status === 'passed' ? '[PASS]' : '[FAIL]';
      lines.push(`  ${mark} ${testCase.name}`);
      for (const error of testCase.errors) lines.push(`    - ${error}`);
    }
  }
  lines.push(
    `\nSummary: ${result.summary.passed}/${result.summary.cases} passed across ${result.summary.files} file(s).`
  );
  return lines.join('\n');
}
