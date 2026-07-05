import { z } from 'zod';

export const NodeConnectionSchema = z.object({
  node: z.string({ required_error: 'Connection target node name is required' }),
  type: z.literal('main', {
    errorMap: () => ({ message: 'Connection type must be "main"' })
  }),
  index: z.number({ required_error: 'Connection index is required' }).int().nonnegative()
});

export const NodeConnectionsSchema = z.record(z.array(z.array(NodeConnectionSchema)));

export const WorkflowNodeSchema = z
  .object({
    id: z.string({ required_error: 'Node ID is required' }),
    name: z.string({ required_error: 'Node name is required' }),
    type: z.string({ required_error: 'Node type is required' }),
    typeVersion: z.number({ required_error: 'Node typeVersion is required' }).positive(),
    position: z.array(z.number()).length(2, 'Node position must have exactly 2 coordinates [x, y]'),
    parameters: z.record(z.unknown()).default({}),
    credentials: z.record(z.record(z.unknown())).optional(),
    notes: z.string().optional(),
    disabled: z.boolean().optional(),
    onError: z.string().optional(),
    retryOnFail: z.boolean().optional()
  })
  .passthrough();

export const N8nWorkflowSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
    nodes: z.array(WorkflowNodeSchema, { required_error: 'Nodes array is required' }),
    connections: z.record(NodeConnectionsSchema, {
      required_error: 'Connections object is required'
    }),
    active: z.boolean().optional(),
    settings: z.record(z.unknown()).optional(),
    staticData: z.record(z.unknown()).nullable().optional(),
    pinData: z.record(z.unknown()).optional(),
    versionId: z.string().optional(),
    tags: z.array(z.unknown()).optional()
  })
  .passthrough();

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type N8nWorkflow = z.infer<typeof N8nWorkflowSchema>;
export type NodeConnection = z.infer<typeof NodeConnectionSchema>;
