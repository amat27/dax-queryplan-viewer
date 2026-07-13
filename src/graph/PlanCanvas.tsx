import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  PanOnScrollMode,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from 'reactflow';
import { AlertTriangle } from 'lucide-react';
import { layoutPlan, type LaidOutPlan } from '../layout/elk';
import { columnKey } from '../parser/queryPlan';
import { descendants, useAppStore } from '../state/store';
import type { PlanEvent } from '../types';
import { TreeEdge, type TreeEdgeData } from './edges/TreeEdge';
import { PlanNodeCard, kindStyles, type PlanNodeData } from './nodes/PlanNodeCard';
import { useRightDragZoom } from './useRightDragZoom';

const nodeTypes = { plan: PlanNodeCard };
const edgeTypes = { tree: TreeEdge };

interface Props {
  event: PlanEvent;
  title: string;
}

function PlanCanvasInner({ event, title }: Props) {
  const direction = useAppStore((state) => state.layoutDirection);
  const viewMode = useAppStore((state) => state.viewMode);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const selectedColumnKey = useAppStore((state) => state.selectedColumnKey);
  const searchHits = useAppStore((state) => state.searchHits);
  const mappings = useAppStore((state) => state.mappings);
  const showMappings = useAppStore((state) => state.showMappings);
  const showReferences = useAppStore((state) => state.showReferences);
  const focusStack = useAppStore((state) => state.focusStack);
  const centerRequest = useAppStore((state) => state.centerRequest);
  const setSelectedNode = useAppStore((state) => state.setSelectedNode);
  const setSelectedColumnKey = useAppStore((state) => state.setSelectedColumnKey);
  const pushFocus = useAppStore((state) => state.pushFocus);
  const [layout, setLayout] = useState<LaidOutPlan | null>(null);
  const [pending, setPending] = useState(true);
  const flow = useReactFlow();
  const host = useRef<HTMLDivElement | null>(null);
  const layoutVersion = useRef(0);
  const lastCenterNonce = useRef(0);
  const minFitZoom = viewMode === 'split' ? 0.4 : 0.75;
  useRightDragZoom(host);

  const eventFocus = [...focusStack].reverse().find((frame) => frame.eventId === event.id);
  const visibleIds = useMemo(
    () => eventFocus ? descendants(event, eventFocus.rootId) : undefined,
    [event, eventFocus],
  );

  useEffect(() => {
    let current = true;
    setPending(true);
    void layoutPlan(event, direction, visibleIds).then((result) => {
      if (!current) return;
      setLayout(result);
      setPending(false);
      layoutVersion.current++;
      setTimeout(() => flow.fitView({ padding: 0.16, minZoom: minFitZoom, maxZoom: 1.1, duration: 350 }), 30);
    });
    return () => { current = false; };
  }, [event, direction, visibleIds, flow, minFitZoom]);

  useEffect(() => {
    const element = host.current;
    if (!element || !layout) return;
    let previousWidth = element.clientWidth;
    let previousHeight = element.clientHeight;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (Math.abs(width - previousWidth) < 16 && Math.abs(height - previousHeight) < 16) return;
      previousWidth = width;
      previousHeight = height;
      clearTimeout(timer);
      timer = setTimeout(() => flow.fitView({ padding: 0.12, minZoom: minFitZoom, maxZoom: 1.1, duration: 300 }), 80);
    });
    observer.observe(element);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [flow, layout, minFitZoom]);

  useEffect(() => {
    if (!centerRequest || centerRequest.eventId !== event.id || !layout) return;
    if (centerRequest.nonce === lastCenterNonce.current) return;
    const node = layout.nodes.find((candidate) => candidate.id === centerRequest.nodeId);
    if (!node) return;
    lastCenterNonce.current = centerRequest.nonce;
    flow.setCenter(node.x + node.width / 2, node.y + node.height / 2, { zoom: flow.getZoom(), duration: 350 });
  }, [centerRequest, event.id, flow, layout]);

  const mappedIds = useMemo(() => {
    if (!selectedNodeId || !showMappings) return new Set<string>();
    const result = new Set<string>();
    for (const mapping of mappings) {
      if (mapping.logicalNodeId === selectedNodeId) result.add(mapping.physicalNodeId);
      if (mapping.physicalNodeId === selectedNodeId) result.add(mapping.logicalNodeId);
    }
    return result;
  }, [mappings, selectedNodeId, showMappings]);
  const searchSet = useMemo(() => new Set(searchHits), [searchHits]);

  const nodes = useMemo<Node<PlanNodeData>[]>(() => (layout?.nodes ?? []).map((node) => {
    const keys = new Set(Object.values(node.columns).flatMap((set) => set?.names.map(columnKey) ?? []));
    const columnHit = !!selectedColumnKey && keys.has(selectedColumnKey);
    const searchHit = searchSet.has(node.id);
    const selected = selectedNodeId === node.id;
    const mapped = mappedIds.has(node.id);
    const dimmed = (!!selectedColumnKey && !columnHit) || (searchSet.size > 0 && !searchHit && !selected && !mapped);
    return {
      id: node.id,
      type: 'plan',
      position: { x: node.x, y: node.y },
      width: node.width,
      height: node.height,
      draggable: false,
      data: { node, selected, mapped, searchHit, columnHit, dimmed, activeColumnKey: selectedColumnKey, onColumnClick: setSelectedColumnKey },
      style: { width: node.width, height: node.height },
      zIndex: selected || mapped || searchHit || columnHit ? 10 : 1,
    };
  }), [layout, mappedIds, searchSet, selectedColumnKey, selectedNodeId, setSelectedColumnKey]);

  const highlightedNodeIds = useMemo(() => new Set([selectedNodeId, ...mappedIds].filter(Boolean) as string[]), [mappedIds, selectedNodeId]);
  const edges = useMemo<Edge<TreeEdgeData>[]>(() => {
    const treeEdges = (layout?.edges ?? []).map((edge) => {
      const highlighted = highlightedNodeIds.has(edge.source) || highlightedNodeIds.has(edge.target);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'tree',
        zIndex: highlighted ? 10 : 0,
        data: { points: edge.points, highlighted, dimmed: highlightedNodeIds.size > 0 && !highlighted },
      } satisfies Edge<TreeEdgeData>;
    });
    if (!showReferences) return treeEdges;
    const referenceEdges = event.references
      .filter((reference) => reference.targetRootId && (!visibleIds || (visibleIds.has(reference.fromNodeId) && visibleIds.has(reference.targetRootId))))
      .map((reference) => ({
        id: `ref:${reference.fromNodeId}->${reference.targetRootId}`,
        source: reference.fromNodeId,
        target: reference.targetRootId!,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#a855f7', strokeDasharray: '5 5', opacity: 0.7 },
      }));
    return [...treeEdges, ...referenceEdges];
  }, [event.references, highlightedNodeIds, layout, showReferences, visibleIds]);

  return (
    <section className="plan-panel" data-testid={`plan-panel-${event.kind}`}>
      <header className="plan-panel-header">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full ${event.kind.includes('physical') ? 'bg-teal-500' : 'bg-sky-500'}`} />
          <strong className="text-xs">{title}</strong>
          <span className="text-[10px] text-muted-foreground">{event.nodes.length} operators · {event.rootIds.length} root{event.rootIds.length === 1 ? '' : 's'}</span>
        </div>
        {event.truncated && <span className="flex items-center gap-1 text-[10px] text-amber-600"><AlertTriangle className="h-3 w-3" /> truncated</span>}
      </header>
      <div ref={host} className="relative flex-1 min-h-0" data-testid={`canvas-${event.kind}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={false}
          zoomOnPinch
          zoomOnDoubleClick={false}
          panOnDrag
          minZoom={0.2}
          maxZoom={2}
          fitView
          fitViewOptions={{ padding: 0.16, minZoom: minFitZoom, maxZoom: 1.1 }}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onNodeDoubleClick={(_, node) => pushFocus(event.id, node.id)}
          onPaneClick={() => setSelectedNode(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} className="opacity-40" />
          <Controls showInteractive={false} className="!bg-card/85 !border !border-border" />
          {nodes.length > 3 && (
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                const kind = (node.data as PlanNodeData | undefined)?.node.kind ?? 'unknown';
                const colors: Record<string, string> = {
                  RelLogOp: '#0ea5e9', ScaLogOp: '#8b5cf6', IterPhyOp: '#14b8a6', LookupPhyOp: '#f59e0b', SpoolPhyOp: '#6366f1', unknown: '#64748b',
                };
                return colors[kind] ?? colors.unknown;
              }}
              maskColor="rgb(15 23 42 / 0.5)"
              className="!bg-card/85 !border !border-border !rounded-md"
            />
          )}
        </ReactFlow>
        {pending && <div className="absolute top-2 right-2 glass px-2 py-1 text-[10px]">Laying out...</div>}
      </div>
    </section>
  );
}

export function PlanCanvas(props: Props) {
  return <ReactFlowProvider><PlanCanvasInner {...props} /></ReactFlowProvider>;
}
