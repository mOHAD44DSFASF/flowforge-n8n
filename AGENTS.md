# FlowForge Agent Notes

## Repository Rules

- Use `pnpm.cmd` on Windows for package scripts.
- Keep core assurance behavior local-first and deterministic by default.
- Do not call live n8n or third-party services from default tests.
- Do not commit real credentials, API keys, or generated `.flowforge/`, `tmp/`, `dist/`, or `node_modules/` artifacts.
- Preserve existing CLI commands unless a behavior is explicitly documented as unsafe or deprecated.

## Verification

Release-blocking checks:

```powershell
pnpm.cmd test
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd build
```

Useful smoke checks after `pnpm.cmd build`:

```powershell
node dist\cli.js --version
node dist\cli.js validate tests\fixtures\valid-workflow.json --json
node dist\cli.js test tests\fixtures\v2\regression-mock.flowforge.test.json --reporter json
node dist\cli.js eval tests\fixtures\v2\basic.flowforge.eval.json --reporter json
node dist\cli.js mcp --help
node dist\cli.js ci . --json
```
