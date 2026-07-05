# FlowForge n8n v0.2.0 - Assurance Layer

FlowForge n8n v0.2.0 repositions the project as the deterministic testing, CI, review, and self-healing layer for n8n workflow JSON.

## Highlights

- Bundled node catalog and semantic validation.
- Shared finding taxonomy, config loader, and offline guard.
- Static analysis engine for reliability, security, cost, and maintainability.
- Deterministic regression test runner with expressions, mocks, snapshots, and TTY/JSON/JUnit reporters.
- Self-healing loop with machine-actionable fix hints and `heal-report.json`.
- MCP server over stdio or Streamable HTTP.
- Semantic diff and review reports for Git workflows.
- Deterministic AI-agent eval replay.
- Offline CI preset with JSON and JUnit reports.

## Verification

Release gates:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

The release remains offline-first. Live n8n modes are opt-in and guarded by `FLOWFORGE_OFFLINE`.
