import { N8nWorkflow } from './workflowSchema.js';

export interface SanitizeResult {
  sanitizedWorkflow: N8nWorkflow;
  redactedCount: number;
  reportMd: string;
}

type MutableJsonObject = Record<string, unknown>;

const secretRegexes: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  { name: 'Stripe Live Secret Key', pattern: /sk_live_[a-zA-Z0-9]{8,}/g, replacement: '**REDACTED_SECRET**' },
  { name: 'Stripe Test Secret Key', pattern: /sk_test_[a-zA-Z0-9]{8,}/g, replacement: '**REDACTED_SECRET**' },
  { name: 'Slack Bot Token', pattern: /xoxb-[a-zA-Z0-9-]{8,}/g, replacement: '**CREDENTIAL_PLACEHOLDER**' },
  { name: 'Slack User Token', pattern: /xoxp-[a-zA-Z0-9-]{8,}/g, replacement: '**CREDENTIAL_PLACEHOLDER**' },
  { name: 'GitHub Classic PAT', pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: '**REDACTED_SECRET**' },
  { name: 'GitHub Fine-grained PAT', pattern: /github_pat_[a-zA-Z0-9_]{82}/g, replacement: '**REDACTED_SECRET**' },
  { name: 'Authorization Bearer Token', pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, replacement: 'Bearer **AUTH_HEADER_REDACTED**' },
  { name: 'Authorization Basic Token', pattern: /Basic\s+[a-zA-Z0-9\-._~+/]+=*/gi, replacement: 'Basic **AUTH_HEADER_REDACTED**' },
  { name: 'Private Key block', pattern: /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/g, replacement: '**REDACTED_PRIVATE_KEY**' }
];

const sensitiveKeys = new Set([
  'client_secret',
  'access_token',
  'refresh_token',
  'private_key',
  'password',
  'pass',
  'secret',
  'token',
  'apikey',
  'api_key',
  'x-api-key'
]);

function isRecord(value: unknown): value is MutableJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactInternalEndpoint(value: string): { value: string; matched: boolean } {
  const internalEndpointRegexes = [
    /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/[^\s'"<>]*)?/gi,
    /\bhttps?:\/\/(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?(?:\/[^\s'"<>]*)?/gi
  ];

  let updated = value;
  let matched = false;

  for (const pattern of internalEndpointRegexes) {
    updated = updated.replace(pattern, () => {
      matched = true;
      return '[REDACTED_INTERNAL_ENDPOINT]';
    });
  }

  return { value: updated, matched };
}

export function sanitizeWorkflow(workflow: N8nWorkflow, strictMode: boolean = false): SanitizeResult {
  let redactedCount = 0;
  const auditLogs: string[] = [];

  // Deep clone workflow using JSON methods
  const sanitized = JSON.parse(JSON.stringify(workflow)) as N8nWorkflow;

  // Scan and redact parameters recursively
  function walk(obj: unknown, currentPath: string) {
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => walk(item, `${currentPath}[${index}]`));
      return;
    }

    if (isRecord(obj)) {
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const nextPath = currentPath ? `${currentPath}.${key}` : key;

        // Check sensitive keys
        const isSensitiveKey = sensitiveKeys.has(key.toLowerCase());
        if (isSensitiveKey && typeof value === 'string' && value.trim().length > 0 && !value.includes('={{')) {
          // If value is not an expression (starts with ={{), redact it
          obj[key] = '**REDACTED_SECRET**';
          redactedCount++;
          auditLogs.push(`Redacted sensitive key "${nextPath}" (replaced with placeholder).`);
          continue;
        }

        if (typeof value === 'string') {
          let updatedValue = value;
          let matched = false;

          for (const scanner of secretRegexes) {
            scanner.pattern.lastIndex = 0;
            if (scanner.pattern.test(value)) {
              scanner.pattern.lastIndex = 0;
              updatedValue = updatedValue.replace(scanner.pattern, scanner.replacement);
              matched = true;
              auditLogs.push(`Redacted pattern match for "${scanner.name}" at path: "${nextPath}".`);
            }
          }

          if (strictMode) {
            // Strict mode redacts email patterns and URL endpoints
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            if (emailRegex.test(updatedValue)) {
              updatedValue = updatedValue.replace(emailRegex, '[REDACTED_EMAIL]');
              matched = true;
              auditLogs.push(`[Strict] Redacted email pattern at path: "${nextPath}".`);
            }

            const endpointRedaction = redactInternalEndpoint(updatedValue);
            if (endpointRedaction.matched) {
              updatedValue = endpointRedaction.value;
              matched = true;
              auditLogs.push(`[Strict] Redacted internal endpoint at path: "${nextPath}".`);
            }
          }

          if (matched) {
            obj[key] = updatedValue;
            redactedCount++;
          }
        } else {
          walk(value, nextPath);
        }
      }
    }
  }

  // Redact actual embedded credential blocks if any
  if (sanitized.nodes) {
    for (const node of sanitized.nodes) {
      if (node.credentials) {
        // Replace node credentials object names/ids to hide private ids
        for (const credType of Object.keys(node.credentials)) {
          const cred = node.credentials[credType];
          if (isRecord(cred) && cred.id) {
            auditLogs.push(`Stubbed credential instance ID for "${credType}" in node "${node.name}".`);
            cred.id = '**CREDENTIAL_PLACEHOLDER**';
            cred.name = '**CREDENTIAL_PLACEHOLDER**';
            redactedCount++;
          }
        }
      }
      walk(node.parameters, `${node.name}.parameters`);
    }
  }

  // Compile Markdown report
  const timestamp = new Date().toISOString();
  const reportMd = `# FlowForge Sanitize Report

**Timestamp:** ${timestamp}
**Strict Mode:** ${strictMode ? 'Enabled' : 'Disabled'}
**Total Redactions:** ${redactedCount}

## Actions Log
${
  auditLogs.length > 0
    ? auditLogs.map((log) => `*   ${log}`).join('\n')
    : '*   No sensitive credentials or high-entropy patterns identified.'
}

## Notice
FlowForge does not transmit credentials. All redactions are executed locally and offline. Always verify your workflows before checking them into open-source repositories.
`;

  return {
    sanitizedWorkflow: sanitized,
    redactedCount,
    reportMd
  };
}
