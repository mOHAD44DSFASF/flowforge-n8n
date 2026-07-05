import { expect, test } from 'vitest';
import {
  filterFindingsBySeverity,
  hasFailingFindings,
  sortFindings
} from '../../src/core/findings.js';

const findings = [
  {
    code: 'INFO-A',
    severity: 'info' as const,
    category: 'config' as const,
    message: 'Informational'
  },
  {
    code: 'ERR-A',
    severity: 'error' as const,
    category: 'schema' as const,
    message: 'Error'
  },
  {
    code: 'WARN-A',
    severity: 'warning' as const,
    category: 'security' as const,
    message: 'Warning'
  }
];

test('filters and gates findings by severity threshold', () => {
  expect(filterFindingsBySeverity(findings, 'warning').map((finding) => finding.code)).toEqual([
    'ERR-A',
    'WARN-A'
  ]);
  expect(hasFailingFindings(findings, 'error')).toBe(true);
  expect(hasFailingFindings([findings[0]], 'warning')).toBe(false);
});

test('sorts findings by severity then code', () => {
  expect(sortFindings(findings).map((finding) => finding.code)).toEqual([
    'ERR-A',
    'WARN-A',
    'INFO-A'
  ]);
});
