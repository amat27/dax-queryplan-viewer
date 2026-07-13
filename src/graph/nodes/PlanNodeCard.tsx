import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle, Database, Link2 } from 'lucide-react';
import { columnKey } from '../../parser/queryPlan';
import type { ColumnRole, ColumnSet, PlanNode } from '../../types';
import { cn } from '../../lib/cn';

export interface PlanNodeData {
  node: PlanNode;
  selected: boolean;
  mapped: boolean;
  searchHit: boolean;
  columnHit: boolean;
  dimmed: boolean;
  activeColumnKey: string | null;
  onColumnClick: (key: string) => void;
}

interface KindStyle {
  band: string;
  chip: string;
  label: string;
  glow: string;
}

export const kindStyles: Record<string, KindStyle> = {
  RelLogOp: { band: 'from-sky-400 to-sky-600', chip: 'bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300', label: 'relation', glow: 'group-hover:shadow-sky-500/10' },
  ScaLogOp: { band: 'from-violet-400 to-violet-600', chip: 'bg-violet-500/12 text-violet-700 ring-violet-500/25 dark:text-violet-300', label: 'scalar', glow: 'group-hover:shadow-violet-500/10' },
  IterPhyOp: { band: 'from-teal-400 to-teal-600', chip: 'bg-teal-500/12 text-teal-700 ring-teal-500/25 dark:text-teal-300', label: 'iterator', glow: 'group-hover:shadow-teal-500/10' },
  LookupPhyOp: { band: 'from-amber-400 to-amber-600', chip: 'bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300', label: 'lookup', glow: 'group-hover:shadow-amber-500/10' },
  SpoolPhyOp: { band: 'from-indigo-400 to-indigo-600', chip: 'bg-indigo-500/12 text-indigo-700 ring-indigo-500/25 dark:text-indigo-300', label: 'spool', glow: 'group-hover:shadow-indigo-500/10' },
  unknown: { band: 'from-slate-400 to-slate-600', chip: 'bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-300', label: 'unknown', glow: 'group-hover:shadow-slate-500/10' },
};

const columnRoleLabels: Array<[ColumnRole, string, string, string]> = [
  ['dependsOn', 'DEPENDS', 'DependOnCols', 'text-violet-500 dark:text-violet-300/90'],
  ['required', 'REQUIRED', 'RequiredCols', 'text-sky-500 dark:text-sky-300/90'],
  ['iter', 'ITER', 'IterCols', 'text-teal-500 dark:text-teal-300/90'],
  ['lookup', 'LOOKUP', 'LookupCols', 'text-amber-500 dark:text-amber-300/90'],
  ['output', 'OUTPUT', 'OutputCols', 'text-sky-500 dark:text-sky-300/90'],
  ['free', 'FREE', 'FreeCols', 'text-fuchsia-500 dark:text-fuchsia-300/90'],
  ['self', 'SELF', 'SelfCols', 'text-slate-500 dark:text-slate-300/90'],
];

function PlanNodeCardImpl({ data }: { data: PlanNodeData }) {
  const { node } = data;
  const style = kindStyles[node.kind] ?? kindStyles.unknown;
  const columnRows = columnRoleLabels
    .map(([role, label, fieldName, color]) => ({ role, label, fieldName, color, columns: node.columns[role] }))
    .filter((row): row is { role: ColumnRole; label: string; fieldName: string; color: string; columns: ColumnSet } =>
      !!row.columns && (row.columns.ids.length > 0 || row.columns.names.length > 0),
    );
  const records = node.metrics.find((metric) => metric.name === 'Records');
  const keyCols = node.metrics.find((metric) => metric.name === 'KeyCols');
  const literal = node.value
    ?? (node.dominantValue && !/^(BLANK|NONE)$/i.test(node.dominantValue) ? node.dominantValue : undefined);

  return (
    <article
      data-testid={`plan-node-${node.lineNumber}-${node.operator}`}
      className={cn(
        'group relative w-full h-full rounded-xl overflow-hidden bg-card text-card-foreground',
        'border border-border/70 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_1px_3px_rgb(15_23_42/0.04)]',
        'transition-[transform,box-shadow,border-color,opacity,filter] duration-200 ease-out',
        'hover:-translate-y-px hover:shadow-lg hover:border-foreground/15',
        style.glow,
        data.mapped && !data.selected && 'ring-2 ring-fuchsia-500/70',
        data.searchHit && 'ring-2 ring-amber-400',
        data.columnHit && 'ring-2 ring-cyan-400',
        data.selected && 'ring-2 ring-sky-500 shadow-lg shadow-sky-500/15 border-sky-500/40',
        data.dimmed && 'opacity-[0.18] saturate-0',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-[5px] bg-gradient-to-b', style.band)} />
      <div className="h-full pl-3.5 flex flex-col">
        <div className="flex items-start gap-2 min-w-0 pr-2.5 pt-2">
          <div className="min-w-0 flex-1">
            {node.queryObject && <div className="mb-0.5 font-mono text-[9px] tracking-wide text-muted-foreground/80 truncate">{node.queryObject}</div>}
            <div
              data-testid={`operator-title-${node.lineNumber}-${node.operator}`}
              className="font-mono text-[13px] font-semibold leading-[1.2] tracking-[-0.015em] text-foreground truncate"
              title={node.operator}
            >
              {node.operator}
            </div>
          </div>
          <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-semibold tracking-wide ring-1 ring-inset shrink-0', style.chip)}>{style.label}</span>
        </div>

        {node.logicalOperator && (
          <div className="mt-1 pr-2.5 flex items-center gap-1 text-[9px] text-muted-foreground/80 font-mono min-w-0">
            <Link2 className="h-2.5 w-2.5 shrink-0 opacity-70" />
            <span className="truncate">{node.logicalOperator}</span>
          </div>
        )}

        <div className="mt-1.5 pr-2.5 space-y-1">
          {columnRows.map(({ role, label, fieldName, color, columns }) => (
            <div key={role} className="flex items-center gap-1.5 min-w-0 h-[15px]">
              <span
                className={cn('w-[47px] text-[8px] font-bold tracking-[0.06em] shrink-0', color)}
                title={fieldName}
              >
                {label}
              </span>
              <div className="flex flex-nowrap items-center gap-1 min-w-0 overflow-hidden">
                {columns.names.length > 0 ? columns.names.slice(0, 3).map((column) => {
                  const active = data.activeColumnKey === columnKey(column);
                  return (
                    <button
                      key={column.raw}
                      className={cn(
                        'h-[15px] rounded-md border px-1.5 font-mono text-[9px] leading-[13px] max-w-[178px] truncate shrink transition-colors',
                        active
                          ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-700 dark:text-cyan-200'
                          : 'border-border/60 bg-muted/60 text-foreground/90 hover:border-sky-400/50 hover:bg-sky-500/10',
                      )}
                      title={column.raw}
                      onClick={(event) => {
                        event.stopPropagation();
                        data.onColumnClick(columnKey(column));
                      }}
                    >
                      {column.table ? `${column.table}.` : ''}{column.column}
                    </button>
                  );
                }) : (
                  <span className="h-[15px] rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[9px] leading-[13px] truncate">
                    IDs {columns.ids.join(', ')}
                  </span>
                )}
                {columns.names.length > 3 && <span className="text-[9px] text-muted-foreground shrink-0 tabular-nums">+{columns.names.length - 3}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pr-2.5 pb-2 pt-1 flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {literal && (
              <span
                className="font-mono text-[9px] font-semibold text-violet-600 dark:text-violet-300 shrink-0 truncate"
                title="Scalar value (a Constant's literal, or a scalar operator's dominant value)"
              >
                = {literal}
              </span>
            )}
            {node.relationRange && (
              <span className="font-mono text-[9px] text-muted-foreground/70 shrink-0 tabular-nums" title="Relation-space column-slot range">
                slots {node.relationRange.first}-{node.relationRange.last}
              </span>
            )}
            {records && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/70 shrink-0 tabular-nums">
                <Database className="h-2.5 w-2.5 opacity-70" /> {Number(records.value).toLocaleString()} rows
              </span>
            )}
            {keyCols && (
              <span className="font-mono text-[9px] text-muted-foreground/70 truncate tabular-nums">key {keyCols.value}</span>
            )}
            {node.kind === 'unknown' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          </div>
          <span className="ml-auto text-[9px] text-muted-foreground/55 font-mono shrink-0 tabular-nums">L{node.lineNumber}</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!h-px !w-px !opacity-0 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!h-px !w-px !opacity-0 !border-0" />
    </article>
  );
}

export const PlanNodeCard = memo(PlanNodeCardImpl);
