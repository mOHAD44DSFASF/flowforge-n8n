import { TestRunResult } from '../types.js';

export function renderJUnitReport(result: TestRunResult): string {
  const tests = result.summary.cases;
  const failures = result.summary.failed;
  const cases = result.files.flatMap((file) =>
    file.results.map((testCase) => {
      const failure =
        testCase.status === 'failed'
          ? `<failure message="${escapeXml(testCase.errors.join('\n'))}"></failure>`
          : '';
      return `<testcase classname="${escapeXml(file.file)}" name="${escapeXml(testCase.name)}">${failure}</testcase>`;
    })
  );

  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="flowforge" tests="${tests}" failures="${failures}">\n${cases.join('\n')}\n</testsuite>\n`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
