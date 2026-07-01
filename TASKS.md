# FlowForge n8n - Implementation Checklist

This checklist tracks task completion phases for the development of FlowForge n8n.

## Phase 1: Environment & Tooling Configuration
- [ ] Initialize configuration files:
  - [ ] `package.json` specifying dependencies, scripts, build steps, and cli binaries.
  - [ ] `tsconfig.json` set to target modern Node modules.
  - [ ] `tsup.config.ts` configured for packaging CLI.
  - [ ] `vitest.config.ts` for execution of test files.
  - [ ] `.gitignore` mapping Node modules and CLI logs.
  - [ ] `eslint.config.js` and `prettier.config.js` configurations.

## Phase 2: CLI Command Definitions & Parsing
- [ ] Create `src/cli.ts` configuring Commander.js commands and flags.
- [ ] Implement core parser structures and Zod schemas in `src/core/workflowSchema.ts`.
- [ ] Connect core script bindings to the CLI options execution routes.

## Phase 3: Core Logic Modules
- [ ] Implement `flowforge validate` command:
  - [ ] Node schema checks.
  - [ ] Duplicated node name detection.
  - [ ] Invalid link routing checks.
- [ ] Implement `flowforge lint` command:
  - [ ] Secret detection warnings.
  - [ ] Retry settings checks.
  - [ ] Ambiguous name warnings.
  - [ ] Disconnected/orphan node discovery.
- [ ] Implement `flowforge sanitize` command:
  - [ ] Regex redactions for high-entropy secrets and authentication strings.
  - [ ] Output `workflow.safe.json`.
  - [ ] Write sanitization report to `.flowforge/reports/sanitize-report.md`.

## Phase 4: Data & Documentation Exporters
- [ ] Implement `flowforge payload` command:
  - [ ] Generate JSON variants: `valid`, `missing-required`, `invalid-email`, `empty`, `large-payload`.
- [ ] Implement `flowforge test-webhook` command:
  - [ ] Generate curl testing script (`test-webhook.sh`).
  - [ ] Write request headers and parameter outlines.
- [ ] Implement `flowforge diagram` command:
  - [ ] Translate connection references to Mermaid flowchart schemas.
- [ ] Implement `flowforge docs` command:
  - [ ] Compile markdown descriptions, credentials checklist, and parameter tables.

## Phase 5: Deep Analysis Engines
- [ ] Implement `flowforge score` command:
  - [ ] Assess structural metrics across Security, Reliability, Testability, Maintainability, and Documentation.
- [ ] Implement `flowforge explain` command:
  - [ ] Output structural execution path walkthroughs in plain English.
- [ ] Implement `flowforge diff` command:
  - [ ] Run structural AST diffs on added/removed/modified nodes and parameters.

## Phase 6: Custom Node & Workflow Templates Library
- [ ] Implement `flowforge node-new` command:
  - [ ] Scaffolds community node directories following `n8n-nodes-starter` guidelines.
- [ ] Create 20 template directories under `templates/workflows/` (each including `workflow.json`, `README.md`, payloads, test scripts, credential checks):
  1. `lead-to-crm`
  2. `stripe-payment-alert`
  3. `shopify-order-to-sheets`
  4. `webhook-router`
  5. `ai-email-triage`
  6. `support-ticket-classifier`
  7. `crm-enrichment`
  8. `invoice-processing`
  9. `rss-to-social`
  10. `slack-approval-gate`
  11. `airtable-sync`
  12. `error-alerting`
  13. `scheduled-report`
  14. `form-to-email`
  15. `google-sheets-dedup`
  16. `ai-lead-qualification`
  17. `webhook-to-postgres`
  18. `telegram-notifier`
  19. `content-repurposing`
  20. `human-in-the-loop-ai`

## Phase 7: Claude Code Plugin Integration
- [ ] Create `.claude-plugin/plugin.json`.
- [ ] Add slash command markdown guides under `commands/`.
- [ ] Build skill directories (`skills/n8n-workflow-engineer`, `skills/n8n-custom-node-builder`, `skills/n8n-workflow-debugger`) containing custom `SKILL.md` instruction files.
- [ ] Set up AI agent rules under `agents/` and hook configurations under `hooks/hooks.json`.

## Phase 8: Verification & Packaging
- [ ] Design SVG brand assets (`logo.svg`, `icon.svg`, `banner.svg`).
- [ ] Write Vitest unit test suites.
- [ ] Verify execution: build compiles, linter runs cleanly, unit tests pass.
- [ ] Publish layout configs, CI/CD scripts, and document files.
