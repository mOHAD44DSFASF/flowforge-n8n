# Local Webhook Testing Guide

This guide explains how to test webhook trigger entrypoints in local n8n setups using scripts compiled by FlowForge.

---

## 1. Test URLs vs. Production URLs

Every n8n Webhook node exposes two distinct HTTP URLs:

1.  **Test Webhook URL:**
    *   **Structure:** `http://localhost:5678/webhook-test/<path>`
    *   **Behavior:** Only listens when you click **"Listen for test event"** inside your active n8n web editor canvas.
    *   **Response:** Captures the request payload, displays it in the editor, and runs the workflow for testing. Returns a mock payload back to the client.
    *   **Gotcha:** If you make an HTTP request to this URL when n8n is not actively listening, you will receive a `404 Webhook not found` error response.
2.  **Production Webhook URL:**
    *   **Structure:** `http://localhost:5678/webhook/<path>`
    *   **Behavior:** Active 24/7. Listens in the background.
    *   **Requirement:** The workflow must be marked **"Active"** (via the toggle switch in the top-right corner of the editor).
    *   **Gotcha:** Running curls to this URL during visual editing will trigger background executions but will not update the editor canvas.

---

## 2. Generating Test Scripts

Use the `test-webhook` command to automatically generate curl scripts for your workflow:
```bash
flowforge test-webhook workflows/my-lead.json --url http://localhost:5678 --payload valid.json
```

This compiles:
1.  **`test-webhook.sh`**: A shell script executing the target curls.
2.  **`test-webhook-readme.md`**: Custom markdown guide for manual trigger executions.

### Triggering via Curl
To simulate an incoming webhook, click "Listen for test event" inside n8n, and run the generated script:
```bash
bash test-webhook.sh
```
Or execute the raw curl command directly:
```bash
curl -X POST -H 'Content-Type: application/json' -d '{"name":"Jane Doe","email":"jane@example.com"}' "http://localhost:5678/webhook-test/lead-receiver"
```
