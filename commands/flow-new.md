# Slash Command: /flow:new

## Purpose
Generate a new n8n workflow scaffold from a description or clone an existing template.

## Execution Guide
Instruct the agent to execute:
```bash
flowforge new "<description>" --out <optional-filepath>
```
Or to use a template:
```bash
flowforge new --template <template-name>
```

## Guidance
*   Always let the user know that generated parameters are stubs and placeholders.
*   Prompt the user to review the workflow JSON structure before importing into n8n.
