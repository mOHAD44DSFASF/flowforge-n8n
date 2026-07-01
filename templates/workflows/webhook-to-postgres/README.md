# Workflow Documentation: workflow.json

This documentation was compiled locally by FlowForge n8n from static workflow JSON. It is not proof that the workflow has executed successfully in n8n.

## Summary
*   **Workflow file:** `workflow.json`
*   **Total nodes:** 4
*   **Total connections:** 3
*   **Active status in JSON:** Inactive or unspecified

---

## 1. Node Topology

| Node Name | Node Type | Version | Role / Context |
| :--- | :--- | :--- | :--- |
| **DB Webhook trigger** | `n8n-nodes-base.webhook` | v1 | Webhook endpoint trigger (POST) |
| **Filter data payload** | `n8n-nodes-base.set` | v1 | Processing element |
| **HTTP Postgres insert mock** | `n8n-nodes-base.httpRequest` | v3 | Outbound HTTP API integration |
| **DB Insert respond** | `n8n-nodes-base.respondToWebhook` | v1 | Processing element |


---

## 2. Credentials Required
*   No credential objects are referenced in this JSON. HTTP/API placeholders may still require credentials before real use.

---

## 3. Local Test Helpers
1.  Generate mock JSON with `flowforge payload <type> --out <dir>`.
2.  For workflows with Webhook nodes, run `flowforge test-webhook workflow.json` to write a curl script and usage notes. The generated script is not executed automatically.

---

## 4. Diagnostics & Risk Notes
*   **Reliability warning:** HTTP Request node `HTTP Postgres insert mock` has no retry or error handling option configured.

---

## 5. n8n Runtime Notes
*   Webhook test URLs only listen while the n8n editor is waiting for a test event.
*   Production webhook URLs require the workflow to be activated in n8n.
*   Credential IDs and service-specific node parameters must be verified in the target n8n version before import or activation.
