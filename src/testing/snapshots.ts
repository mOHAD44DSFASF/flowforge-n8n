import fs from 'node:fs';
import path from 'node:path';

export interface SnapshotResult {
  ok: boolean;
  snapshotPath: string;
  error?: string;
}

export function assertSnapshot(
  testFilePath: string,
  caseName: string,
  value: unknown,
  update: boolean
): SnapshotResult {
  const snapshotDir = path.join(path.dirname(testFilePath), '__snapshots__');
  const snapshotPath = path.join(snapshotDir, `${path.basename(testFilePath)}.snap.json`);
  const key = sanitizeCaseName(caseName);
  const snapshots = readSnapshots(snapshotPath);

  if (update) {
    fs.mkdirSync(snapshotDir, { recursive: true });
    snapshots[key] = value;
    fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshots, null, 2)}\n`);
    return { ok: true, snapshotPath };
  }

  if (!(key in snapshots)) {
    return {
      ok: false,
      snapshotPath,
      error: `TEST-SNAPSHOT-MISSING: Snapshot "${key}" is missing. Re-run with --update-snapshots to create it.`
    };
  }

  const expected = snapshots[key];
  if (JSON.stringify(expected) === JSON.stringify(value)) {
    return { ok: true, snapshotPath };
  }

  return {
    ok: false,
    snapshotPath,
    error: `TEST-SNAPSHOT-MISMATCH: Snapshot "${key}" differs. Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}.`
  };
}

function readSnapshots(snapshotPath: string): Record<string, unknown> {
  if (!fs.existsSync(snapshotPath)) return {};
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as Record<string, unknown>;
}

function sanitizeCaseName(caseName: string): string {
  return caseName
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
