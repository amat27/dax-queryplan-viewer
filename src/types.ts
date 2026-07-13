export type PlanEventKind =
  | 'vp-logical'
  | 'vp-physical'
  | 'dq-algebrizer'
  | 'dq-logical'
  | 'unknown';

export type OperatorKind =
  | 'RelLogOp'
  | 'ScaLogOp'
  | 'IterPhyOp'
  | 'LookupPhyOp'
  | 'SpoolPhyOp'
  | 'RelOp'
  | 'ScaOp'
  | 'LogOp'
  | 'ScaExpr'
  | 'unknown';

export type ColumnRole = 'dependsOn' | 'required' | 'iter' | 'lookup' | 'output' | 'free' | 'self';

export interface ColumnName {
  table: string;
  column: string;
  raw: string;
}

export interface ColumnSet {
  ids: string[];
  names: ColumnName[];
  rawIds: string;
  rawNames: string;
}

export interface PlanMetric {
  name: string;
  value: string;
}

export interface PlanNode {
  id: string;
  eventId: string;
  lineNumber: number;
  depth: number;
  parentId: string | null;
  childIds: string[];
  queryObject?: string;
  operator: string;
  kind: OperatorKind;
  variableName?: string;
  referencedVariable?: string;
  logicalOperator?: string;
  scalarType?: string;
  dominantValue?: string;
  relationRange?: { first: string; last: string };
  columns: Partial<Record<ColumnRole, ColumnSet>>;
  metrics: PlanMetric[];
  attributes: Record<string, string>;
  rawLine: string;
  rawTail: string;
}

export interface PlanReference {
  fromNodeId: string;
  targetVariable: string;
  targetRootId?: string;
  kind: 'variable';
}

export interface ParseDiagnostic {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  eventIndex?: number;
  lineNumber?: number;
}

export interface PlanEvent {
  id: string;
  index: number;
  kind: PlanEventKind;
  rawText: string;
  rootIds: string[];
  nodes: PlanNode[];
  references: PlanReference[];
  diagnostics: ParseDiagnostic[];
  truncated: boolean;
}

export interface PlanDocument {
  id: string;
  name: string;
  rawInput: string;
  events: PlanEvent[];
  diagnostics: ParseDiagnostic[];
}

export interface MappingCandidate {
  logicalNodeId: string;
  physicalNodeId: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  reasons: string[];
  contradictions: string[];
}

export type ViewMode = 'logical' | 'physical' | 'split';
export type LayoutDirection = 'DOWN' | 'RIGHT';
