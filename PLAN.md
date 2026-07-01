# FlowForge n8n - Development Plan

FlowForge n8n (`flowforge-n8n`) is a local-first TypeScript CLI and Claude Code plugin engineering toolkit for generating, validating, linting, sanitizing, testing, scoring, explaining, documenting, diagramming, and scaffolding n8n workflows.

This revised plan defines the CLI-first and plugin-first development strategy.

---

## 1. Project Objectives
*   **CLI-First Developer Experience:** A high-quality TypeScript CLI (`flowforge`) providing workflow manipulation, inspection, and generation commands.
*   **Claude Code Plugin Integration:** Complete plugin layout utilizing `.claude-plugin/plugin.json`, slash command markdown files, customized skills, and agents.
*   **Offline-First & Security-Focused:** Perform static analysis, linting, Zod schema validation, and secret sanitization completely offline without requiring paid API dependencies.
*   **Standards Compliant:** Scaffold custom n8n community nodes conforming to official n8n structure and node packaging conventions.

---

## 2. Technology Stack
*   **Runtime:** Node.js v20+
*   **Language:** TypeScript v5+
*   **Package Manager:** pnpm v10+
*   **Build Tool:** `tsup` for bundling the TypeScript codebase into a standalone executable.
*   **Runner Tool:** `tsx` for high-speed local dev/execution of TypeScript files.
*   **Testing:** Vitest for testing suite execution.
*   **CLI Library:** Commander.js or CAC for command configurations.
*   **Schemas & Parsing:** Zod for n8n workflow validation.
*   **Helpers:** `fast-glob` for workflow files discovery, `chalk` for terminal styling.

---

## 3. Development Phases

### Phase 1: Planning and Scaffolding (Current)
*   Finalize specifications, architecture, and task logs.
*   Setup monorepo/package structures: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`.
*   Establish terminal script shortcuts.

### Phase 2: Core Parsing & Schema Validation
*   Define n8n workflow JSON schemas using Zod.
*   Implement `flowforge validate` command validating node names uniqueness, connection wiring integrity, and parameter properties.
*   Add unit tests verifying parsing logic.

### Phase 3: Linter & Secret Sanitizer
*   Implement `flowforge lint` static analysis rules (orphan nodes, missing error branching, hardcoded auth warning).
*   Develop `flowforge sanitize` scanning for high-entropy tokens and private keys, outputting a safe JSON workflow copy alongside a markdown audit report.

### Phase 4: Data & Test Exporters
*   Build `flowforge payload` generating mockup JSON test arrays (valid, missing fields, invalid types).
*   Build `flowforge test-webhook` generating local webhook test scripts (`test-webhook.sh`, curl commands list, Postman draft schemas).
*   Create documentation generator (`flowforge docs`) mapping credentials checklist and parameter details.
*   Develop static Mermaid diagram generator (`flowforge diagram`) to export `.mmd` workflow diagrams.

### Phase 5: Workflow Explainer, Scorer, and Diff
*   Develop `flowforge score` evaluating quality metrics across Reliability, Security, Testability, Maintainability, and Documentation.
*   Implement `flowforge explain` generating readable walkthroughs of workflow execution pathways.
*   Develop AST-based comparison engine (`flowforge diff`) displaying specific added/deleted/changed nodes and params.

### Phase 6: Custom Node & Template Systems
*   Implement `flowforge node-new` scaffolding official n8n community node directory structures (TypeScript handlers, properties, metadata schemas, test placeholders).
*   Generate 20 comprehensive n8n workflow template JSON files with complete READMEs, test scripts, and payload variants.

### Phase 7: Claude Code Plugin & Brand Assets
*   Assemble `.claude-plugin/plugin.json`, slash command md scripts, skills manuals, agent configuration parameters, and safe event hook JSON rules.
*   Create SVG brand assets (`logo.svg`, `icon.svg`, `banner.svg`).

### Phase 8: Verification & Release
*   Add Vitest test suites, coverage reports, and continuous integration workflows.
*   Configure GitHub Actions, issues templates, and documentation.
