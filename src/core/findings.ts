export type FindingSeverity = 'info' | 'warning' | 'error';

export type FindingCategory =
  | 'schema'
  | 'semantic'
  | 'security'
  | 'reliability'
  | 'cost'
  | 'maintainability'
  | 'testing'
  | 'config';

export interface FindingFix {
  kind: 'bump-type-version' | 'set-param' | 'rename-param' | 'set-node-property' | 'remove-param';
  path: string;
  value?: unknown;
  from?: string;
  to?: string;
  rationale?: string;
}

export interface Finding {
  code: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  nodeId?: string;
  nodeName?: string;
  detail?: string;
  fix?: FindingFix;
  docsUrl?: string;
}

const severityRank: Record<FindingSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2
};

export function compareSeverity(a: FindingSeverity, b: FindingSeverity): number {
  return severityRank[a] - severityRank[b];
}

export function isFindingSeverity(value: unknown): value is FindingSeverity {
  return value === 'info' || value === 'warning' || value === 'error';
}

export function severityMeetsThreshold(
  severity: FindingSeverity,
  threshold: FindingSeverity
): boolean {
  return severityRank[severity] >= severityRank[threshold];
}

export function filterFindingsBySeverity(
  findings: Finding[],
  threshold: FindingSeverity
): Finding[] {
  return findings.filter((finding) => severityMeetsThreshold(finding.severity, threshold));
}

export function hasFailingFindings(findings: Finding[], threshold: FindingSeverity): boolean {
  return filterFindingsBySeverity(findings, threshold).length > 0;
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const severityDiff = compareSeverity(b.severity, a.severity);
    if (severityDiff !== 0) return severityDiff;
    return a.code.localeCompare(b.code);
  });
}
