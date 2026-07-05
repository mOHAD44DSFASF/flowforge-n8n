# Launch Verification Checklist - FlowForge n8n v0.2.0

This checklist details the steps performed to audit the repository before the public launch.

---

## 1. Quality & Code Verification
- [x] Run `pnpm install` successfully.
- [x] Run `pnpm build` successfully with ESM bundling parameters.
- [x] Run `pnpm lint` successfully with zero styling failures.
- [x] Run `pnpm typecheck` successfully with zero type checking issues.
- [x] Run `pnpm test` successfully with the v0.2 assertion suite passing cleanly.

---

## 2. Command Line Interface Checks
- [x] `pnpm flowforge --help` displays all commands and description.
- [x] `pnpm flowforge validate tests/fixtures/valid-workflow.json` runs clean.
- [x] `pnpm flowforge validate tests/fixtures/invalid-workflow.json` throws schema issues and exits with code 1.
- [x] `pnpm flowforge sanitize tests/fixtures/workflow-with-secrets.json` redacts keys and writes report.
- [x] `pnpm flowforge payload lead-form --out tmp/payloads` writes mock files.
- [x] `pnpm flowforge diagram tests/fixtures/valid-workflow.json --out tmp/diagram.mmd` compiles Mermaid flowchart.
- [x] `pnpm flowforge docs tests/fixtures/valid-workflow.json --out tmp/docs` compiles explanation markdown.
- [x] `pnpm flowforge score tests/fixtures/valid-workflow.json` logs scorecard.
- [x] `pnpm flowforge analyze tests/fixtures/valid-workflow.json --json` emits static-analysis findings.
- [x] `pnpm flowforge test tests/fixtures/v2/regression-mock.flowforge.test.json --reporter json` runs simulated regression tests.
- [x] `pnpm flowforge heal <workflow> --dry-run --json` emits a deterministic heal report.
- [x] `pnpm flowforge mcp --help` exposes stdio and HTTP MCP options.
- [x] `pnpm flowforge eval tests/fixtures/v2/basic.flowforge.eval.json --reporter json` replays deterministic eval recordings.
- [x] `FLOWFORGE_OFFLINE=1 pnpm flowforge ci .` runs the offline CI preset.

---

## 3. Positioning & Security Policies
- [x] README and CLI parameters list identical options.
- [x] README makes zero claims about runtime executions or guaranteed compatibility.
- [x] 20 templates folder fully populated in the repository.
- [x] No credentials or API keys present in source code.
- [x] `.gitignore` and `.npmignore` files set correctly.
