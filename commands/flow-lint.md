# Slash Command: /flow:lint

## Purpose
Examine workflow JSON files against clean coding practices, naming standards, and error-handling fallbacks.

## Execution Guide
```bash
flowforge lint <filepath>
```

## Guidance
*   Flag default ambiguous node names (e.g., "Set", "IF", "HTTP Request").
*   Alert the user if external HTTP requests do not specify error-handling retry blocks.
*   Recommend adding "Respond to Webhook" nodes to webhook triggers.
