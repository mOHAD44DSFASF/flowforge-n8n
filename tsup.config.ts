import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    shims: true,
    minify: false,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node'
    }
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: false,
    shims: true,
    minify: false,
    sourcemap: true
  }
]);
