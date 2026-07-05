import { Finding } from '../../core/findings.js';
import { getStringParam, hasAuthorizationHeader, secretFindingForNode } from '../helpers.js';
import { AnalysisRule } from '../types.js';

export const hardcodedSecretRule: AnalysisRule = {
  code: 'SEC-HARDCODED-SECRET',
  description: 'Workflow parameters must not contain hardcoded secrets.',
  run({ nodes }) {
    return nodes
      .map(secretFindingForNode)
      .filter((finding): finding is Finding => Boolean(finding));
  }
};

export const authHeaderRule: AnalysisRule = {
  code: 'SEC-AUTH-HEADER',
  description: 'Authorization headers should be configured through n8n credentials.',
  run({ nodes }) {
    return nodes
      .filter(
        (node) =>
          node.type === 'n8n-nodes-base.httpRequest' && hasAuthorizationHeader(node.parameters)
      )
      .map((node) => ({
        code: 'SEC-AUTH-HEADER',
        severity: 'warning',
        category: 'security',
        message: `HTTP Request node "${node.name}" contains a hardcoded Authorization header.`,
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};

export const piiInLogsRule: AnalysisRule = {
  code: 'SEC-PII-IN-LOGS',
  description: 'Code nodes should not log entire payloads or obvious PII fields.',
  run({ nodes }) {
    return nodes
      .filter((node) => node.type === 'n8n-nodes-base.code')
      .filter((node) => {
        const code = getStringParam(node.parameters, 'jsCode') ?? '';
        return /console\.(log|info|warn|error)\s*\([^)]*(\$json|email|phone|ssn|address)/i.test(
          code
        );
      })
      .map((node) => ({
        code: 'SEC-PII-IN-LOGS',
        severity: 'warning',
        category: 'security',
        message: `Code node "${node.name}" appears to log payload data or PII fields.`,
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};

export const httpNoTlsRule: AnalysisRule = {
  code: 'SEC-HTTP-NO-TLS',
  description: 'External HTTP requests should use TLS.',
  run({ nodes }) {
    return nodes
      .filter((node) => node.type === 'n8n-nodes-base.httpRequest')
      .filter((node) => {
        const url = getStringParam(node.parameters, 'url') ?? '';
        return /^http:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url);
      })
      .map((node) => ({
        code: 'SEC-HTTP-NO-TLS',
        severity: 'error',
        category: 'security',
        message: `HTTP Request node "${node.name}" uses a non-TLS URL.`,
        nodeId: node.id,
        nodeName: node.name
      }));
  }
};
