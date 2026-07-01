# Slash Command: /flow:validate

## Purpose
Validate the syntax, schema, and connection integrity of an n8n workflow JSON file.

## Execution Guide
```bash
flowforge validate <filepath>
```
To receive structured output, include the `--json` option:
```bash
flowforge validate <filepath> --json
```

## Guidance
*   Report duplicate node IDs, duplicate node names, or references to missing nodes.
*   Clearly present warnings and schema errors. Do not ignore warning logs.
