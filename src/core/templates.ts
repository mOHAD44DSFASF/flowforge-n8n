import { N8nWorkflow, WorkflowNode } from './workflowSchema.js';
import { generateDocs } from './docsGenerator.js';
import { generateMermaidDiagram } from './diagramGenerator.js';
import { generateWebhookTest } from './webhookTestGenerator.js';
import { generatePayloads } from './payloadGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateDefinition {
  name: string;
  description: string;
  workflow: N8nWorkflow;
  credentialsList: string[];
}

const templatesRegistry: TemplateDefinition[] = [
  {
    name: 'lead-to-crm',
    description: 'Webhook → Validate lead → Dedupe → CRM HTTP Request → Slack alert → Respond',
    credentialsList: ['Slack API', 'CRM Token'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Lead Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'lead-receiver', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Validate fields',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [300, 200],
          parameters: { values: { string: [{ name: 'email', value: '={{ $json.body.email }}' }] } }
        },
        {
          id: 'n3',
          name: 'Push to CRM',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [500, 200],
          parameters: {
            url: 'https://api.my-crm.com/v1/leads',
            method: 'POST',
            onError: 'continue'
          }
        },
        {
          id: 'n4',
          name: 'Slack Notify',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 200],
          parameters: { url: 'https://example.invalid/slack-webhook-placeholder', method: 'POST' }
        },
        {
          id: 'n5',
          name: 'Respond success',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 200],
          parameters: { responseCode: 200, responseBody: '{"status": "lead_created"}' }
        }
      ],
      connections: {
        'Lead Webhook': { main: [[{ node: 'Validate fields', type: 'main', index: 0 }]] },
        'Validate fields': { main: [[{ node: 'Push to CRM', type: 'main', index: 0 }]] },
        'Push to CRM': { main: [[{ node: 'Slack Notify', type: 'main', index: 0 }]] },
        'Slack Notify': { main: [[{ node: 'Respond success', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'stripe-payment-alert',
    description: 'Webhook → Verify event type → Save payment → Slack alert → Respond',
    credentialsList: ['Stripe Key', 'Slack API'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Stripe Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'stripe-events', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Check is charge',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [300, 200],
          parameters: {
            conditions: { string: [{ name: 'type', operator: 'equal', value: 'charge.succeeded' }] }
          }
        },
        {
          id: 'n3',
          name: 'Slack Alert',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [500, 150],
          parameters: { url: 'https://example.invalid/slack-webhook-placeholder', method: 'POST' }
        },
        {
          id: 'n4',
          name: 'Stripe response',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [700, 200],
          parameters: { responseCode: 200, responseBody: '{"received": true}' }
        }
      ],
      connections: {
        'Stripe Webhook': { main: [[{ node: 'Check is charge', type: 'main', index: 0 }]] },
        'Check is charge': {
          main: [
            [{ node: 'Slack Alert', type: 'main', index: 0 }],
            [{ node: 'Stripe response', type: 'main', index: 0 }]
          ]
        },
        'Slack Alert': { main: [[{ node: 'Stripe response', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'shopify-order-to-sheets',
    description: 'Webhook → Transform order → Google Sheets → Email alert → Respond',
    credentialsList: ['Google Sheets Auth', 'SMTP / Email Client'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Shopify Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'shopify-orders', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Extract Order properties',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [300, 200],
          parameters: {
            values: { string: [{ name: 'price', value: '={{ $json.body.total_price }}' }] }
          }
        },
        {
          id: 'n3',
          name: 'Append Sheet Row',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [500, 200],
          parameters: {
            url: 'https://sheets.googleapis.com/v4/spreadsheets/123/values',
            method: 'POST'
          }
        },
        {
          id: 'n4',
          name: 'Email alert',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [700, 200],
          parameters: {
            to: 'admin@my-shop.com',
            subject: 'New Order Received',
            onError: 'continue'
          }
        },
        {
          id: 'n5',
          name: 'Shopify OK',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Shopify Webhook': {
          main: [[{ node: 'Extract Order properties', type: 'main', index: 0 }]]
        },
        'Extract Order properties': {
          main: [[{ node: 'Append Sheet Row', type: 'main', index: 0 }]]
        },
        'Append Sheet Row': { main: [[{ node: 'Email alert', type: 'main', index: 0 }]] },
        'Email alert': { main: [[{ node: 'Shopify OK', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'webhook-router',
    description: 'Webhook → Route by event type → Different branches → Respond',
    credentialsList: [],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Catch All Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'router', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Switch route',
          type: 'n8n-nodes-base.switch',
          typeVersion: 1,
          position: [300, 200],
          parameters: { rules: [{ value: '={{ $json.body.event }}' }] }
        },
        {
          id: 'n3',
          name: 'Route A handler',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 100],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Route B handler',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 300],
          parameters: {}
        },
        {
          id: 'n5',
          name: 'Router respond',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [700, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Catch All Webhook': { main: [[{ node: 'Switch route', type: 'main', index: 0 }]] },
        'Switch route': {
          main: [
            [{ node: 'Route A handler', type: 'main', index: 0 }],
            [{ node: 'Route B handler', type: 'main', index: 0 }]
          ]
        },
        'Route A handler': { main: [[{ node: 'Router respond', type: 'main', index: 0 }]] },
        'Route B handler': { main: [[{ node: 'Router respond', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'ai-email-triage',
    description: 'Gmail trigger placeholder → Classify email → Label/notify → Human review',
    credentialsList: ['Gmail Auth', 'AI Model API Key'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Gmail trigger',
          type: 'n8n-nodes-base.manualTrigger',
          typeVersion: 1,
          position: [100, 200],
          parameters: {}
        },
        {
          id: 'n2',
          name: 'AI Triage LLM',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: {
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            onError: 'continue'
          }
        },
        {
          id: 'n3',
          name: 'Filter Spam',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [500, 200],
          parameters: { conditions: {} }
        },
        {
          id: 'n4',
          name: 'Slack Alert Support',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 150],
          parameters: { url: 'https://hooks.slack.com/support', method: 'POST' }
        }
      ],
      connections: {
        'Gmail trigger': { main: [[{ node: 'AI Triage LLM', type: 'main', index: 0 }]] },
        'AI Triage LLM': { main: [[{ node: 'Filter Spam', type: 'main', index: 0 }]] },
        'Filter Spam': {
          main: [[{ node: 'Slack Alert Support', type: 'main', index: 0 }], []]
        }
      }
    }
  },
  {
    name: 'support-ticket-classifier',
    description: 'Webhook → Classify ticket → Priority branch → Slack/Sheets → Respond',
    credentialsList: ['Slack API', 'AI Provider Auth'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'New Ticket Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'new-ticket', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'AI Sentiment Check',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.openai.com/v1/completions', method: 'POST' }
        },
        {
          id: 'n3',
          name: 'Is High Priority?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [500, 200],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Slack Escalation',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 100],
          parameters: { url: 'https://hooks.slack.com/escalations', method: 'POST' }
        },
        {
          id: 'n5',
          name: 'Standard Log Sheet',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [700, 300],
          parameters: {}
        },
        {
          id: 'n6',
          name: 'Ticket classified OK',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'New Ticket Webhook': { main: [[{ node: 'AI Sentiment Check', type: 'main', index: 0 }]] },
        'AI Sentiment Check': { main: [[{ node: 'Is High Priority?', type: 'main', index: 0 }]] },
        'Is High Priority?': {
          main: [
            [{ node: 'Slack Escalation', type: 'main', index: 0 }],
            [{ node: 'Standard Log Sheet', type: 'main', index: 0 }]
          ]
        },
        'Slack Escalation': { main: [[{ node: 'Ticket classified OK', type: 'main', index: 0 }]] },
        'Standard Log Sheet': { main: [[{ node: 'Ticket classified OK', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'crm-enrichment',
    description: 'Webhook → HTTP enrichment API → Merge fields → CRM update → Respond',
    credentialsList: ['Enrichment API Token', 'CRM API'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Enrich Trigger Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'enrich-lead', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Clearbit Enrichment',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://person.clearbit.com/v2/combined/find', method: 'GET' }
        },
        {
          id: 'n3',
          name: 'Merge Lead Fields',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 200],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Update Hubspot CRM',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 200],
          parameters: { url: 'https://api.hubapi.com/crm/v3/objects/contacts', method: 'PATCH' }
        },
        {
          id: 'n5',
          name: 'Enrich response',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Enrich Trigger Webhook': {
          main: [[{ node: 'Clearbit Enrichment', type: 'main', index: 0 }]]
        },
        'Clearbit Enrichment': { main: [[{ node: 'Merge Lead Fields', type: 'main', index: 0 }]] },
        'Merge Lead Fields': { main: [[{ node: 'Update Hubspot CRM', type: 'main', index: 0 }]] },
        'Update Hubspot CRM': { main: [[{ node: 'Enrich response', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'invoice-processing',
    description: 'Webhook → Extract fields → Validate → Save → Alert',
    credentialsList: ['OCR Parser Token', 'Database Auth'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Invoice Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'invoice-receiver', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Parse Invoice OCR',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.ocr-parser.example/extract', method: 'POST' }
        },
        {
          id: 'n3',
          name: 'Validate totals',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [500, 200],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Insert DB Record',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 150],
          parameters: { url: 'https://api.postgres-mock.com/invoice', method: 'POST' }
        },
        {
          id: 'n5',
          name: 'Invoice respond',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Invoice Webhook': { main: [[{ node: 'Parse Invoice OCR', type: 'main', index: 0 }]] },
        'Parse Invoice OCR': { main: [[{ node: 'Validate totals', type: 'main', index: 0 }]] },
        'Validate totals': {
          main: [[{ node: 'Insert DB Record', type: 'main', index: 0 }], []]
        },
        'Insert DB Record': { main: [[{ node: 'Invoice respond', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'rss-to-social',
    description: 'Schedule → Fetch feed → Filter → Format → Social placeholder',
    credentialsList: ['Social Buffer key'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Poll RSS Interval',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [100, 200],
          parameters: {}
        },
        {
          id: 'n2',
          name: 'Fetch Feed HTTP',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://my-blog.com/feed.xml', method: 'GET' }
        },
        {
          id: 'n3',
          name: 'Filter new items',
          type: 'n8n-nodes-base.code',
          typeVersion: 1,
          position: [500, 200],
          parameters: { jsCode: '// Filter items\nreturn items.filter(i => i.isNew);' }
        },
        {
          id: 'n4',
          name: 'Queue Social Post',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 200],
          parameters: { url: 'https://api.buffer.com/v1/updates/create', method: 'POST' }
        }
      ],
      connections: {
        'Poll RSS Interval': { main: [[{ node: 'Fetch Feed HTTP', type: 'main', index: 0 }]] },
        'Fetch Feed HTTP': { main: [[{ node: 'Filter new items', type: 'main', index: 0 }]] },
        'Filter new items': { main: [[{ node: 'Queue Social Post', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'slack-approval-gate',
    description: 'Webhook → Slack approval request → Continue/stop branch',
    credentialsList: ['Slack API'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Trigger Deploy',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'deploy-hook', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Slack Approval Block',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://slack.com/api/chat.postMessage', method: 'POST' }
        },
        {
          id: 'n3',
          name: 'Deploy Respond OK',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [500, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Trigger Deploy': { main: [[{ node: 'Slack Approval Block', type: 'main', index: 0 }]] },
        'Slack Approval Block': { main: [[{ node: 'Deploy Respond OK', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'airtable-sync',
    description: 'Schedule → Fetch source → Transform → Airtable upsert',
    credentialsList: ['Airtable API Key'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Sync Interval',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [100, 200],
          parameters: {}
        },
        {
          id: 'n2',
          name: 'Fetch MySQL mock API',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.mysql-mock.com/rows', method: 'GET' }
        },
        {
          id: 'n3',
          name: 'Map Airtable schema',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 200],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Airtable Upsert API',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 200],
          parameters: { url: 'https://api.airtable.com/v0/app123/records', method: 'PATCH' }
        }
      ],
      connections: {
        'Sync Interval': { main: [[{ node: 'Fetch MySQL mock API', type: 'main', index: 0 }]] },
        'Fetch MySQL mock API': {
          main: [[{ node: 'Map Airtable schema', type: 'main', index: 0 }]]
        },
        'Map Airtable schema': { main: [[{ node: 'Airtable Upsert API', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'error-alerting',
    description: 'Any trigger → Main task → Error branch → Slack/Email alert',
    credentialsList: ['Slack webhook'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Daily Trigger',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [100, 200],
          parameters: {}
        },
        {
          id: 'n2',
          name: 'Main DB backup task',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.backup.local/run', method: 'POST', onError: 'continue' }
        },
        {
          id: 'n3',
          name: 'Did Task Fail?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [500, 200],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Slack Alert Failure',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 150],
          parameters: { url: 'https://hooks.slack.com/errors', method: 'POST' }
        }
      ],
      connections: {
        'Daily Trigger': { main: [[{ node: 'Main DB backup task', type: 'main', index: 0 }]] },
        'Main DB backup task': { main: [[{ node: 'Did Task Fail?', type: 'main', index: 0 }]] },
        'Did Task Fail?': {
          main: [[{ node: 'Slack Alert Failure', type: 'main', index: 0 }], []]
        }
      }
    }
  },
  {
    name: 'scheduled-report',
    description: 'Schedule → Fetch metrics → Format report → Email/Slack',
    credentialsList: ['SMTP Auth'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Monday Morning Trigger',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [100, 200],
          parameters: {}
        },
        {
          id: 'n2',
          name: 'Fetch Stripe Metrics',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.stripe.com/v1/balance', method: 'GET' }
        },
        {
          id: 'n3',
          name: 'Compile HTML report',
          type: 'n8n-nodes-base.code',
          typeVersion: 1,
          position: [500, 200],
          parameters: {
            jsCode: 'return [{ html: "<h1>Weekly Stripe sales: " + items[0].amount + "</h1>" }];'
          }
        },
        {
          id: 'n4',
          name: 'Send report email',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [700, 200],
          parameters: { to: 'report-recipient@example.com', subject: 'Stripe Weekly Report' }
        }
      ],
      connections: {
        'Monday Morning Trigger': {
          main: [[{ node: 'Fetch Stripe Metrics', type: 'main', index: 0 }]]
        },
        'Fetch Stripe Metrics': {
          main: [[{ node: 'Compile HTML report', type: 'main', index: 0 }]]
        },
        'Compile HTML report': { main: [[{ node: 'Send report email', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'form-to-email',
    description: 'Webhook → Validate form → Send email → Respond',
    credentialsList: ['Gmail SMTP'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Form Submission Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'contact-form', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Is Email filled?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [300, 200],
          parameters: {}
        },
        {
          id: 'n3',
          name: 'Gmail send form details',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [500, 150],
          parameters: { to: 'sales@example.com' }
        },
        {
          id: 'n4',
          name: 'Form respond OK',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [700, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Form Submission Webhook': {
          main: [[{ node: 'Is Email filled?', type: 'main', index: 0 }]]
        },
        'Is Email filled?': {
          main: [
            [{ node: 'Gmail send form details', type: 'main', index: 0 }],
            [{ node: 'Form respond OK', type: 'main', index: 0 }]
          ]
        },
        'Gmail send form details': { main: [[{ node: 'Form respond OK', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'google-sheets-dedup',
    description: 'Webhook → Read sheet → Check duplicate → Insert or skip',
    credentialsList: ['Google Sheets Key'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Dedupe Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'dedup-records', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Read Google Sheet rows',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: {
            url: 'https://sheets.googleapis.com/v4/spreadsheets/123/values',
            method: 'GET'
          }
        },
        {
          id: 'n3',
          name: 'Check Email Duplicate',
          type: 'n8n-nodes-base.code',
          typeVersion: 1,
          position: [500, 200],
          parameters: { jsCode: '// Dedupe logic\nreturn items;' }
        },
        {
          id: 'n4',
          name: 'Is Duplicate?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [700, 200],
          parameters: {}
        },
        {
          id: 'n5',
          name: 'Append unique row',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [900, 150],
          parameters: {
            url: 'https://sheets.googleapis.com/v4/spreadsheets/123/values',
            method: 'POST'
          }
        },
        {
          id: 'n6',
          name: 'Dedupe response',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [1100, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Dedupe Webhook': { main: [[{ node: 'Read Google Sheet rows', type: 'main', index: 0 }]] },
        'Read Google Sheet rows': {
          main: [[{ node: 'Check Email Duplicate', type: 'main', index: 0 }]]
        },
        'Check Email Duplicate': { main: [[{ node: 'Is Duplicate?', type: 'main', index: 0 }]] },
        'Is Duplicate?': {
          main: [[], [{ node: 'Append unique row', type: 'main', index: 0 }]]
        },
        'Append unique row': { main: [[{ node: 'Dedupe response', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'ai-lead-qualification',
    description: 'Webhook → Score lead → High/low branch → CRM/Slack',
    credentialsList: ['OpenAI Auth', 'Hubspot token'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'AI Lead Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'qualify-lead', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'GPT Lead Score Check',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.openai.com/v1/chat/completions', method: 'POST' }
        },
        {
          id: 'n3',
          name: 'Is Score > 7?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [500, 200],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Sales Slack Alert',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 150],
          parameters: { url: 'https://hooks.slack.com/sales-alerts', method: 'POST' }
        },
        {
          id: 'n5',
          name: 'Low Priority Archive',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [700, 300],
          parameters: {}
        },
        {
          id: 'n6',
          name: 'AI Respond',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'AI Lead Webhook': { main: [[{ node: 'GPT Lead Score Check', type: 'main', index: 0 }]] },
        'GPT Lead Score Check': { main: [[{ node: 'Is Score > 7?', type: 'main', index: 0 }]] },
        'Is Score > 7?': {
          main: [
            [{ node: 'Sales Slack Alert', type: 'main', index: 0 }],
            [{ node: 'Low Priority Archive', type: 'main', index: 0 }]
          ]
        },
        'Sales Slack Alert': { main: [[{ node: 'AI Respond', type: 'main', index: 0 }]] },
        'Low Priority Archive': { main: [[{ node: 'AI Respond', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'webhook-to-postgres',
    description: 'Webhook → Validate → Insert via HTTP/API placeholder → Respond',
    credentialsList: ['Database Token'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'DB Webhook trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'postgres-insert', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Filter data payload',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [300, 200],
          parameters: {}
        },
        {
          id: 'n3',
          name: 'HTTP Postgres insert mock',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [500, 200],
          parameters: { url: 'https://api.postgres-mock.com/rows', method: 'POST' }
        },
        {
          id: 'n4',
          name: 'DB Insert respond',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [700, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'DB Webhook trigger': { main: [[{ node: 'Filter data payload', type: 'main', index: 0 }]] },
        'Filter data payload': {
          main: [[{ node: 'HTTP Postgres insert mock', type: 'main', index: 0 }]]
        },
        'HTTP Postgres insert mock': {
          main: [[{ node: 'DB Insert respond', type: 'main', index: 0 }]]
        }
      }
    }
  },
  {
    name: 'telegram-notifier',
    description: 'Webhook → Format message → Telegram placeholder → Respond',
    credentialsList: ['Telegram Bot token'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Notify webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'send-telegram', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'Format telegram message',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [300, 200],
          parameters: {}
        },
        {
          id: 'n3',
          name: 'Send Telegram API',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [500, 200],
          parameters: { url: 'https://api.telegram.org/bot123/sendMessage', method: 'POST' }
        },
        {
          id: 'n4',
          name: 'Telegram respond',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [700, 200],
          parameters: { responseCode: 200 }
        }
      ],
      connections: {
        'Notify webhook': { main: [[{ node: 'Format telegram message', type: 'main', index: 0 }]] },
        'Format telegram message': {
          main: [[{ node: 'Send Telegram API', type: 'main', index: 0 }]]
        },
        'Send Telegram API': { main: [[{ node: 'Telegram respond', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'content-repurposing',
    description: 'Webhook → Accept content → Split tasks → Output placeholders',
    credentialsList: ['AI model credentials'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Raw Content hook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'repurpose', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'AI Repurpose Content',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.openai.com/v1/chat/completions', method: 'POST' }
        },
        {
          id: 'n3',
          name: 'Split Outputs',
          type: 'n8n-nodes-base.code',
          typeVersion: 1,
          position: [500, 200],
          parameters: { jsCode: '// split tasks\nreturn items;' }
        },
        {
          id: 'n4',
          name: 'Airtable Queue Posts',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 200],
          parameters: { url: 'https://api.airtable.com/v0/app123/posts', method: 'POST' }
        }
      ],
      connections: {
        'Raw Content hook': { main: [[{ node: 'AI Repurpose Content', type: 'main', index: 0 }]] },
        'AI Repurpose Content': { main: [[{ node: 'Split Outputs', type: 'main', index: 0 }]] },
        'Split Outputs': { main: [[{ node: 'Airtable Queue Posts', type: 'main', index: 0 }]] }
      }
    }
  },
  {
    name: 'human-in-the-loop-ai',
    description: 'Webhook → AI decision placeholder → Approval gate → Action',
    credentialsList: ['Slack API', 'AI Key'],
    workflow: {
      nodes: [
        {
          id: 't1',
          name: 'Raw action hook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: { path: 'human-approval-gate', httpMethod: 'POST' }
        },
        {
          id: 'n2',
          name: 'AI Decision score',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [300, 200],
          parameters: { url: 'https://api.openai.com/v1/chat/completions', method: 'POST' }
        },
        {
          id: 'n3',
          name: 'Is approved?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [500, 200],
          parameters: {}
        },
        {
          id: 'n4',
          name: 'Execute approved action',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 150],
          parameters: { url: 'https://api.mycrm.com/execute', method: 'POST' }
        },
        {
          id: 'n5',
          name: 'Post alert to slack',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [700, 300],
          parameters: { url: 'https://hooks.slack.com/errors', method: 'POST' }
        }
      ],
      connections: {
        'Raw action hook': { main: [[{ node: 'AI Decision score', type: 'main', index: 0 }]] },
        'AI Decision score': { main: [[{ node: 'Is approved?', type: 'main', index: 0 }]] },
        'Is approved?': {
          main: [
            [{ node: 'Execute approved action', type: 'main', index: 0 }],
            [{ node: 'Post alert to slack', type: 'main', index: 0 }]
          ]
        }
      }
    }
  }
];

export function getTemplateNames(): string[] {
  return templatesRegistry.map((t) => t.name);
}

export function writeTemplateToDir(templateName: string, targetDir: string): { files: string[] } {
  const template = templatesRegistry.find((t) => t.name === templateName);
  if (!template) {
    throw new Error(
      `Template not found: "${templateName}". Valid options: ${getTemplateNames().join(', ')}`
    );
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const generatedFiles: string[] = [];

  // 1. Write workflow.json
  const workflowPath = path.join(targetDir, 'workflow.json');
  fs.writeFileSync(workflowPath, JSON.stringify(template.workflow, null, 2), 'utf-8');
  generatedFiles.push(workflowPath);

  // 2. Write credentials-needed.md
  const credsPath = path.join(targetDir, 'credentials-needed.md');
  const credsContent = `# Credentials Needed - ${template.name}

The following credentials must be configured inside your target n8n instance:
${
  template.credentialsList.length > 0
    ? template.credentialsList.map((c) => `*   **${c}**`).join('\n')
    : '*   No credentials required for this template.'
}
`;
  fs.writeFileSync(credsPath, credsContent, 'utf-8');
  generatedFiles.push(credsPath);

  // 3. Write README.md
  const readmePath = path.join(targetDir, 'README.md');
  const docsContent = generateDocs(template.workflow, 'workflow.json');
  fs.writeFileSync(readmePath, docsContent, 'utf-8');
  generatedFiles.push(readmePath);

  // 4. Write diagram.mmd
  const diagramPath = path.join(targetDir, 'diagram.mmd');
  const mmdContent = generateMermaidDiagram(template.workflow);
  fs.writeFileSync(diagramPath, mmdContent, 'utf-8');
  generatedFiles.push(diagramPath);

  // 5. Generate sample payloads folder
  const payloadDir = path.join(targetDir, 'sample-payloads');
  const payloadFiles = generatePayloads(template.name, payloadDir);
  generatedFiles.push(...payloadFiles);

  // 6. Generate test-webhook.sh
  const webhookNodes = template.workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.webhook');
  if (webhookNodes.length > 0) {
    const shScriptPath = path.join(targetDir, 'test-webhook.sh');
    const validPayloadPath = path.join(payloadDir, 'valid.json');
    const { shScriptContent } = generateWebhookTest(
      template.workflow,
      'http://localhost:5678',
      validPayloadPath
    );
    fs.writeFileSync(shScriptPath, shScriptContent, { encoding: 'utf-8', mode: 0o755 });
    generatedFiles.push(shScriptPath);
  }

  return { files: generatedFiles };
}

// Deterministic keyword-based scaffold generator from natural language
export function scaffoldFromDescription(description: string): N8nWorkflow {
  const normalized = description.toLowerCase();

  const nodes: WorkflowNode[] = [];
  const connections: N8nWorkflow['connections'] = {};

  let currentY = 200;
  let currentX = 100;

  const addNode = (name: string, type: string, params: Record<string, unknown> = {}) => {
    const id = `node_${nodes.length + 1}`;
    nodes.push({
      id,
      name,
      type,
      typeVersion: 1,
      position: [currentX, currentY],
      parameters: params
    });
    currentX += 200;
    return name;
  };

  // Determine starting trigger
  let firstNodeName = '';
  if (normalized.includes('webhook')) {
    firstNodeName = addNode('Webhook Trigger', 'n8n-nodes-base.webhook', {
      path: 'webhook-endpoint',
      httpMethod: 'POST'
    });
  } else if (
    normalized.includes('schedule') ||
    normalized.includes('cron') ||
    normalized.includes('interval')
  ) {
    firstNodeName = addNode('Schedule Trigger', 'n8n-nodes-base.scheduleTrigger');
  } else {
    firstNodeName = addNode('Manual Trigger', 'n8n-nodes-base.manualTrigger');
  }

  let lastNodeName = firstNodeName;

  // Add processing nodes depending on keywords
  if (
    normalized.includes('validate') ||
    normalized.includes('format') ||
    normalized.includes('set')
  ) {
    const nextName = addNode('Format Data', 'n8n-nodes-base.set', {
      values: { string: [{ name: 'placeholder_key', value: 'value' }] }
    });
    connections[lastNodeName] = { main: [[{ node: nextName, type: 'main', index: 0 }]] };
    lastNodeName = nextName;
  }

  if (normalized.includes('sheets') || normalized.includes('spreadsheet')) {
    const nextName = addNode('Google Sheets Update', 'n8n-nodes-base.httpRequest', {
      url: 'https://sheets.googleapis.com/v4/spreadsheets/PLACEHOLDER',
      method: 'POST'
    });
    connections[lastNodeName] = { main: [[{ node: nextName, type: 'main', index: 0 }]] };
    lastNodeName = nextName;
  }

  if (normalized.includes('crm') || normalized.includes('http') || normalized.includes('api')) {
    const nextName = addNode('HTTP API Request', 'n8n-nodes-base.httpRequest', {
      url: 'https://api.external-service.local/endpoint',
      method: 'POST'
    });
    connections[lastNodeName] = { main: [[{ node: nextName, type: 'main', index: 0 }]] };
    lastNodeName = nextName;
  }

  if (normalized.includes('slack')) {
    const nextName = addNode('Slack notification', 'n8n-nodes-base.httpRequest', {
      url: 'https://example.invalid/slack-webhook-placeholder',
      method: 'POST'
    });
    connections[lastNodeName] = { main: [[{ node: nextName, type: 'main', index: 0 }]] };
    lastNodeName = nextName;
  }

  if (normalized.includes('email') || normalized.includes('gmail')) {
    const nextName = addNode('Send email alert', 'n8n-nodes-base.gmail');
    connections[lastNodeName] = { main: [[{ node: nextName, type: 'main', index: 0 }]] };
    lastNodeName = nextName;
  }

  // If start is webhook, add webhook response node
  if (normalized.includes('webhook') || normalized.includes('respond')) {
    const nextName = addNode('Respond to Webhook Node', 'n8n-nodes-base.respondToWebhook', {
      responseCode: 200
    });
    connections[lastNodeName] = { main: [[{ node: nextName, type: 'main', index: 0 }]] };
    lastNodeName = nextName;
  }

  return {
    nodes,
    connections
  };
}
