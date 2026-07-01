# FlowForge n8n - Project Roadmap

This document outlines the milestones and roadmap directions for FlowForge n8n.

---

## Project Milestones

### v0.1.0 - Initial Release (Current)
*   [x] Standalone local TypeScript CLI execution binary `flowforge`.
*   [x] Claude Code plugin integration supporting commands, skills SOPs, and safety hooks.
*   [x] 20 review-ready workflow templates and custom node scaffold creator.
*   [x] Offline linter, sanitizer, validator, and scorecards checks.

---

### v0.2.0 - Local Runner Integration
*   [ ] Local n8n Docker test runner harness.
*   [ ] Node compatibility analyzer checks.
*   [ ] Stronger workflow schema definitions and validations.

---

### v0.3.0 - Workflow Converters & Debugging
*   [ ] `from-curl`: Compile standard curl commands into HTTP request nodes.
*   [ ] `from-openapi`: Parse Swagger/OpenAPI files to generate API client workflow nodes.
*   [ ] Syntax error fixer for dynamic variables (`{{ $json.key }}`).
*   [ ] Offline execution log debugger parsing and mapping.

---

### v1.0.0 - Production Stability & Integrations
*   [ ] Stable workflow execution compatibility layer.
*   [ ] Real local test reports and validations.
*   [ ] Rich custom node generator with automated API definition generators.
