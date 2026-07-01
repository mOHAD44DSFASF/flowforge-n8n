# FlowForge n8n v0.1.0 - Release Notes

FlowForge n8n v0.1.0 is the initial public release of our local-first static analysis, scaffolding, testing, and documentation toolkit for n8n workflows.

---

## 1. What is Included

*   **Offline Validation Engine:** Uses strict Zod schemas to parse and locate broken connections or missing fields.
*   **Best-Practice Linter:** Static analysis to identify naming issues and unconfigured retry/error configurations.
*   **Security Sanitizer:** Deep parameter key scanners to redact secrets and generate safe-share JSON.
*   **20 review-ready workflow templates:** Preconfigured automation diagrams, payloads, and mock setups.
*   **Claude Code Plugin Framework:** Loaded directly in-context via slash commands, skills SOPs, and hooks.

---

## 2. CLI Command Index

*   `new`: Generate review-ready workflow JSON scaffolds.
*   `validate`: Verify structural JSON rules.
*   `lint`: Audit design metrics.
*   `sanitize`: Redact credential details.
*   `payload`: Output simulation payload datasets.
*   `test-webhook`: Compile webhook test triggers.
*   `diagram`: Render connections flowchart in Mermaid.
*   `docs`: Generate markdown readme checklists.
*   `explain`: Describe node flows in plain language.
*   `score`: Assess quality metrics (0-100).
*   `diff`: Compare revisions of workflow JSON.
*   `node-new`: Scaffold custom node modules folders.

---

## 3. Claude Code Plugin Slash Commands

*   `/flowforge-n8n:flow-new`
*   `/flowforge-n8n:flow-validate`
*   `/flowforge-n8n:flow-lint`
*   `/flowforge-n8n:flow-sanitize`
*   `/flowforge-n8n:flow-payload`
*   `/flowforge-n8n:flow-test-webhook`
*   `/flowforge-n8n:flow-diagram`
*   `/flowforge-n8n:flow-docs`
*   `/flowforge-n8n:flow-explain`
*   `/flowforge-n8n:flow-score`
*   `/flowforge-n8n:flow-diff`
*   `/flowforge-n8n:node-new`

---

## 4. Included Templates (20 review-ready scaffolds)

1.  `lead-to-crm`
2.  `stripe-payment-alert`
3.  `shopify-order-to-sheets`
4.  `webhook-router`
5.  `ai-email-triage`
6.  `support-ticket-classifier`
7.  `crm-enrichment`
8.  `invoice-processing`
9.  `rss-to-social`
10. `slack-approval-gate`
11. `airtable-sync`
12. `error-alerting`
13. `scheduled-report`
14. `form-to-email`
15. `google-sheets-dedup`
16. `ai-lead-qualification`
17. `webhook-to-postgres`
18. `telegram-notifier`
19. `content-repurposing`
20. `human-in-the-loop-ai`

---

## 5. Known Limitations
*   FlowForge does not run a real n8n server instance in v0.1.0.
*   Workflows generated represent review-ready scaffolds; API credentials must be configured inside your n8n visual editor UI.
*   Testing scripts do not trigger executions unless an active local n8n server is listening.

---

## 6. Upgrade Path
*   This is the initial release (`v0.1.0`). Future releases will be published directly to npm and GitHub packages.

---

## 7. Roadmap to v0.2.0
*   Integration of local n8n Docker test runner.
*   Stronger template validation schemas.
*   Auto-fixing of dynamic expressions syntax.
