# Claude Code Plugin Integration Manual

This manual explains how to load, configure, and execute the FlowForge n8n plugin inside Claude Code workspaces.

---

## 1. What the Plugin Adds
The FlowForge n8n plugin extends Claude Code with:
*   **Slash Commands:** Native shortcuts targeting workflow generations, validations, sanitizations, diagramming, and scorecard scoring.
*   **Skills SOPs:** Instilled rules to help Claude generate schema-compliant nodes and connections.
*   **AI Agents System Prompts:** Guidelines for specialized review roles.
*   **Validation Hooks:** Save/pre-commit check triggers that run `flowforge validate` and `flowforge lint` in the background to flag issues.

---

## 2. Local Testing (Development)
To load the plugin locally from this repository directory:
1.  Verify the CLI is compiled:
    ```bash
    pnpm install
    pnpm build
    ```
2.  Launch Claude Code pointing to this plugin folder directory:
    ```bash
    claude --plugin-dir .
    ```
3.  Verify the plugin is loaded by running `/reload-plugins` and checking for available slash commands.

---

## 3. Marketplace Installation (Production)
After publishing the repository to your public GitHub profile, you can register and install the plugin from your marketplace layout:
1.  Add your repository to your Claude Code marketplace:
    ```text
    /plugin marketplace add mOHAD44DSFASF/flowforge-n8n
    ```
2.  Install the plugin:
    ```text
    /plugin install flowforge-n8n@flowforge-n8n
    ```
3.  Reload the plugin registry:
    ```text
    /reload-plugins
    ```

---

## 4. Available Slash Commands

| Slash Command | Local CLI Command Invoked |
| :--- | :--- |
| `/flowforge-n8n:flow-new` | `flowforge new` |
| `/flowforge-n8n:flow-validate` | `flowforge validate` |
| `/flowforge-n8n:flow-lint` | `flowforge lint` |
| `/flowforge-n8n:flow-sanitize` | `flowforge sanitize` |
| `/flowforge-n8n:flow-payload` | `flowforge payload` |
| `/flowforge-n8n:flow-test-webhook`| `flowforge test-webhook` |
| `/flowforge-n8n:flow-diagram` | `flowforge diagram` |
| `/flowforge-n8n:flow-docs` | `flowforge docs` |
| `/flowforge-n8n:flow-explain` | `flowforge explain` |
| `/flowforge-n8n:flow-score` | `flowforge score` |
| `/flowforge-n8n:flow-diff` | `flowforge diff` |
| `/flowforge-n8n:node-new` | `flowforge node-new` |

---

## 5. Example Prompts & Use Cases

*   **Create dynamic workflows:**
    ```text
    /flowforge-n8n:flow-new Create a workflow that receives leads from a webhook, validates email, stores them in Google Sheets, notifies Slack, and responds with JSON.
    ```
*   **Validate connection graphs:**
    ```text
    /flowforge-n8n:flow-validate workflows/lead.workflow.json
    ```
*   **Sanitize credentials keys:**
    ```text
    /flowforge-n8n:flow-sanitize workflows/lead.workflow.json
    ```
*   **Render Mermaid schema diagrams:**
    ```text
    /flowforge-n8n:flow-diagram workflows/lead.workflow.json
    ```
*   **Build documentation READMEs:**
    ```text
    /flowforge-n8n:flow-docs workflows/lead.workflow.json
    ```
*   **Scaffold custom integrations:**
    ```text
    /flowforge-n8n:node-new Create a custom n8n node scaffold for a CRM API using API key authentication.
    ```

---

## 6. Troubleshooting
If the plugin commands do not appear or crash:
*   Ensure Claude Code is updated to the latest release version.
*   Check the `/plugin Errors` tab inside your Claude Code terminal UI.
*   Run the command `/reload-plugins` to reload modules.
*   Make sure you ran `pnpm install` and `pnpm build` in your local clone.
*   Verify the standalone CLI works locally by running `pnpm flowforge --help`.
*   Ensure your repository is marked public on GitHub and contains a valid `.claude-plugin/marketplace.json` manifest.

---

## 7. Safety Note
Plugin validation hooks perform strict read-only static analysis scans (`validate` and `lint`) on save. **They must not delete, write, or rewrite user files automatically** without explicit workspace consent.
