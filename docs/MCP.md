# FlowForge MCP

FlowForge exposes its offline validation, analysis, testing, healing, and sanitizing tools through MCP.

## Claude Desktop / Claude Code

Build the CLI, then point your MCP client at stdio:

```json
{
  "mcpServers": {
    "flowforge-n8n": {
      "command": "flowforge",
      "args": ["mcp"]
    }
  }
}
```

Use `flowforge mcp --http --port 3333` only when a Streamable HTTP endpoint is required. The HTTP server binds to `127.0.0.1` and serves `/mcp`.

## Composition

Use `n8n-mcp` for exhaustive node search and workflow generation. Use FlowForge MCP for deterministic checks after a workflow exists: validate, lint/analyze, test, sanitize, diff, and heal.

## Tools

- `flowforge_validate_workflow`
- `flowforge_lint_workflow`
- `flowforge_score_workflow`
- `flowforge_run_tests`
- `flowforge_generate_payloads`
- `flowforge_diff_workflows`
- `flowforge_explain_error`
- `flowforge_suggest_fix`
- `flowforge_heal`
- `flowforge_sanitize`
- `flowforge_explain_workflow`

Workflow tools accept either `{ "path": "workflow.json" }` or `{ "workflow": { ... } }`.
