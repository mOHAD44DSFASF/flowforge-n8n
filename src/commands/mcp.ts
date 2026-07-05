import { serveMcp } from '../mcp/server.js';

export function executeMcp(options: { http?: boolean; port?: string }) {
  const port = options.port === undefined ? undefined : Number(options.port);
  if (port !== undefined && (!Number.isInteger(port) || port <= 0)) {
    console.error('\x1b[31m[ERROR]\x1b[0m --port must be a positive integer.');
    process.exit(1);
  }

  serveMcp({ http: options.http, port }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
  });
}
