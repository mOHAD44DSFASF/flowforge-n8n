import { generatePayloads } from '../core/payloadGenerator.js';
import * as path from 'path';

export function executePayload(type: string, options: { out?: string }) {
  const outDir = options.out || path.join(process.cwd(), 'examples', 'payloads');

  try {
    const files = generatePayloads(type, outDir);
    console.log(`\n\x1b[32m[OK] Payload generation complete.\x1b[0m`);
    console.log(`Generated ${files.length} variants in directory: ${outDir}`);
    files.forEach((f) => console.log(`  - ${path.basename(f)}`));
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m[ERROR] Error generating payloads:\x1b[0m ${message}`);
    process.exit(1);
  }

  process.exit(0);
}
