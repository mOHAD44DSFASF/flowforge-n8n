# FlowForge Assurance v2 Roadmap

## Completed for v0.2.0

- Shared finding taxonomy, config loader, offline guard, and v2 fixtures.
- Versioned bundled node catalog with semantic validation and reproducible update script.
- Deterministic workflow regression runner with mocks, snapshots, reports, and live-mode guard.
- Static analysis engine for security, reliability, cost, maintainability, and AI workflow risks.
- Semantic diff, review reports, eval replay, offline CI, and GitHub Action smoke workflow.
- Focused MCP server for assurance tools.
- Safe local healing loop with evidence reports and no production mutation.
- Release documentation for architecture, MCP, CI/security, Git integration, roadmap, and v0.2 notes.

## Deferred

- Exhaustive n8n node catalog coverage beyond the curated/offline snapshot.
- Full n8n runtime emulation for nodes that require n8n internals or external APIs.
- Live n8n execution harness. Current live mode only verifies configured n8n access before deterministic local checks.
- Nondeterministic natural-language evals. Default evals remain deterministic and offline.

## Compatibility Direction

- Keep existing generator, sanitizer, docs, diagram, score, and custom-node commands available.
- Prefer adding findings and report fields over changing existing JSON keys.
- Keep live integrations opt-in and blocked by `FLOWFORGE_OFFLINE=1`.
