# FlowForge n8n - CLI Commands Reference

This document provides detailed usage guidelines and examples for each command in the `flowforge` CLI.

---

## 1. `new`
Generate an n8n workflow JSON scaffold based on natural language description or copy a pre-designed workflow template.

*   **Syntax:** `flowforge new <description> [options]`
*   **Options:**
    *   `-t, --template <name>`: Installs a pre-configured template (e.g. `lead-to-crm`).
    *   `-o, --out <file>`: Target output JSON file path.
*   **Example:**
    ```bash
    flowforge new "Webhook triggers a set node, runs Code, and responds" --out my-flow.json
    ```

---

## 2. `validate`
Perform static analysis on workflow JSON to verify schema validity, unique nodes, and connection integrity.

*   **Syntax:** `flowforge validate <file> [options]`
*   **Options:**
    *   `--json`: Outputs validation errors and warnings array in JSON format.
*   **Example:**
    ```bash
    flowforge validate my-flow.json
    ```

---

## 3. `lint`
Review workflow design files against clean code and quality standards.

*   **Syntax:** `flowforge lint <file> [options]`
*   **Options:**
    *   `--json`: Outputs warnings in JSON format.
*   **Example:**
    ```bash
    flowforge lint my-flow.json
    ```

---

## 4. `sanitize`
Redact API keys, tokens, basic authentication headers, and private key blocks to generate safe sharing files.

*   **Syntax:** `flowforge sanitize <file> [options]`
*   **Options:**
    *   `-s, --strict`: Additionally redacts emails and internal URL domains.
    *   `-o, --out <file>`: Output path (defaults to `<original>.safe.json`).
*   **Example:**
    ```bash
    flowforge sanitize my-flow.json --strict
    ```

---

## 5. `payload`
Generate mock payload JSON variants for testing workflows.

*   **Syntax:** `flowforge payload <type> [options]`
*   **Options:**
    *   `-o, --out <dir>`: Target output directory (defaults to `examples/payloads`).
*   **Example:**
    ```bash
    flowforge payload lead-form --out ./test-payloads
    ```

---

## 6. `test-webhook`
Generate trigger shell scripts and curl instructions for testing active webhook triggers.

*   **Syntax:** `flowforge test-webhook <file> [options]`
*   **Options:**
    *   `-u, --url <url>`: Target domain URL of n8n instance (defaults to `http://localhost:5678`).
    *   `-p, --payload <file>`: JSON file body data to pass in curl.
*   **Example:**
    ```bash
    flowforge test-webhook my-flow.json --url http://localhost:5678 --payload valid.json
    ```

---

## 7. `diagram`
Render workflow connection paths as a text flowchart in Mermaid format.

*   **Syntax:** `flowforge diagram <file> [options]`
*   **Options:**
    *   `-o, --out <file>`: Output path (defaults to `<original>.diagram.mmd`).
*   **Example:**
    ```bash
    flowforge diagram my-flow.json
    ```

---

## 8. `docs`
Generate markdown description files documenting credentials checklist and parameter details.

*   **Syntax:** `flowforge docs <file> [options]`
*   **Options:**
    *   `-o, --out <file>`: Output path (defaults to `<original>-README.md`).
*   **Example:**
    ```bash
    flowforge docs my-flow.json
    ```

---

## 9. `explain`
Read connection tracks to describe the trigger pathways and actions sequence.

*   **Syntax:** `flowforge explain <file>`
*   **Example:**
    ```bash
    flowforge explain my-flow.json
    ```

---

## 10. `score`
Calculate a quality score out of 100 based on Security, Reliability, Testability, Maintainability, and Documentation metrics.

*   **Syntax:** `flowforge score <file> [options]`
*   **Options:**
    *   `--json`: Outputs scores breakdown.
*   **Example:**
    ```bash
    flowforge score my-flow.json
    ```

---

## 11. `diff`
Analyze two workflow revisions at the AST level and list added/removed nodes and modified parameters.

*   **Syntax:** `flowforge diff <oldFile> <newFile>`
*   **Example:**
    ```bash
    flowforge diff my-flow.old.json my-flow.new.json
    ```

---

## 12. `node-new`
Scaffold an n8n custom community node package folder conforming to starter standards.

*   **Syntax:** `flowforge node-new <name> [options]`
*   **Options:**
    *   `--auth <type>`: apiKey or oauth2 (default: apiKey).
    *   `--resource <name>`: Target API resource name (default: contacts).
    *   `--operation <list>`: Comma-separated operations list (default: create,list,get,update).
*   **Example:**
    ```bash
    flowforge node-new StripeCharge --auth apiKey --resource charge --operation create,refund
    ```
