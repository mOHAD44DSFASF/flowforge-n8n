# PLAN_V2 — FlowForge n8n: the testing / CI / self-healing layer for n8n workflows

This plan maps the 8 deliverables of the v0.2 brief onto concrete modules, file formats,
and milestones. It records the architectural decisions the brief asked to be made early
(catalog sourcing, catalog storage, MCP transport) and the reasoning behind them.

Positioning: FlowForge does **not** compete with `n8n-mcp` on node search or workflow
generation. FlowForge is the layer above it — deterministic validation against real node
schemas, regression/snapshot testing, static analysis (security/cost/reliability), and a
rule-based self-healing loop. Offline-first, no credentials required, CI-native.

---

## Key decisions (brief §0.7 / §4.1)

### A. Node catalog sourcing — **bundled JSON snapshot + `update:catalog` extraction script**
- The catalog ships as a normalized, versioned JSON snapshot at `src/catalog/data/catalog.json`,
  bundled into the package (imported at build time, no runtime file resolution issues).
- `scripts/update-catalog.ts` regenerates the snapshot by introspecting an installed
  `n8n-nodes-base` / `@n8n/n8n-nodes-langchain` (loads each node class's `description`
  object and normalizes properties, displayOptions, credentials, versions). n8n is **not**
  a dependency of this package — the script requires it to be installed alongside
  (e.g. `pnpm dlx` workspace or a sibling n8n checkout) and fails with instructions otherwise.
- The snapshot records `sourceN8nVersion` + `generatedAt`; semantic validation warns on
  version skew when a live n8n reports a different version.
- **Tradeoff:** a curated snapshot covers the most common ~40 node types rather than all
  2,000+. That is deliberate — n8n-mcp already owns exhaustive node knowledge. Nodes not in
  the catalog get a clearly-labeled "not in catalog, semantic checks skipped" info finding,
  never a false error. Optional runtime enrichment from a live n8n (`/types/nodes.json`) can
  extend coverage later without changing the interface.

### B. Catalog storage — **JSON, not SQLite**
SQLite would add a native/wasm dependency for a dataset that is a few hundred KB and read
once per process. Plain JSON keeps the package pure-JS, offline, and auditable in review.

### C. MCP transport — **stdio by default, HTTP opt-in (`--http --port`)**
stdio is what Claude Code / Claude Desktop spawn; it needs zero network surface and zero
config. HTTP (Streamable HTTP transport) is available behind a flag for remote/shared use.

### D. New dependency
`@modelcontextprotocol/sdk` (official TS SDK) for D2. Everything else uses node builtins
(`node:vm` for Code-node simulation and expression evaluation, `node:http` for the optional
MCP HTTP transport, hand-rolled JUnit XML). No other runtime deps added.

---

## Cross-cutting foundations (M0)

| Concern | Module |
|---|---|
| Shared finding taxonomy (§4.3) | `src/core/findings.ts` — `Finding { code, severity, category, nodeId?, nodeName?, message, detail?, fix?, docsUrl? }`, severity ordering, `--fail-on` gating helper, machine-actionable `fix` hints (`{ kind, path, value, … }`) consumed by the healer |
| Config (§4.2) | `src/core/config.ts` + `schemas/flowforge.config.schema.json` — loads `flowforge.config.json`, zod-validated; rule toggles/severity overrides, test/eval defaults, catalog options, live n8n connection (URL/key **env only**), `offline` flag; env overrides `FLOWFORGE_OFFLINE`, `N8N_BASE_URL`, `N8N_API_KEY` |
| Offline guard (D8) | `src/core/offline.ts` — `assertOnline(feature)` throws a clear error when `FLOWFORGE_OFFLINE=1` / config `offline: true`; every live-mode entry point calls it |
| Fixtures | `tests/fixtures/` — clean real-world workflow, workflow with semantic errors, two-version diff pair, AI-agent workflow, one workflow per security smell |

Back-compat rule: existing `validate --json` / `lint --json` shapes keep their current keys;
new data is added (e.g. `findings`), never removed, and tests/docs update in the same commit.

## Deliverable → module map

### D1 Semantic validation (M1)
- `src/catalog/types.ts`, `src/catalog/index.ts` (lookup: node type → versions, parameters,
  required-ness, `displayOptions` visibility, credentials; `closestParameter()` via
  Levenshtein for misspelling detection; `latestTypeVersion()`).
- `src/core/semanticValidator.ts` → `Finding[]` with codes:
  `SEM-UNKNOWN-NODE-TYPE`, `SEM-NOT-IN-CATALOG` (info), `SEM-INVALID-TYPE-VERSION`,
  `SEM-OUTDATED-TYPE-VERSION`, `SEM-UNKNOWN-PARAM` (+ nearest-match fix), `SEM-MISSING-REQUIRED-PARAM`
  (+ default-value fix), `SEM-MISSING-CREDENTIALS`, `SEM-EXPR-UNKNOWN-NODE-REF`.
- CLI: `flowforge validate <file> [--semantic|--offline] [--json]` — semantic on by default
  (catalog is bundled so it is always available; `--offline` forces shape-only with notice).

### D5 Static analysis (M2)
- `src/analysis/types.ts` (Rule interface), `src/analysis/engine.ts` (runs enabled rules,
  applies config severity overrides), `src/analysis/rules/*.ts` one file per rule:
  `REL-NO-ERROR-HANDLING`, `REL-NON-2XX-SUCCESS` (`neverError`/`ignoreHttpStatusErrors`),
  `REL-UNBOUNDED-PAGINATION`, `REL-MISSING-WEBHOOK-RESPONSE`, `REL-RACE-CONDITION`,
  `SEC-HARDCODED-SECRET`, `SEC-AUTH-HEADER`, `SEC-PII-IN-LOGS`, `SEC-HTTP-NO-TLS`,
  `COST-LLM-IN-LOOP` (+ rough cost estimate), `COST-UNBOUNDED-TRIGGER-FANOUT`.
- Existing `lintWorkflow()` rules are folded into the engine as rules with their current
  ids preserved; `flowforge lint` output stays a superset. New: `--fail-on <severity>`,
  severity filtering, config-driven enable/disable. `flowforge analyze` = deep alias.

### D3 Regression testing (M3, flagship)
- Format `*.flowforge.test.json` (+ `schemas/flowforge.test.schema.json`):
  `{ workflow, cases: [{ name, trigger: { node?, payload }, mocks: { "<Node Name>": { output | error, … } }, expect: { output?, nodesExecuted?, notExecuted?, branch?, noSideEffects? }, snapshot? }] }`.
- `src/testing/expressions.ts` — n8n expression evaluator (`={{ … }}`, `$json`, `$('Node')`,
  `$now`, `$item`…) in a `node:vm` sandbox with frozen clock for determinism.
- `src/testing/simulator.ts` — deterministic graph interpreter. Simulated natively:
  webhook/manualTrigger/scheduleTrigger/executeWorkflowTrigger (fed by `trigger.payload`),
  `set`, `if`, `switch`, `filter`, `merge`, `code` (vm sandbox, no `require`/net),
  `noOp`, `stickyNote`, `respondToWebhook`, `splitInBatches` (bounded). Any other node type
  **must** have a mock or the case fails loudly with `TEST-UNSUPPORTED-NODE`.
- `src/testing/snapshots.ts` — `__snapshots__/<test>.snap.json`, `--update-snapshots`,
  value-level diff on mismatch (extends `workflowDiff` value-diffing).
- `src/testing/runner.ts` + `src/testing/reporters/{tty,json,junit}.ts`.
- CLI: `flowforge test [glob] --live --update-snapshots --reporter <r> --filter <s> --bail`.
- Live mode: `src/live/n8nClient.ts` (fetch-based, env-configured, `assertOnline`).

### D4 Self-healing (M4)
- `src/healing/fixes.ts` — deterministic fix appliers keyed by `Finding.fix.kind`:
  `bump-type-version`, `set-param` (documented default), `rename-param` (nearest match),
  `set-node-property` (e.g. `onError: "continueRegularOutput"`), `remove-param`.
- `src/healing/loop.ts` — validate → lint → test → pick safest confident fix → apply →
  re-run, up to `--max-iterations` (default 5); emits `heal-report.json`
  (`schemas/flowforge.heal-report.schema.json`) with per-iteration before/after diff,
  rule fired, and rationale. Writes `<name>.healed.json` unless `--write`.
- CLI: `flowforge heal <file> --max-iterations --write --dry-run --live`.

### D2 MCP server (M5)
- `src/mcp/server.ts` + `src/mcp/tools.ts`; tools:
  `flowforge_validate_workflow`, `flowforge_lint_workflow`, `flowforge_score_workflow`,
  `flowforge_run_tests`, `flowforge_generate_payloads`, `flowforge_diff_workflows`,
  `flowforge_explain_error`, `flowforge_suggest_fix`, `flowforge_heal`, `flowforge_sanitize`.
  All read-only/offline tools require no env. Inputs accept workflow JSON inline or a path.
- CLI: `flowforge mcp [--http] [--port <n>]`. Ship `.mcp.json.example`, `docs/MCP.md`
  (install + "n8n-mcp builds, FlowForge tests" composition).

### D7 Git lifecycle (M6)
- `src/core/semanticDiff.ts` — behavioral diff (nodes, connections/reroutes, parameter &
  credential & typeVersion changes, branch-logic changes) with markdown renderer;
  `flowforge diff --markdown|--json` (default text output unchanged).
- `flowforge review <base> <head>` — semantic diff + findings introduced by the change
  (delta of analysis runs) + cost impact + tests that now fail; markdown to stdout/`--out`.
- `.github/workflows/flowforge-review.yml` (opt-in Action) + documented pre-commit hook
  (`docs/GIT_INTEGRATION.md`).

### D6 AI-agent eval (M6)
- Format `*.flowforge.eval.json` (+ schema): dataset rows, expectations
  (`exact | contains | jsonSchema | toolCalls`), metrics (pass rate, tool-call accuracy,
  schema conformance); replay mode consumes recorded model responses (`recordings` map)
  so CI is deterministic; `--baseline <file>` drift detection reusing snapshot diffing.
- `src/eval/runner.ts`; CLI `flowforge eval [glob] --live --baseline --reporter`.

### D8 Offline CI (M6)
- `flowforge ci [dir]` = validate(semantic) → lint `--fail-on error` (security findings of
  any severity fail) → test (simulated) → review summary; JUnit + single exit code; zero
  network, zero secrets. `FLOWFORGE_OFFLINE=1` hard-fails any live path.
  `docs/SECURITY_AND_CI.md` documents the guarantee and catalog pinning.

## Milestones / commit plan

- **M0** `chore: add finding taxonomy, config loader, plan and fixtures` ✅ each milestone ends with build+test+lint+typecheck green
- **M1** `feat: node catalog and semantic validation (validate --semantic)`
- **M2** `feat: static analysis rule engine (lint --fail-on, analyze)`
- **M3** `feat: regression testing framework (flowforge test)`
- **M4** `feat: self-healing loop (flowforge heal)`
- **M5** `feat: MCP server (flowforge mcp)`
- **M6** `feat: semantic diff/review, AI-agent eval, offline CI preset`
- **M7** `docs: v0.2 documentation, README repositioning, changelog + version bump`

If time forces a cut, M1 and M3 are protected.

## Non-goals (guardrails)
- No node-search/generation arms race with n8n-mcp.
- No feature requires live n8n or credentials; live is always opt-in.
- No in-place mutation of user workflows without `--write`.
- No silently-skipped unsupported nodes in the test runner — loud failures only.
- No secrets on disk or in logs; sanitizer guards any output that could echo config.
