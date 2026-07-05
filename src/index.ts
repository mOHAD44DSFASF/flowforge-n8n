// Library export entry point for @flowforge-n8n/cli

export const VERSION = '0.2.0';
export { N8nWorkflowSchema } from './core/workflowSchema.js';
export type { Finding, FindingFix, FindingCategory, FindingSeverity } from './core/findings.js';
export {
  compareSeverity,
  filterFindingsBySeverity,
  hasFailingFindings,
  severityMeetsThreshold,
  sortFindings
} from './core/findings.js';
export type { FlowForgeConfig, ConfigLoadResult } from './core/config.js';
export { applyRuleSeverityOverride, isRuleEnabled, loadConfig } from './core/config.js';
export { assertOnline, OfflineModeError } from './core/offline.js';
export type {
  CatalogCredential,
  CatalogNode,
  CatalogParameter,
  NodeCatalogSnapshot
} from './catalog/types.js';
export {
  closestParameter,
  getCatalog,
  getCatalogNode,
  getCatalogParameter,
  latestTypeVersion
} from './catalog/index.js';
export type { SemanticValidationOptions } from './core/semanticValidator.js';
export { validateWorkflowSemantics } from './core/semanticValidator.js';
export type { AnalysisContext, AnalysisReport, AnalysisRule } from './analysis/types.js';
export { runAnalysis } from './analysis/engine.js';
export { allRules } from './analysis/rules/index.js';
export type { LintIssue, LintWorkflowOptions } from './core/workflowLinter.js';
export {
  findingToLintIssue,
  lintIssueToFinding,
  lintWorkflow,
  lintWorkflowFindings
} from './core/workflowLinter.js';
export type {
  FlowForgeTestCase,
  FlowForgeTestFile,
  LoadedFlowForgeTestFile,
  TestCaseResult,
  TestFileResult,
  TestRunOptions,
  TestRunResult,
  TestRunSummary
} from './testing/types.js';
export { evaluateExpressionString, evaluateValue } from './testing/expressions.js';
export { simulateWorkflow } from './testing/simulator.js';
export { runFlowForgeTests, loadTestFile } from './testing/runner.js';
export { assertSnapshot } from './testing/snapshots.js';
export type {
  AppliedFix,
  HealIteration,
  HealOptions,
  HealReport,
  HealResult
} from './healing/types.js';
export { applyFindingFix, applyFix } from './healing/fixes.js';
export { collectHealFindings, healWorkflowFile, writeHealResult } from './healing/loop.js';
export type { McpServeOptions } from './mcp/server.js';
export { createFlowForgeMcpServer, serveMcp } from './mcp/server.js';
export {
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
  validateWorkflowTool
} from './mcp/tools.js';
export type { SemanticDiffReport, ReviewReport } from './core/semanticDiff.js';
export {
  renderReviewMarkdown,
  renderSemanticDiffMarkdown,
  reviewWorkflows,
  semanticDiffWorkflows
} from './core/semanticDiff.js';
export type {
  EvalCaseResult,
  EvalRunResult,
  FlowForgeEvalCase,
  FlowForgeEvalFile
} from './eval/types.js';
export { renderEvalJson, renderEvalTty, runEval } from './eval/runner.js';
export type { OfflineCiResult } from './ci/offlineCi.js';
export { runOfflineCi } from './ci/offlineCi.js';
export type { LiveN8nClientOptions, LiveN8nStatus } from './live/n8nClient.js';
export { checkLiveN8n, LiveN8nClient, LiveN8nConfigError } from './live/n8nClient.js';
