import type {
  ColumnName,
  ColumnRole,
  ColumnSet,
  OperatorKind,
  ParseDiagnostic,
  PlanDocument,
  PlanEvent,
  PlanEventKind,
  PlanNode,
  PlanReference,
} from '../types';

const OPERATOR_KINDS: OperatorKind[] = [
  'RelLogOp',
  'ScaLogOp',
  'IterPhyOp',
  'LookupPhyOp',
  'SpoolPhyOp',
  'RelOp',
  'ScaOp',
  'LogOp',
  'ScaExpr',
];

const KIND_PATTERN = OPERATOR_KINDS.join('|');
const COLUMN_FIELDS: Array<[string, ColumnRole]> = [
  ['DependOnCols', 'dependsOn'],
  ['RequiredCols', 'required'],
  ['IterCols', 'iter'],
  ['LookupCols', 'lookup'],
  ['OutputCols', 'output'],
  ['FreeCols', 'free'],
  ['SelfCols', 'self'],
];

export function parseQueryPlanInput(rawInput: string, name = 'pasted-query-plan'): PlanDocument {
  const diagnostics: ParseDiagnostic[] = [];
  let eventTexts: string[] = [];
  const trimmed = rawInput.trim();

  if (!trimmed) {
    diagnostics.push({ severity: 'error', code: 'empty-input', message: 'The input is empty.' });
  } else if (trimmed.startsWith('[')) {
    try {
      const value: unknown = JSON.parse(trimmed);
      if (!Array.isArray(value)) {
        diagnostics.push({ severity: 'error', code: 'invalid-envelope', message: 'Expected a JSON array of plan strings.' });
      } else {
        value.forEach((entry, index) => {
          if (typeof entry === 'string') eventTexts.push(entry);
          else diagnostics.push({
            severity: 'error',
            code: 'non-string-event',
            message: `Event ${index + 1} is not a string and was skipped.`,
            eventIndex: index,
          });
        });
      }
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        code: 'invalid-json',
        message: error instanceof Error ? error.message : 'Invalid JSON input.',
      });
    }
  } else if (trimmed.startsWith('{')) {
    try {
      const studio = extractDaxStudioPlans(JSON.parse(trimmed));
      if (studio) {
        eventTexts = studio.texts;
        diagnostics.push({
          severity: 'info',
          code: 'dax-studio',
          message: `Parsed a DAX Studio query plan export (FileFormatVersion ${studio.version}).`,
        });
      } else {
        diagnostics.push({
          severity: 'error',
          code: 'invalid-envelope',
          message: 'Unrecognized JSON object. Expected a plan-string array, or a DAX Studio export with LogicalQueryPlanRows / PhysicalQueryPlanRows.',
        });
      }
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        code: 'invalid-json',
        message: error instanceof Error ? error.message : 'Invalid JSON input.',
      });
    }
  } else {
    eventTexts = [rawInput];
    diagnostics.push({ severity: 'info', code: 'raw-plan', message: 'Parsed as raw plan text (no JSON envelope).' });
  }

  const documentId = stableId(name);
  const events = eventTexts.map((text, index) => parsePlanEvent(text, index, documentId));
  if (eventTexts.length === 0 && diagnostics.every((d) => d.severity !== 'error')) {
    diagnostics.push({ severity: 'info', code: 'empty-envelope', message: 'The JSON array contains no plan events.' });
  }

  return { id: documentId, name, rawInput, events, diagnostics };
}

/**
 * DAX Studio exports a JSON object (not the raw string envelope) whose
 * `LogicalQueryPlanRows` / `PhysicalQueryPlanRows` hold one object per operator
 * with an un-indented `Operation` string and an explicit `Level`. We rebuild the
 * tab-indented plan text the line/forest parser already understands, keeping
 * logical before physical.
 */
function extractDaxStudioPlans(value: unknown): { texts: string[]; version: string } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const object = value as Record<string, unknown>;
  if (!('LogicalQueryPlanRows' in object) && !('PhysicalQueryPlanRows' in object)) return undefined;

  const texts: string[] = [];
  for (const key of ['LogicalQueryPlanRows', 'PhysicalQueryPlanRows']) {
    const text = daxStudioRowsToText(object[key]);
    if (text) texts.push(text);
  }
  const version = object.FileFormatVersion !== undefined ? String(object.FileFormatVersion) : 'unknown';
  return { texts, version };
}

function daxStudioRowsToText(rows: unknown): string | undefined {
  if (!Array.isArray(rows)) return undefined;
  const lines: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const operation = (row as Record<string, unknown>).Operation;
    if (typeof operation !== 'string' || !operation.trim()) continue;
    const level = Number((row as Record<string, unknown>).Level);
    const depth = Number.isFinite(level) && level > 0 ? level : 0;
    lines.push('\t'.repeat(depth) + operation);
  }
  return lines.length ? lines.join('\n') : undefined;
}

export function parsePlanEvent(rawText: string, index: number, documentId = 'document'): PlanEvent {
  const eventId = `${documentId}:event-${index}`;
  const diagnostics: ParseDiagnostic[] = [];
  const nodes: PlanNode[] = [];
  const rootIds: string[] = [];
  const stack: PlanNode[] = [];
  let truncated = false;
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  lines.forEach((rawLine, zeroBasedLine) => {
    if (!rawLine.trim()) return;
    const lineNumber = zeroBasedLine + 1;
    const content = rawLine.replace(/^\t+/, '');
    const depth = rawLine.length - content.length;

    if (/^More operators skipped\.\.\.$/.test(content.trim())) {
      truncated = true;
      diagnostics.push({
        severity: 'warning',
        code: 'truncated-plan',
        message: 'The engine skipped additional operators.',
        eventIndex: index,
        lineNumber,
      });
      return;
    }
    if (/^NULL (?:query )?object$/i.test(content.trim())) {
      diagnostics.push({
        severity: 'warning',
        code: 'null-object',
        message: content.trim(),
        eventIndex: index,
        lineNumber,
      });
      return;
    }

    const parsed = parseOperatorLine(content, eventId, lineNumber, depth);
    if (!parsed) {
      diagnostics.push({
        severity: 'warning',
        code: 'unrecognized-line',
        message: 'Could not identify an operator-kind marker; line was skipped.',
        eventIndex: index,
        lineNumber,
      });
      return;
    }

    if (depth > stack.length) {
      diagnostics.push({
        severity: 'warning',
        code: 'depth-jump',
        message: `Indentation jumped from depth ${stack.length - 1} to ${depth}.`,
        eventIndex: index,
        lineNumber,
      });
    }

    const parent = depth > 0 ? stack[Math.min(depth - 1, stack.length - 1)] : undefined;
    parsed.parentId = parent?.id ?? null;
    if (parent) parent.childIds.push(parsed.id);
    else rootIds.push(parsed.id);

    nodes.push(parsed);
    stack.length = Math.min(depth, stack.length);
    stack[depth] = parsed;
    stack.length = depth + 1;
  });

  const kind = classifyEvent(nodes);
  const references = buildVariableReferences(nodes);
  if (nodes.length === 0 && rawText.trim()) {
    diagnostics.push({ severity: 'error', code: 'no-operators', message: 'No operator lines were parsed.', eventIndex: index });
  }

  return { id: eventId, index, kind, rawText, rootIds, nodes, references, diagnostics, truncated };
}

function parseOperatorLine(content: string, eventId: string, lineNumber: number, depth: number): PlanNode | null {
  const marker = new RegExp(`: (${KIND_PATTERN})(?:\\s|$)`).exec(content);
  if (!marker || marker.index === undefined) return null;

  const header = content.slice(0, marker.index);
  const kind = marker[1] as OperatorKind;
  const tail = content.slice(marker.index + marker[0].length).trim();
  const prefixBreak = header.lastIndexOf(': ');
  const queryObject = prefixBreak >= 0 ? header.slice(0, prefixBreak) : undefined;
  const operator = prefixBreak >= 0 ? header.slice(prefixBreak + 2) : header;
  const columns: PlanNode['columns'] = {};

  for (const [field, role] of COLUMN_FIELDS) {
    const value = findColumnField(tail, field);
    if (value) columns[role] = value;
  }

  const attributes: Record<string, string> = {};
  for (const key of ['VarName', 'RefVarName', 'LogOp', 'MeasureRef']) {
    const value = findAttribute(tail, key);
    if (value !== undefined) attributes[key] = value;
  }
  const dominantValue = findAttribute(tail, 'DominantValue');
  if (dominantValue !== undefined) attributes.DominantValue = dominantValue;

  const metrics = [...tail.matchAll(/#([A-Za-z][A-Za-z0-9]*)=([^\s]+)/g)].map((match) => ({
    name: match[1],
    value: match[2],
  }));
  const rangeMatch = /(?:^|\s)(\d+)-(\d+)(?=\s|$)/.exec(tail);
  const scalarType = kind === 'ScaLogOp' || kind === 'LookupPhyOp'
    ? findScalarType(tail)
    : undefined;

  return {
    id: `${eventId}:line-${lineNumber}`,
    eventId,
    lineNumber,
    depth,
    parentId: null,
    childIds: [],
    queryObject,
    operator,
    kind,
    variableName: attributes.VarName,
    referencedVariable: attributes.RefVarName,
    logicalOperator: attributes.LogOp,
    scalarType,
    dominantValue,
    relationRange: rangeMatch ? { first: rangeMatch[1], last: rangeMatch[2] } : undefined,
    columns,
    metrics,
    attributes,
    rawLine: content,
    rawTail: tail,
  };
}

function findColumnField(tail: string, field: string): ColumnSet | undefined {
  const marker = `${field}(`;
  const start = tail.indexOf(marker);
  if (start < 0) return undefined;
  const ids = readBalanced(tail, start + field.length);
  if (!ids) return undefined;
  const namesStart = skipSpaces(tail, ids.end);
  const names = tail[namesStart] === '(' ? readBalanced(tail, namesStart) : undefined;
  if (!names) return undefined;
  return {
    ids: splitComma(ids.value),
    names: parseColumnNames(names.value),
    rawIds: ids.value,
    rawNames: names.value,
  };
}

function readBalanced(text: string, openIndex: number): { value: string; end: number } | undefined {
  if (text[openIndex] !== '(') return undefined;
  let depth = 0;
  let inQuote = false;
  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];
    if (char === "'") {
      if (inQuote && text[i + 1] === "'") {
        i++;
        continue;
      }
      inQuote = !inQuote;
    }
    if (inQuote) continue;
    if (char === '(') depth++;
    if (char === ')' && --depth === 0) return { value: text.slice(openIndex + 1, i), end: i + 1 };
  }
  return undefined;
}

function parseColumnNames(raw: string): ColumnName[] {
  const names: ColumnName[] = [];
  const pattern = /'((?:''|[^'])*)'\[([^\]]*)\]/g;
  for (const match of raw.matchAll(pattern)) {
    names.push({ table: match[1].replace(/''/g, "'"), column: match[2], raw: match[0] });
  }
  return names;
}

function findAttribute(tail: string, key: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${key}=([^\\s]+)`).exec(tail);
  return match?.[1];
}

function findScalarType(tail: string): string | undefined {
  const withoutFields = tail
    .replace(/(?:DependOnCols|RequiredCols|IterCols|LookupCols|OutputCols|FreeCols|SelfCols)\([^)]*\)\([^)]*\)/g, ' ')
    .replace(/(?:^|\s)(?:VarName|RefVarName|LogOp|MeasureRef|DominantValue)=[^\s]+/g, ' ')
    .replace(/#\w+=[^\s]+/g, ' ')
    .replace(/(?:^|\s)\d+-\d+(?=\s|$)/g, ' ')
    .trim();
  return withoutFields.split(/\s+/).find(Boolean);
}

function buildVariableReferences(nodes: PlanNode[]): PlanReference[] {
  const rootsByVariable = new Map<string, string>();
  for (const node of nodes) if (node.variableName) rootsByVariable.set(node.variableName, node.id);
  return nodes
    .filter((node) => node.referencedVariable)
    .map((node) => ({
      fromNodeId: node.id,
      targetVariable: node.referencedVariable!,
      targetRootId: rootsByVariable.get(node.referencedVariable!),
      kind: 'variable' as const,
    }));
}

function classifyEvent(nodes: PlanNode[]): PlanEventKind {
  const kinds = new Set(nodes.map((node) => node.kind));
  if (kinds.has('IterPhyOp') || kinds.has('LookupPhyOp') || kinds.has('SpoolPhyOp')) return 'vp-physical';
  if (kinds.has('RelLogOp') || kinds.has('ScaLogOp')) return 'vp-logical';
  if (kinds.has('RelOp') || kinds.has('ScaOp')) return 'dq-algebrizer';
  if (kinds.has('LogOp') || kinds.has('ScaExpr')) return 'dq-logical';
  return 'unknown';
}

function splitComma(raw: string): string[] {
  return raw.trim() ? raw.split(',').map((part) => part.trim()).filter(Boolean) : [];
}

function skipSpaces(text: string, start: number): number {
  let index = start;
  while (/\s/.test(text[index] ?? '')) index++;
  return index;
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `doc-${(hash >>> 0).toString(36)}`;
}

export function columnKey(column: ColumnName): string {
  return `${column.table.toLocaleLowerCase()}\u0000${column.column.toLocaleLowerCase()}`;
}

export function nodeColumnKeys(node: PlanNode): Set<string> {
  const keys = new Set<string>();
  for (const set of Object.values(node.columns)) {
    for (const column of set?.names ?? []) keys.add(columnKey(column));
  }
  return keys;
}

export function eventLabel(kind: PlanEventKind): string {
  switch (kind) {
    case 'vp-logical': return 'VertiPaq logical';
    case 'vp-physical': return 'VertiPaq physical';
    case 'dq-algebrizer': return 'DirectQuery algebrizer';
    case 'dq-logical': return 'DirectQuery logical';
    default: return 'Unknown event';
  }
}
