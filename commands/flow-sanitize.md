# Slash Command: /flow:sanitize

## Purpose
Scrub embedded credentials, passwords, tokens, private keys, and authorization headers from n8n JSON files.

## Execution Guide
```bash
flowforge sanitize <filepath> --out <optional-filepath>
```
To trigger emails and internal endpoint redactor filters, include the `--strict` flag:
```bash
flowforge sanitize <filepath> --strict
```

## Guidance
*   Advise the user to inspect the generated redaction audit report in `.flowforge/reports/sanitize-report.md`.
*   Ensure users share the `.safe.json` copy instead of the original credentials-leaked copy.
