import { generateCustomNode } from '../custom-node/customNodeGenerator.js';
import * as path from 'path';

function toPackageSegment(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function executeNodeNew(
  name: string,
  options: { auth: string; resource: string; operation: string }
) {
  const targetDir = path.join(process.cwd(), 'custom-nodes');

  try {
    const files = generateCustomNode(name, options, targetDir);
    const packageDir = path.join(targetDir, `n8n-nodes-${toPackageSegment(name)}`);

    console.log(`\n\x1b[32m[OK] Custom n8n node scaffold generated.\x1b[0m`);
    console.log(`Scaffolded directory: ${packageDir}`);
    console.log('Created files:');
    files.forEach((f) => console.log(`  - ${path.relative(process.cwd(), f)}`));
    console.log('\nReplace placeholder API logic and test in n8n before publishing.\n');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m[ERROR] Error scaffolding custom node:\x1b[0m ${message}`);
    process.exit(1);
  }

  process.exit(0);
}
