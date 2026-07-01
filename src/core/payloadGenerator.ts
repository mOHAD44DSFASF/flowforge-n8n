import * as fs from 'fs';
import * as path from 'path';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface PayloadTemplate {
  valid: JsonValue;
  missingRequired: JsonValue;
  invalidEmail: JsonValue;
  emptyBody: JsonValue;
  unexpectedFields: JsonValue;
  largePayload: JsonValue;
}

const leadFormTemplate: PayloadTemplate = {
  valid: {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    company: 'Acme Corp',
    jobTitle: 'Senior Automation Engineer',
    leadSource: 'Web Form'
  },
  missingRequired: {
    name: 'Jane Doe',
    company: 'Acme Corp',
    jobTitle: 'Senior Automation Engineer'
  },
  invalidEmail: {
    name: 'Jane Doe',
    email: 'jane.doe-at-example.com',
    company: 'Acme Corp'
  },
  emptyBody: {},
  unexpectedFields: {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    company: 'Acme Corp',
    customField_xyz: 'extra-data',
    userIpAddress: '192.168.1.50',
    meta: {
      clientVersion: 'v4.2.1',
      sessionCookie: 'abc123xyz'
    }
  },
  largePayload: {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    company: 'Acme Corp',
    jobTitle: 'Senior Automation Engineer',
    logs: Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date().toISOString(),
      action: `Action ${i + 1}`,
      details: 'Simulation log detail data'
    })),
    metadata: {
      tags: ['automation', 'n8n', 'typescript'],
      campaign: {
        id: 'campaign-123',
        source: 'adwords',
        medium: 'cpc'
      }
    }
  }
};

const stripeTemplate: PayloadTemplate = {
  valid: {
    id: 'evt_1NzABCDEFG12345',
    object: 'event',
    api_version: '2023-10-16',
    created: 1699000000,
    type: 'charge.succeeded',
    data: {
      object: {
        id: 'ch_1NzABC',
        amount: 2999,
        currency: 'usd',
        billing_details: {
          email: 'customer@example.com',
          name: 'Stripe Customer'
        },
        paid: true,
        status: 'succeeded'
      }
    }
  },
  missingRequired: {
    id: 'evt_1NzABCDEFG12345',
    object: 'event'
    // Missing type and data
  },
  invalidEmail: {
    id: 'evt_1NzABCDEFG12345',
    type: 'charge.succeeded',
    data: {
      object: {
        amount: 2999,
        billing_details: {
          email: 'invalid-email-stripe'
        }
      }
    }
  },
  emptyBody: {},
  unexpectedFields: {
    id: 'evt_1NzABCDEFG12345',
    type: 'charge.succeeded',
    extra_field_stripe_debug: true,
    referrer: 'unknown'
  },
  largePayload: {
    id: 'evt_1NzABCDEFG12345',
    object: 'event',
    type: 'charge.succeeded',
    data: {
      object: {
        id: 'ch_1NzABC',
        amount: 2999,
        billing_details: {
          email: 'customer@example.com',
          name: 'Stripe Customer',
          address: {
            city: 'San Francisco',
            country: 'US',
            line1: '123 Market St',
            postal_code: '94105'
          }
        },
        refunds: {
          object: 'list',
          data: [],
          has_more: false,
          total_count: 0
        }
      }
    }
  }
};

const shopifyTemplate: PayloadTemplate = {
  valid: {
    id: 123456789,
    email: 'buyer@shopify.com',
    total_price: '150.00',
    currency: 'USD',
    financial_status: 'paid',
    line_items: [
      {
        id: 987654321,
        title: 'Developer Tool T-Shirt',
        quantity: 2,
        price: '25.00'
      }
    ],
    customer: {
      first_name: 'John',
      last_name: 'Shopify'
    }
  },
  missingRequired: {
    id: 123456789,
    currency: 'USD'
  },
  invalidEmail: {
    id: 123456789,
    email: 'john-at-shopify-dot-com',
    total_price: '150.00'
  },
  emptyBody: {},
  unexpectedFields: {
    id: 123456789,
    email: 'buyer@shopify.com',
    theme_id: 8888,
    checkout_token: 'chk_9999'
  },
  largePayload: {
    id: 123456789,
    email: 'buyer@shopify.com',
    total_price: '150.00',
    line_items: Array.from({ length: 10 }, (_, i) => ({
      id: 987654321 + i,
      title: `Product ${i + 1}`,
      quantity: 1,
      price: '15.00'
    })),
    shipping_address: {
      address1: '456 Webhook Lane',
      city: 'Ottawa',
      province: 'Ontario',
      zip: 'K1P 1A1',
      country: 'Canada'
    }
  }
};

const genericTemplate: PayloadTemplate = {
  valid: {
    id: 'item-100',
    status: 'active',
    data: {
      message: 'Hello FlowForge',
      value: 42
    }
  },
  missingRequired: {
    status: 'active'
  },
  invalidEmail: {
    id: 'item-100',
    email: 'not-an-email-value'
  },
  emptyBody: {},
  unexpectedFields: {
    id: 'item-100',
    status: 'active',
    debug: true,
    foo: 'bar'
  },
  largePayload: {
    id: 'item-100',
    status: 'active',
    data: {
      array: Array.from({ length: 100 }, (_, i) => i)
    }
  }
};

export function generatePayloads(type: string, outDir: string): string[] {
  let template = genericTemplate;
  const normalized = type.toLowerCase();

  if (normalized.includes('lead')) {
    template = leadFormTemplate;
  } else if (normalized.includes('stripe')) {
    template = stripeTemplate;
  } else if (normalized.includes('shopify')) {
    template = shopifyTemplate;
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const generatedFiles: string[] = [];

  const filesMap = {
    'valid.json': template.valid,
    'missing-required-field.json': template.missingRequired,
    'invalid-email.json': template.invalidEmail,
    'empty-body.json': template.emptyBody,
    'unexpected-fields.json': template.unexpectedFields,
    'large-payload.json': template.largePayload
  };

  for (const [filename, content] of Object.entries(filesMap)) {
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}
