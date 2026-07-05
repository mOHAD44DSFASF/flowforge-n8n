# Security And CI

FlowForge Assurance v2 is offline-first. The CI preset forces `FLOWFORGE_OFFLINE=1`, performs no live n8n calls, and never requires secrets.

## Offline CI

```bash
flowforge ci .
```

The preset:

- validates workflow JSON and bundled catalog semantics
- runs static analysis
- fails on any error finding
- fails on any security finding regardless of severity
- runs simulated `*.flowforge.test.json` tests
- writes `.flowforge/reports/flowforge-ci-report.json`
- writes `.flowforge/reports/flowforge-ci-junit.xml`

Live flags are guarded by `assertOnline()` and fail when offline mode is active.

## Catalog Pinning

The bundled catalog snapshot records the n8n source version in `src/catalog/data/catalog.json`. CI uses that snapshot, so validation remains deterministic without network access.
