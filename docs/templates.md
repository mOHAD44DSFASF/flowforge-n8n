# FlowForge n8n - Templates Index

This index lists the 20 workflow templates included in FlowForge n8n.

---

## Templates Directory

To scaffold a template, run `flowforge new --template <name>`.

1.  **`lead-to-crm`**
    *   *Path:* Webhook → Validate lead → Dedupe → CRM HTTP Request → Slack alert → Respond.
2.  **`stripe-payment-alert`**
    *   *Path:* Webhook → Verify event type → Save payment → Slack alert → Respond.
3.  **`shopify-order-to-sheets`**
    *   *Path:* Webhook → Transform order → Google Sheets → Email alert → Respond.
4.  **`webhook-router`**
    *   *Path:* Webhook → Route by event type → Different branches → Respond.
5.  **`ai-email-triage`**
    *   *Path:* Gmail trigger placeholder → Classify email → Label/notify → Human review.
6.  **`support-ticket-classifier`**
    *   *Path:* Webhook → Classify ticket → Priority branch → Slack/Sheets → Respond.
7.  **`crm-enrichment`**
    *   *Path:* Webhook → HTTP enrichment API → Merge fields → CRM update → Respond.
8.  **`invoice-processing`**
    *   *Path:* Webhook → Extract fields → Validate → Save → Alert.
9.  **`rss-to-social`**
    *   *Path:* Schedule → Fetch feed → Filter → Format → Social placeholder.
10. **`slack-approval-gate`**
    *   *Path:* Webhook → Slack approval request → Continue/stop branch.
11. **`airtable-sync`**
    *   *Path:* Schedule → Fetch source → Transform → Airtable upsert.
12. **`error-alerting`**
    *   *Path:* Any trigger → Main task → Error branch → Slack/Email alert.
13. **`scheduled-report`**
    *   *Path:* Schedule → Fetch metrics → Format report → Email/Slack.
14. **`form-to-email`**
    *   *Path:* Webhook → Validate form → Send email → Respond.
15. **`google-sheets-dedup`**
    *   *Path:* Webhook → Read sheet → Check duplicate → Insert or skip.
16. **`ai-lead-qualification`**
    *   *Path:* Webhook → Score lead → High/low branch → CRM/Slack.
17. **`webhook-to-postgres`**
    *   *Path:* Webhook → Validate → Insert via HTTP/API placeholder → Respond.
18. **`telegram-notifier`**
    *   *Path:* Webhook → Format message → Telegram placeholder → Respond.
19. **`content-repurposing`**
    *   *Path:* Webhook → Accept content → Split tasks → Output placeholders.
20. **`human-in-the-loop-ai`**
    *   *Path:* Webhook → AI decision placeholder → Approval gate → Action.
