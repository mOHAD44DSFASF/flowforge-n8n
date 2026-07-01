# Custom Node Generator Manual

This manual explains how to write and compile community nodes scaffolded by the `node-new` command.

---

## 1. Scaffold Folder Structure

Running `flowforge node-new StripeCharge --auth apiKey --resource charge` generates:

```text
custom-nodes/n8n-nodes-stripecharge/
├── package.json                   # n8n node configuration entrypoints
├── README.md                      # Custom node installation manual
├── credentials/
│   └── StripeChargeApi.credentials.ts # TypeScript API key settings template
└── nodes/
    └── StripeCharge/
        ├── StripeCharge.node.ts   # Core Node execution class
        └── StripeCharge.node.json # Metadata JSON file
```

---

## 2. File Roles & TODOs

### 2.1 `package.json`
Specifies package names (`n8n-nodes-stripecharge`) and details node paths:
*   `n8n.nodes`: Path pointing to compiled JS node code.
*   `n8n.credentials`: Path pointing to compiled JS credentials configurations.

### 2.2 `StripeChargeApi.credentials.ts`
Declares the properties displayed to users when setting up authentication. Under `properties`, add any credentials fields (API Key, Base URL, etc.) needed to access the API.

### 2.3 `StripeCharge.node.ts`
Contains node logic, input parameters, operations dropdown, and request execution rules:
*   `properties`: Fields, resource selectors, and actions list.
*   `execute`: The runtime loop parsing incoming inputs, reading parameters, and triggering remote API calls. Find `TODO` comments inside to insert helper request handlers:
    ```typescript
    // TODO: Execute HTTP request helper calling downstream APIs
    // const response = await this.helpers.requestWithAuthentication.call(...)
    ```

---

## 3. Local Installation & Testing
To compile and test the node inside your local n8n setup:
1.  Navigate into the node directory and compile TypeScript:
    ```bash
    cd custom-nodes/n8n-nodes-stripecharge
    pnpm install
    pnpm build
    ```
2.  Link the package locally:
    ```bash
    npm link
    ```
3.  Link it inside your local n8n installation directory:
    ```bash
    cd ~/.n8n/
    npm link n8n-nodes-stripecharge
    ```
    *(For docker deployments, mount the compiled folder directly into n8n container directories).*
