import vm from 'node:vm';

export interface ExpressionContext {
  json: unknown;
  nodeOutputs: Map<string, unknown>;
  now?: string;
  itemIndex?: number;
}

export function evaluateValue(value: unknown, context: ExpressionContext): unknown {
  if (typeof value === 'string') return evaluateExpressionString(value, context);
  if (Array.isArray(value)) return value.map((item) => evaluateValue(item, context));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, evaluateValue(nested, context)])
    );
  }
  return value;
}

export function evaluateExpressionString(value: string, context: ExpressionContext): unknown {
  const fullExpression = value.match(/^={{\s*([\s\S]*)\s*}}$/);
  if (fullExpression) return runExpression(fullExpression[1], context);

  return value.replace(/={{\s*([\s\S]*?)\s*}}/g, (_match, expression: string) => {
    const result = runExpression(expression, context);
    return result === undefined || result === null ? '' : String(result);
  });
}

function runExpression(expression: string, context: ExpressionContext): unknown {
  const sandbox = buildSandbox(context);
  return vm.runInNewContext(expression, sandbox, {
    timeout: 100,
    contextCodeGeneration: { strings: false, wasm: false }
  });
}

function buildSandbox(context: ExpressionContext): Record<string, unknown> {
  const getNodeOutput = (name: string) => ({
    item: {
      json: context.nodeOutputs.get(name)
    },
    first: () => ({ json: context.nodeOutputs.get(name) })
  });

  return Object.freeze({
    $json: context.json,
    $now: context.now ?? '2026-01-01T00:00:00.000Z',
    $item: context.itemIndex ?? 0,
    $: getNodeOutput,
    $node: new Proxy(
      {},
      {
        get(_target, prop) {
          return getNodeOutput(String(prop));
        }
      }
    ),
    Math,
    Number,
    String,
    Boolean,
    JSON
  });
}
