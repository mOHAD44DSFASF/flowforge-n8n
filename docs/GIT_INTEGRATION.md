# Git Integration

FlowForge can review workflow revisions before they merge.

## Local Review

```bash
flowforge diff old.workflow.json new.workflow.json --markdown
flowforge review old.workflow.json new.workflow.json --out flowforge-review.md
```

`review` includes semantic workflow changes, introduced static-analysis findings, and rough cost-finding deltas.

## Pre-commit Hook

Use the offline CI preset before committing workflow changes:

```bash
FLOWFORGE_OFFLINE=1 flowforge ci .
```

## GitHub Action

The opt-in workflow at `.github/workflows/flowforge-review.yml` runs package gates and the offline CI preset.
