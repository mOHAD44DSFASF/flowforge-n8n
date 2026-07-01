import * as fs from 'fs';
import { N8nWorkflowSchema, N8nWorkflow } from './workflowSchema.js';

export interface ParseResult {
  success: boolean;
  workflow?: N8nWorkflow;
  error?: string;
}

export function parseWorkflowString(content: string): ParseResult {
  try {
    const parsedObj = JSON.parse(content);
    const parsedSchema = N8nWorkflowSchema.safeParse(parsedObj);
    if (!parsedSchema.success) {
      const issues = parsedSchema.error.issues
        .map((issue) => `[${issue.path.join('.')}] ${issue.message}`)
        .join('\n');
      return {
        success: false,
        error: `Schema validation failed:\n${issues}`
      };
    }
    return {
      success: true,
      workflow: parsedSchema.data
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Invalid JSON format: ${message}`
    };
  }
}

export function parseWorkflowFile(filePath: string): ParseResult {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}`
      };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseWorkflowString(content);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to read file: ${message}`
    };
  }
}
