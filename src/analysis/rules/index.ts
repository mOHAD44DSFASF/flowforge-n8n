import { AnalysisRule } from '../types.js';
import { llmInLoopRule, unboundedTriggerFanoutRule } from './cost.js';
import {
  missingWebhookResponseRule,
  noErrorHandlingRule,
  non2xxSuccessRule,
  raceConditionRule,
  unboundedPaginationRule
} from './reliability.js';
import { authHeaderRule, hardcodedSecretRule, httpNoTlsRule, piiInLogsRule } from './security.js';
import {
  legacyErrorHandlingAliasRule,
  legacyMaintainabilityRule,
  legacyWebhookResponseAliasRule
} from './legacy.js';

export const allRules: AnalysisRule[] = [
  legacyMaintainabilityRule,
  legacyErrorHandlingAliasRule,
  legacyWebhookResponseAliasRule,
  noErrorHandlingRule,
  non2xxSuccessRule,
  unboundedPaginationRule,
  missingWebhookResponseRule,
  raceConditionRule,
  hardcodedSecretRule,
  authHeaderRule,
  piiInLogsRule,
  httpNoTlsRule,
  llmInLoopRule,
  unboundedTriggerFanoutRule
];
