export type RuleOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'greaterThan'
  | 'lessThan'
  | 'in'
  | 'exists';

export interface RuleCondition {
  id: string;
  field: string;
  operator: RuleOperator;
  value?: string | number | boolean | string[];
}

export type RuleActionType =
  | 'replace'
  | 'prepend'
  | 'append'
  | 'regexReplace'
  | 'uppercase'
  | 'lowercase'
  | 'remove'
  | 'setMeta';

export interface RuleAction {
  id: string;
  type: RuleActionType;
  targetField: string;
  value?: string;
  pattern?: string;
  replacement?: string;
}

export type LogicalOperator = 'AND' | 'OR';

export interface RuleDefinition {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditionOperator: LogicalOperator;
  conditions: RuleCondition[];
  actions: RuleAction[];
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  applied: boolean;
  success: boolean;
  skippedReason?: string;
  error?: string;
  originalValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes: FieldChange[];
  executionTimeMs: number;
}

export interface RuleEngineContext {
  input: Record<string, unknown>;
  rules: RuleDefinition[];
  stopOnFirstMatch?: boolean;
}

export interface RuleEngineExecutionSummary {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  results: RuleExecutionResult[];
  totalApplied: number;
  totalExecutionTimeMs: number;
}

export interface RulePreset {
  presetId: string;
  name: string;
  description?: string;
  enabled: boolean;
  rules: RuleDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface PresetValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PresetOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

