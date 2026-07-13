import { ArrowUpRight, Braces, ChevronRight, Crosshair, GitCompareArrows, Info, X } from 'lucide-react';
import { columnKey } from '../parser/queryPlan';
import { findEventForNode, findNode, useAppStore } from '../state/store';
import type { ColumnRole, MappingCandidate, PlanNode } from '../types';
import { cn } from '../lib/cn';

const ROLE_LABELS: Record<ColumnRole, string> = {
  dependsOn: 'DependOnCols',
  required: 'RequiredCols',
  iter: 'IterCols',
  lookup: 'LookupCols',
  output: 'OutputCols',
  free: 'FreeCols',
  self: 'SelfCols',
};

const GLOSSARY: Record<string, string> = {
  DependOnCols: 'Columns supplied by the current parent row or context before this logical operator can be evaluated.',
  RequiredCols: 'Columns the logical operator must expose to its parent. Co-occurrence does not by itself prove a relationship or join.',
  IterCols: 'Runtime fields returned by each NextRow() call of a physical iterator.',
  LookupCols: 'Fields read from the parent row when a physical lookup operator is opened. This is the actual probe arity.',
  relationRange: 'Column-slot range owned by this relational space. It is not a row range, table ID, or model-column ordinal.',
  DominantValue: 'The scalar operator default/dominant value used for sparse evaluation and lookup misses; not a cardinality estimate.',
  KeyCols: 'Width of the cache key layout. It is not the number of lookup or semijoin columns.',
  ValueCols: 'Number of scalar payload fields in the physical cache record.',
  FieldCols: 'Number of compact DataID fields exposed by a Cache iterator record.',
};

export function Inspector() {
  const document = useAppStore((state) => state.document);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const mappings = useAppStore((state) => state.mappings);
  const showMappings = useAppStore((state) => state.showMappings);
  const setSelectedNode = useAppStore((state) => state.setSelectedNode);
  const setSelectedColumnKey = useAppStore((state) => state.setSelectedColumnKey);
  const selectAndCenter = useAppStore((state) => state.selectAndCenter);
  const pushFocus = useAppStore((state) => state.pushFocus);
  const node = findNode(document, selectedNodeId);
  if (!node) return null;
  const event = findEventForNode(document, node.id)!;
  const candidates = showMappings ? candidatesFor(node, mappings) : [];
  const parent = node.parentId ? findNode(document, node.parentId) : undefined;

  return (
    <aside className="inspector" data-testid="inspector">
      <div className="inspector-title">
        <Braces className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{node.kind}</span>
        <button className="btn-ghost ml-auto h-7 w-7 p-0" onClick={() => setSelectedNode(null)} aria-label="Close inspector"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="inspector-scroll">
        <section className="inspector-hero">
          {node.queryObject && <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{node.queryObject}</div>}
          <h2 className="font-mono text-[15px] font-semibold break-all">{node.operator}</h2>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="inspector-badge">line {node.lineNumber}</span>
            <span className="inspector-badge">depth {node.depth}</span>
            {node.logicalOperator && <span className="inspector-badge accent">LogOp={node.logicalOperator}</span>}
            {node.scalarType && <span className="inspector-badge">{node.scalarType}</span>}
          </div>
        </section>

        <div className="p-3 border-b border-border grid gap-1.5">
          <button className="btn-outline h-8 text-xs justify-start" onClick={() => pushFocus(event.id, node.id)}><Crosshair className="h-3.5 w-3.5" /> Focus subtree <span className="ml-auto text-muted-foreground">{node.childIds.length} direct inputs</span></button>
          {parent && <button className="btn-outline h-8 text-xs justify-start" onClick={() => selectAndCenter(event.id, parent.id)}><ArrowUpRight className="h-3.5 w-3.5" /> Go to parent <span className="ml-auto font-mono text-[10px] truncate max-w-[150px]">{parent.operator}</span></button>}
        </div>

        <InspectorSection title="Columns">
          {Object.entries(node.columns).length === 0 && <Empty>None emitted in this line.</Empty>}
          {(Object.entries(node.columns) as Array<[ColumnRole, NonNullable<PlanNode['columns'][ColumnRole]>]>).map(([role, set]) => (
            <div key={role} className="field-block">
              <FieldHeading name={ROLE_LABELS[role]} />
              <div className="font-mono text-[10px] text-muted-foreground mb-1">IDs ({set.rawIds || 'empty'})</div>
              <div className="flex flex-wrap gap-1">
                {set.names.length === 0 && <span className="text-[10px] text-muted-foreground">No named columns</span>}
                {set.names.map((column) => <button key={column.raw} className="column-pill" onClick={() => setSelectedColumnKey(columnKey(column))}>{column.raw}</button>)}
              </div>
              <Glossary text={GLOSSARY[ROLE_LABELS[role]]} />
            </div>
          ))}
        </InspectorSection>

        {(node.relationRange || node.dominantValue || node.value || node.metrics.length > 0) && (
          <InspectorSection title="Runtime / layout">
            {node.value && !node.dominantValue && <FactRow label="Value" value={node.value} help="The operator's literal scalar value (e.g. a Constant)." />}
            {node.relationRange && <FactRow label="Relation slots" value={`${node.relationRange.first}-${node.relationRange.last}`} help={GLOSSARY.relationRange} />}
            {node.dominantValue && <FactRow label="DominantValue" value={node.dominantValue} help={GLOSSARY.DominantValue} />}
            {node.metrics.map((metric) => <FactRow key={metric.name} label={`#${metric.name}`} value={metric.value} help={GLOSSARY[metric.name]} />)}
          </InspectorSection>
        )}

        <InspectorSection title="Tree position">
          <FactRow label="Parent" value={parent?.operator ?? 'root'} />
          {node.childIds.map((childId, index) => {
            const child = findNode(document, childId)!;
            return <button key={childId} className="tree-link" onClick={() => selectAndCenter(event.id, childId)}><span className="text-muted-foreground">input {index + 1}</span><span className="font-mono truncate">{child.operator}</span><ChevronRight className="ml-auto h-3 w-3" /></button>;
          })}
        </InspectorSection>

        {showMappings && (
          <InspectorSection title="Logical / physical candidates" icon={<GitCompareArrows className="h-3 w-3" />}>
            <div className="mapping-warning"><Info className="h-3.5 w-3.5 shrink-0" />Heuristic only: the trace carries LogOp names, not stable logical-node IDs.</div>
            {candidates.length === 0 && <Empty>No candidate can be derived for this operator.</Empty>}
            {candidates.map(({ candidate, other }) => (
              <button key={`${candidate.logicalNodeId}-${candidate.physicalNodeId}`} className="mapping-card" onClick={() => selectAndCenter(other.eventId, other.id)}>
                <div className="flex items-center gap-1.5"><span className={cn('confidence', candidate.confidence)}>{candidate.confidence}</span><span className="font-mono text-[11px] truncate">{other.operator}</span><span className="ml-auto text-[9px] tabular-nums">{candidate.score}</span></div>
                <ul className="mt-1 text-[9px] text-muted-foreground leading-relaxed">{candidate.reasons.map((reason) => <li key={reason}>· {reason}</li>)}</ul>
              </button>
            ))}
          </InspectorSection>
        )}

        <InspectorSection title="Raw plan line">
          <pre className="raw-line">{node.rawLine}</pre>
        </InspectorSection>
      </div>
    </aside>
  );
}

function candidatesFor(node: PlanNode, mappings: MappingCandidate[]) {
  return mappings
    .filter((candidate) => candidate.logicalNodeId === node.id || candidate.physicalNodeId === node.id)
    .map((candidate) => {
      const otherId = candidate.logicalNodeId === node.id ? candidate.physicalNodeId : candidate.logicalNodeId;
      return { candidate, otherId };
    })
    .sort((a, b) => b.candidate.score - a.candidate.score)
    .map((entry) => ({ ...entry, other: findNode(useAppStore.getState().document, entry.otherId)! }));
}

function InspectorSection({ title, icon, children }: React.PropsWithChildren<{ title: string; icon?: React.ReactNode }>) {
  return <section className="inspector-section"><h3>{icon}{title}</h3>{children}</section>;
}
function FieldHeading({ name }: { name: string }) { return <div className="flex items-center justify-between mb-1"><span className="font-mono text-[11px] font-semibold">{name}</span></div>; }
function Glossary({ text }: { text?: string }) { return text ? <p className="field-help"><Info className="h-3 w-3 shrink-0 mt-0.5" />{text}</p> : null; }
function Empty({ children }: React.PropsWithChildren) { return <div className="text-[10px] text-muted-foreground italic">{children}</div>; }
function FactRow({ label, value, help }: { label: string; value: string; help?: string }) {
  return <div className="fact-row"><div className="flex items-center justify-between gap-3"><span>{label}</span><code>{value}</code></div>{help && <Glossary text={help} />}</div>;
}
