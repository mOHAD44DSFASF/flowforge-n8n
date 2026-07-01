# Workflow Quality Scorecard Manual

This guide explains the metrics, evaluation weights, and validation rules behind the `score` command.

---

## 1. Quality Dimensions & Weights

The total scorecard is graded out of 100 points, broken down into five core dimensions:

| Dimension | Max Points | Core Checks |
| :--- | :--- | :--- |
| **Reliability** | 25 pts | Connection orphans, HTTP catch blocks, webhook response matches |
| **Security** | 25 pts | Hardcoded API keys/tokens, Authorization headers checks |
| **Testability** | 20 pts | Trigger configuration types, manual trigger testing hooks |
| **Maintainability** | 20 pts | Custom node naming checks, sticky notes presence for large layouts |
| **Documentation** | 10 pts | Explanatory sticky notes, parameters annotations |

---

## 2. Calculation Rules & Deductions

### 2.1 Reliability (25 pts)
*   **Orphan Nodes (deduct 5 pts):** Disconnected nodes present in the workspace can indicate broken execution logic.
*   **Missing Error Catch (deduct 5 pts per node):** External HTTP integrations should specify `onError` or `retryOnFail` parameters.
*   **Unanswered Webhooks (deduct 10 pts):** Webhook trigger workflows require a corresponding `Respond to Webhook` node.

### 2.2 Security (25 pts)
*   **Hardcoded Tokens (deduct 15 pts):** Workflows containing raw keys (`sk_live_`, `xoxb-`, etc.) are heavily penalized.
*   **Hardcoded Auth Headers (deduct 10 pts):** Outbound HTTP calls should reference credentials configurations instead of hardcoded Authorization fields.

### 2.3 Testability (20 pts)
*   **No Trigger (deduct 10 pts):** Workflows must start with a valid trigger node.
*   **No Manual Shortcut (deduct 5 pts):** Workflows should include a manual trigger block for visual playground runs.

### 2.4 Maintainability (20 pts)
*   **Ambiguous Names (deduct 10 pts):** Nodes matching default names (e.g. "Set", "IF", "Code") must be renamed to explain their function.
*   **Size limit without notes (deduct 5 pts):** Large workflows (>20 nodes) require Sticky Notes annotations.

### 2.5 Documentation (10 pts)
*   **No Annotations (deduct 5 pts):** Checked against sticky notes.
*   **No Notices (deduct 5 pts):** Checked against node `notes` parameter blocks.
