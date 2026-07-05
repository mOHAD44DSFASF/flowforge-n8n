import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { VERSION } from '../../src/index.js';

test('library version matches package metadata', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8')) as {
    version: string;
  };

  expect(VERSION).toBe(packageJson.version);
});
