import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  diffInputSchema,
  diffWorkflowsTool,
  explainErrorTool,
  explainWorkflowTool,
  generatePayloadsTool,
  healTool,
  lintWorkflowTool,
  runTestsTool,
  sanitizeTool,
  scoreWorkflowTool,
  suggestFixTool,
  validateWorkflowTool,
  workflowInputSchema
} from './tools.js';

interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface McpServeOptions {
  http?: boolean;
  port?: number;
}

export function createFlowForgeMcpServer(): McpServer {
  const server = new McpServer({
    name: 'flowforge-n8n',
    version: '0.2.0'
  });

  registerJsonTool(
    server,
    'flowforge_validate_workflow',
    'Validate workflow shape and bundled catalog semantics.',
    workflowInputSchema,
    validateWorkflowTool
  );
  registerJsonTool(
    server,
    'flowforge_lint_workflow',
    'Run static analysis findings for a workflow.',
    workflowInputSchema,
    lintWorkflowTool
  );
  registerJsonTool(
    server,
    'flowforge_score_workflow',
    'Score workflow quality.',
    workflowInputSchema,
    scoreWorkflowTool
  );
  registerJsonTool(
    server,
    'flowforge_run_tests',
    'Run FlowForge regression tests by glob.',
    {
      glob: z.string().optional(),
      filter: z.string().optional(),
      bail: z.boolean().optional(),
      updateSnapshots: z.boolean().optional(),
      live: z.boolean().optional()
    },
    runTestsTool
  );
  registerJsonTool(
    server,
    'flowforge_generate_payloads',
    'Generate payload variants for a domain type.',
    { type: z.string() },
    generatePayloadsTool
  );
  registerJsonTool(
    server,
    'flowforge_diff_workflows',
    'Diff two workflow revisions.',
    diffInputSchema,
    diffWorkflowsTool
  );
  registerJsonTool(
    server,
    'flowforge_explain_error',
    'Explain a FlowForge error string and suggest next action.',
    { error: z.string() },
    explainErrorTool
  );
  registerJsonTool(
    server,
    'flowforge_suggest_fix',
    'Return deterministic fix hints for workflow findings.',
    workflowInputSchema,
    suggestFixTool
  );
  registerJsonTool(
    server,
    'flowforge_heal',
    'Apply deterministic fixes and return the healed workflow plus report.',
    { ...workflowInputSchema, maxIterations: z.number().int().nonnegative().optional() },
    healTool
  );
  registerJsonTool(
    server,
    'flowforge_sanitize',
    'Return a sanitized copy of a workflow.',
    { ...workflowInputSchema, strict: z.boolean().optional() },
    sanitizeTool
  );
  registerJsonTool(
    server,
    'flowforge_explain_workflow',
    'Explain workflow paths and integrations.',
    workflowInputSchema,
    explainWorkflowTool
  );

  return server;
}

export async function serveMcp(options: McpServeOptions = {}): Promise<void> {
  if (options.http) {
    await serveHttp(options.port ?? 3333);
    return;
  }

  const server = createFlowForgeMcpServer();
  await server.connect(new StdioServerTransport());
}

function registerJsonTool<Args extends Record<string, z.ZodTypeAny>>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: Args,
  handler: (args: z.infer<z.ZodObject<Args>>) => unknown | Promise<unknown>
): void {
  const callback = async (args: z.infer<z.ZodObject<Args>>): Promise<CallToolResult> => {
    const result = await handler(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  };

  server.registerTool(
    name,
    {
      description,
      inputSchema,
      annotations: annotationsForTool(name)
    },
    callback as never
  );
}

export function annotationsForTool(name: string): ToolAnnotations {
  if (name === 'flowforge_run_tests') {
    return {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    };
  }

  if (name === 'flowforge_heal') {
    return {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    };
  }

  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };
}

async function serveHttp(port: number): Promise<void> {
  const server = createFlowForgeMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    if (!req.url?.startsWith('/mcp')) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    transport.handleRequest(req, res).catch((error) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, '127.0.0.1', resolve);
  });

  console.error(`FlowForge MCP HTTP server listening on http://127.0.0.1:${port}/mcp`);
}
