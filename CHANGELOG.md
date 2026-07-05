# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-07-05
### Added
*   Added FlowForge Assurance v2 foundations: shared finding taxonomy, config loader, offline guard, config JSON schema, and V2 fixtures.
*   Added bundled node catalog lookup helpers and semantic workflow validation for node type versions, parameters, credentials, and expression node references.
*   Added static analysis engine with reliability, security, cost, and maintainability rules plus `lint --fail-on` and `analyze`.
*   Added deterministic workflow regression testing with `*.flowforge.test.json`, expression evaluation, supported-node simulation, mocks, snapshots, and TTY/JSON/JUnit reporters.
*   Added deterministic self-healing loop with fix appliers, `flowforge heal`, healed workflow output, and `heal-report.json`.
*   Added MCP server with stdio and Streamable HTTP transports plus FlowForge validation, analysis, test, diff, heal, payload, and sanitize tools.
*   Added semantic diff/review, deterministic AI eval replay, offline CI preset, GitHub review workflow, and security/CI documentation.

## [0.1.0] - 2026-07-01
### Added
*   Initial stable release.
*   Local-first CLI executable (`flowforge`).
*   Claude Code plugin configurations, skills manuals, and agent guidelines.
*   Connection validation schema parser.
*   Best practices static analysis linter.
*   Token/secret scan redactor sanitizer.
*   Mermaid diagramming, markdown documentation compilers, and quality scorecard metric tools.
*   20 templates directories and custom node folder generator.
