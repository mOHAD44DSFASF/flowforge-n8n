# FlowForge n8n - Architecture Manual

This manual explains the technical layout, parsers, and plugins routing of FlowForge n8n.

---

## 1. Project Modules
*   **src/cli.ts:** Handles commander option bindings and flags routing.
*   **src/core/workflowSchema.ts:** Houses Zod models defining node connections and formats.
*   **src/core/workflowParser.ts:** Safely loads files, handles JSON format errors, and triggers schemas.
*   **src/core/workflowValidator.ts:** Examines unique properties, missing connection nodes, and trigger requirements.
*   **src/core/workflowLinter.ts:** Houses code quality checks, error-branch validation, and naming constraints.
*   **src/core/workflowSanitizer.ts:** Scans parameters recursively for high-entropy secrets and redacts them.
*   **src/custom-node/customNodeGenerator.ts:** Generates TypeScript and credentials templates for n8n community node packaging.
*   **src/core/templates.ts:** The template library defining 20 preset JSON nodes trees.

---

## 2. Plugin Lifecycle
The Claude Code plugin (`.claude-plugin/plugin.json`) points command markdown files (`commands/`) and hooks (`hooks/hooks.json`) directly to local CLI execution binaries, allowing seamless execution.
