# FlowForge n8n - CLI Commands Reference

This document provides detailed usage guidelines and examples for each command in the `flowforge` CLI.

---

## 1. `new`
Generate an n8n workflow JSON scaffold based on natural language description or copy a pre-designed workflow template.

*   **Syntax:** `flowforge new <description> [options]`
*   **Options:**
    *   `-t, --template <name>`: Installs a pre-configured template (e.g. `lead-to-crm`).
    *   `-o, --out <file>`: Target output JSON file path.
*   **Example:**
    ```bash
    flowforge new "Webhook triggers a set node, runs Code, and responds" --out my-flow.json
    ```

---

## 2. `validate`
Perform static analysis on workflow JSON to verify schema validity, unique nodes, connection integrity, and bundled node catalog semantics.

*   **Syntax:** `flowforge validate <file> [options]`
*   **Options:**
    *   `--json`: Outputs validation errors and warnings array in JSON format.
    *   `--no-semantic`: Disables bundled catalog semantic checks.
    *   `--offline`: Runs shape-only validation and skips semantic catalog checks.
*   **Example:**
    ```bash
    flowforge validate my-flow.json
    ```
*   **JSON output:** includes the legacy `isValid`, `errors`, and `warnings` keys plus a machine-actionable `findings` array. Semantic findings include fix hints when FlowForge can infer a deterministic repair, such as renaming a misspelled parameter or bumping an outdated `typeVersion`.

---

## Configuration
FlowForge looks for `flowforge.config.json` from the current directory upward. The config schema is published at `schemas/flowforge.config.schema.json`.

Supported foundation settings:

```json
{
  "offline": false,
  "rules": {
    "SEC-AUTH-HEADER": { "enabled": true, "severity": "warning" }
  },
  "validation": { "failOn": "error", "semantic": true },
  "lint": { "failOn": "error" },
  "testing": { "reporter": "tty", "bail": false, "updateSnapshots": false },
  "catalog": { "warnOnVersionSkew": true },
  "live": { "baseUrl": "https://n8n.example.test", "apiKeyEnv": "N8N_API_KEY" }
}
```

Environment overrides:

*   `FLOWFORGE_OFFLINE=1` forces offline mode.
*   `N8N_BASE_URL=https://...` overrides `live.baseUrl`.

---

## 3. `lint`
Review workflow design files against clean code and quality standards.

*   **Syntax:** `flowforge lint <file> [options]`
*   **Options:**
    *   `--json`: Outputs warnings in JSON format.
    *   `--fail-on <severity>`: Exits non-zero when findings at or above `info`, `warning`, or `error` exist.
    *   `--severity <severity>`: Shows only findings at or above `info`, `warning`, or `error`.
*   **Example:**
    ```bash
    flowforge lint my-flow.json
    ```
*   **Compatibility:** `lint --json` remains an array of issue objects with the existing `ruleId`, `severity`, and `message` keys. New issue objects also include category/fix metadata when available.

---

## 3a. `analyze`
Run the full static analysis engine and return normalized findings.

*   **Syntax:** `flowforge analyze <file> [options]`
*   **Options:**
    *   `--json`: Outputs `{ findings, summary }`.
    *   `--fail-on <severity>`: Exits non-zero when findings at or above the threshold exist.
    *   `--severity <severity>`: Filters output by minimum severity.
*   **Rule families:** reliability (`REL-*`), security (`SEC-*`), cost (`COST-*`), and maintainability (`MNT-*`).

---

## 4. `heal`
Apply deterministic safe fixes from validation and analysis findings.

*   **Syntax:** `flowforge heal <file> [options]`
*   **Options:**
    *   `--max-iterations <n>`: Maximum validate/analyze/fix iterations. Defaults to `5`.
    *   `--write`: Modify the workflow file in place.
    *   `--dry-run`: Run the loop and emit `heal-report.json` without writing workflow JSON.
    *   `--live`: Probe configured n8n access before healing; blocked by offline mode.
    *   `--json`: Prints the heal report JSON.
*   **Default write behavior:** writes `<name>.healed.json` next to the source workflow and writes `heal-report.json`.
*   **Fixes:** supports `bump-type-version`, `set-param`, `rename-param`, `set-node-property`, and `remove-param` fix hints.

```bash
flowforge heal workflows/lead.json --max-iterations 5
```

---

## 5. `mcp`
Start the FlowForge MCP server.

*   **Syntax:** `flowforge mcp [options]`
*   **Options:**
    *   `--http`: Uses Streamable HTTP instead of stdio.
    *   `--port <n>`: HTTP port. Defaults to `3333`.
*   **Example:**
    ```bash
    flowforge mcp
    flowforge mcp --http --port 3333
    ```

See [MCP.md](MCP.md) for client configuration and the tool list.

---

## 6. `sanitize`
Redact API keys, tokens, basic authentication headers, and private key blocks to generate safe sharing files.

*   **Syntax:** `flowforge sanitize <file> [options]`
*   **Options:**
    *   `-s, --strict`: Additionally redacts emails and internal URL domains.
    *   `-o, --out <file>`: Output path (defaults to `<original>.safe.json`).
*   **Example:**
    ```bash
    flowforge sanitize my-flow.json --strict
    ```

---

## 7. `payload`
Generate mock payload JSON variants for testing workflows.

*   **Syntax:** `flowforge payload <type> [options]`
*   **Options:**
    *   `-o, --out <dir>`: Target output directory (defaults to `examples/payloads`).
*   **Example:**
    ```bash
    flowforge payload lead-form --out ./test-payloads
    ```

---

## 8. `test`
Run deterministic workflow regression tests from `*.flowforge.test.json` files.

*   **Syntax:** `flowforge test [glob] [options]`
*   **Options:**
    *   `--update-snapshots`: Writes or refreshes snapshots in `__snapshots__/`.
    *   `--reporter <reporter>`: `tty`, `json`, or `junit`.
    *   `--filter <text>`: Runs cases whose name contains the text.
    *   `--bail`: Stops after the first failed case.
    *   `--live`: Probe configured n8n access before running tests; blocked by offline mode.
*   **Example:**
    ```bash
    flowforge test "tests/**/*.flowforge.test.json" --reporter json
    ```

Unsupported node types fail with `TEST-UNSUPPORTED-NODE` unless the case supplies a mock for that node.

---

## 9. `test-webhook`
Generate trigger shell scripts and curl instructions for testing active webhook triggers.

*   **Syntax:** `flowforge test-webhook <file> [options]`
*   **Options:**
    *   `-u, --url <url>`: Target domain URL of n8n instance (defaults to `http://localhost:5678`).
    *   `-p, --payload <file>`: JSON file body data to pass in curl.
*   **Example:**
    ```bash
    flowforge test-webhook my-flow.json --url http://localhost:5678 --payload valid.json
    ```

---

## 10. `diagram`
Render workflow connection paths as a text flowchart in Mermaid format.

*   **Syntax:** `flowforge diagram <file> [options]`
*   **Options:**
    *   `-o, --out <file>`: Output path (defaults to `<original>.diagram.mmd`).
*   **Example:**
    ```bash
    flowforge diagram my-flow.json
    ```

---

## 11. `docs`
Generate markdown description files documenting credentials checklist and parameter details.

*   **Syntax:** `flowforge docs <file> [options]`
*   **Options:**
    *   `-o, --out <file>`: Output path (defaults to `<original>-README.md`).
*   **Example:**
    ```bash
    flowforge docs my-flow.json
    ```

---

## 12. `explain`
Read connection tracks to describe the trigger pathways and actions sequence.

*   **Syntax:** `flowforge explain <file>`
*   **Example:**
    ```bash
    flowforge explain my-flow.json
    ```

---

## 13. `score`
Calculate a quality score out of 100 based on Security, Reliability, Testability, Maintainability, and Documentation metrics.

*   **Syntax:** `flowforge score <file> [options]`
*   **Options:**
    *   `--json`: Outputs scores breakdown.
*   **Example:**
    ```bash
    flowforge score my-flow.json
    ```

---

## 14. `diff`
Analyze two workflow revisions at the AST level and list added/removed nodes and modified parameters.

*   **Syntax:** `flowforge diff <oldFile> <newFile>`
*   **Options:**
    *   `--json`: Output semantic diff JSON.
    *   `--markdown`: Output semantic diff Markdown.
*   **Example:**
    ```bash
    flowforge diff my-flow.old.json my-flow.new.json
    ```

---

## 15. `review`
Review semantic workflow changes and introduced findings.

*   **Syntax:** `flowforge review <base> <head> [options]`
*   **Options:** `--json`, `--out <file>`

---

## 16. `eval`
Run deterministic AI-agent evals from recorded responses.

*   **Syntax:** `flowforge eval [glob] [options]`
*   **Options:** `--baseline <file>`, `--reporter tty|json`, `--live`

---

## 17. `ci`
Run offline validation, analysis, simulated tests, JSON report, and JUnit report.

*   **Syntax:** `flowforge ci [dir] [--json]`

---

## 18. `node-new`
Scaffold an n8n custom community node package folder conforming to starter standards.

*   **Syntax:** `flowforge node-new <name> [options]`
*   **Options:**
    *   `--auth <type>`: apiKey or oauth2 (default: apiKey).
    *   `--resource <name>`: Target API resource name (default: contacts).
    *   `--operation <list>`: Comma-separated operations list (default: create,list,get,update).
*   **Example:**
    ```bash
    flowforge node-new StripeCharge --auth apiKey --resource charge --operation create,refund
    ```
