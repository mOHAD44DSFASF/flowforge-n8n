# FlowForge n8n - Technical Specifications

This specification outlines the functions, structures, schemas, and plugin parameters of FlowForge n8n.

---

## 1. CLI Commands & Output Design

The CLI is invoked via the executable `flowforge` (or `npx @flowforge-n8n/cli`). All commands operate locally and offline.

### 1.1 Command API Details

1.  **`flowforge new "<description>"`**
    *   **Flags:** `--template <name>`, `--out <file>`
    *   **Behavior:** Analyzes description keywords to select/synthesize matching node structures and connection mappings. Output is a fully valid n8n workflow JSON, accompanied by template-defined mock payloads.
2.  **`flowforge validate <file.json>`**
    *   **Flags:** `--json`
    *   **Behavior:** Runs structural parsing via Zod. Outputs lists of any missing target IDs, duplicate node names, or invalid connection mappings.
3.  **`flowforge lint <file.json>`**
    *   **Flags:** `--json`
    *   **Behavior:** Scans the workflow against best practice rules. Logs warnings for:
        *   Hardcoded secrets or auth headers.
        *   Missing error-catch branching on HTTP / External nodes.
        *   Ambiguous Set node names (e.g. default name "Set").
        *   Orphan nodes (nodes with no inputs/outputs connected).
4.  **`flowforge sanitize <file.json>`**
    *   **Flags:** `--strict`, `--out <file>`
    *   **Behavior:** Strips actual tokens, credentials names, private keys, and user authentication identifiers, replacing them with standard placeholders. Outputs a redacted JSON file and write-ups to `.flowforge/reports/sanitize-report.md`.
5.  **`flowforge payload <type>`**
    *   **Flags:** `--out <dir>`
    *   **Behavior:** Generates a testing suite folder containing payload variants: `valid.json`, `missing-required.json`, `invalid-email.json`, `empty-body.json`, and `large-payload.json`.
6.  **`flowforge test-webhook <file.json>`**
    *   **Flags:** `--url <url>`, `--payload <file>`
    *   **Behavior:** Synthesizes executable test curl scripts (`test-webhook.sh`) and instructions to ease triggering active n8n instances.
7.  **`flowforge diagram <file.json>`**
    *   **Flags:** `--out <file>`
    *   **Behavior:** Generates a text-based Mermaid flowchart (`workflow.mmd`) visual mapping node flows, and a markdown preview.
8.  **`flowforge docs <file.json>`**
    *   **Flags:** `--out <file>`
    *   **Behavior:** Compiles detailed markdown documentation mapping all node credentials, parameters, variables, and potential failure paths.
9.  **`flowforge explain <file.json>`**
    *   **Behavior:** Deciphers execution pathways to print a clear, human-readable outline detailing trigger events, processing filters, and output actions.
10. **`flowforge score <file.json>`**
    *   **Flags:** `--json`
    *   **Behavior:** Calculates structural quality grade (0-100) based on Security, Reliability, Testability, Maintainability, and Documentation metrics.
11. **`flowforge diff <old.json> <new.json>`**
    *   **Behavior:** Displays a structural AST diff highlighting added/removed nodes, updated parameters, and re-routed connections.
12. **`flowforge node-new <name>`**
    *   **Flags:** `--auth <type>`, `--resource <name>`, `--operation <list>`
    *   **Behavior:** Generates a community-ready node development folder containing `package.json`, typescript source templates, and test check layouts aligning with `n8n-nodes-starter` guidelines.

---

## 2. Core Validation & Linter Specifications

### 2.1 Zod Schema Integration
All n8n workflow operations are checked against the following Zod model definition:
```typescript
import { z } from 'zod';

export const ConnectionLinkSchema = z.object({
  node: z.string(),
  type: z.string(),
  index: z.number()
});

export const ConnectionMainSchema = z.object({
  main: z.array(z.array(ConnectionLinkSchema))
});

export const NodeDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  typeVersion: z.number(),
  position: z.array(z.number()).length(2),
  parameters: z.record(z.any()).default({}),
  credentials: z.record(z.any()).optional()
});

export const N8nWorkflowSchema = z.object({
  meta: z.record(z.any()).optional(),
  nodes: z.array(NodeDefinitionSchema),
  connections: z.record(ConnectionMainSchema),
  active: z.boolean().optional(),
  settings: z.record(z.any()).optional()
});
```

### 2.2 Linter Rules
*   **SEC-001 (Secrets Embedded):** Node configurations must not contain raw API keys, bearer tokens, or client secrets.
*   **REL-001 (Missing Error Handling):** HTTP Request or external integrations must configure on-error behavior.
*   **REL-002 (Missing Webhook Response):** Webhook nodes with response configuration require a connected `respondToWebhook` node.
*   **MNT-001 (Ambiguous Node Names):** Node names must not match default strings like "Set", "Code", "IF".
*   **MNT-002 (Orphan Nodes):** Disconnected nodes present in the workflow (excluding Notes/Sticky cards).

---

## 3. Secret Scanner Configuration
The scanner searches for high-entropy credential patterns:
*   `sk_live_[a-zA-Z0-9]{24,}` / `sk_test_[a-zA-Z0-9]{24,}` (Stripe)
*   `xoxb-[a-zA-Z0-9-]{10,}` / `xoxp-[a-zA-Z0-9-]{10,}` (Slack)
*   `ghp_[a-zA-Z0-9]{36}` (GitHub)
*   `Bearer\s+[a-zA-Z0-9\-._~+/]+=*` (Standard headers)
*   General patterns for passwords, client secrets, and high-entropy private keys.

---

## 4. Claude Code Plugin Structure

### 4.1 Manifest (`.claude-plugin/plugin.json`)
Registers commands and plugin locations.

### 4.2 Slash Commands
*   `/flow:new`: CLI prompt generator route.
*   `/flow:validate`: Schema checks.
*   `/flow:lint`: Static analysis warnings.
*   `/flow:sanitize`: Sanitization tool.
*   `/flow:payload`: Trigger data generation.
*   `/flow:test-webhook`: Trigger scripts.
*   `/flow:diagram`: Mermaid output generator.
*   `/flow:docs`: Document output.
*   `/flow:explain`: Explain logic path.
*   `/flow:score`: Scopes grade scores.
*   `/flow:diff`: Run AST file diffs.
*   `/node:new`: Creates custom node scaffolding.

### 4.3 Skills
*   `n8n-workflow-engineer`: Instructions on creating n8n-compatible JSON workflows.
*   `n8n-custom-node-builder`: Guides on generating clean, lint-compliant community node structures.
*   `n8n-workflow-debugger`: Methods for analyzing common n8n node failure reports.

### 4.4 Agents
*   `workflow-architect`: Structural flow and logic layout reviews.
*   `workflow-reviewer`: General code patterns quality checks.
*   `workflow-security-auditor`: Validates credentials extraction compliance.
*   `custom-node-engineer`: Validates n8n community node packaging specifications.

### 4.5 Editor Hooks (`hooks/hooks.json`)
Hooks trigger on file changes to validate changes in non-blocking executions.
