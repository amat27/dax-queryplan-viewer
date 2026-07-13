import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { LayoutDirection, PlanEvent, PlanNode } from '../types';

export interface Point { x: number; y: number }

export interface LaidOutPlanNode extends PlanNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaidOutPlanEdge {
  id: string;
  source: string;
  target: string;
  points: Point[];
}

export interface LaidOutPlan {
  nodes: LaidOutPlanNode[];
  edges: LaidOutPlanEdge[];
  width: number;
  height: number;
}

export const NODE_DIMS = { width: 276, height: 70 };
const elk = new ELK();

export function nodeDimensions(node: PlanNode) {
  const columnRows = Object.values(node.columns).filter(
    (columns) => columns && (columns.ids.length > 0 || columns.names.length > 0),
  ).length;
  return {
    width: NODE_DIMS.width,
    height: NODE_DIMS.height
      + Math.max(0, columnRows - 1) * 19
      + (node.logicalOperator ? 15 : 0)
      + (node.queryObject ? 13 : 0),
  };
}

export async function layoutPlan(event: PlanEvent, direction: LayoutDirection, visibleIds?: Set<string>): Promise<LaidOutPlan> {
  const nodes = visibleIds ? event.nodes.filter((node) => visibleIds.has(node.id)) : event.nodes;
  if (nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };
  const ids = new Set(nodes.map((node) => node.id));
  const sourceSide = direction === 'DOWN' ? 'SOUTH' : 'EAST';
  const targetSide = direction === 'DOWN' ? 'NORTH' : 'WEST';
  const src = (id: string) => `${id}:source`;
  const dst = (id: string) => `${id}:target`;
  const treeEdges = nodes.flatMap((node) => node.childIds
    .filter((childId) => ids.has(childId))
    .map((childId) => ({ id: `${node.id}->${childId}`, source: node.id, target: childId })));

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      'elk.layered.spacing.nodeNodeBetweenLayers': '52',
      'elk.spacing.nodeNode': '28',
      'elk.spacing.componentComponent': '56',
      'elk.padding': '[top=22,left=22,bottom=22,right=22]',
    },
    children: nodes.map((node) => {
      const dimensions = nodeDimensions(node);
      return {
        id: node.id,
        width: dimensions.width,
        height: dimensions.height,
        layoutOptions: { 'elk.portConstraints': 'FIXED_SIDE' },
        ports: [
          { id: src(node.id), layoutOptions: { 'elk.port.side': sourceSide } },
          { id: dst(node.id), layoutOptions: { 'elk.port.side': targetSide } },
        ],
      };
    }),
    edges: treeEdges.map<ElkExtendedEdge>((edge) => ({
      id: edge.id,
      sources: [src(edge.source)],
      targets: [dst(edge.target)],
    })),
  };

  const result = await elk.layout(graph);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const laidOutNodes = (result.children ?? []).map((child) => ({
    ...byId.get(child.id)!,
    x: child.x ?? 0,
    y: child.y ?? 0,
    width: child.width ?? NODE_DIMS.width,
    height: child.height ?? NODE_DIMS.height,
  }));
  const byEdge = new Map(treeEdges.map((edge) => [edge.id, edge]));
  const laidOutEdges = (result.edges ?? []).map((edge) => {
    const original = byEdge.get(edge.id)!;
    const section = edge.sections?.[0];
    return {
      ...original,
      points: section
        ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((point) => ({ x: point.x, y: point.y }))
        : [],
    };
  });
  return { nodes: laidOutNodes, edges: laidOutEdges, width: result.width ?? 0, height: result.height ?? 0 };
}

export function buildOrthoPath(points: Point[], radius = 8): string {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incoming = Math.hypot(current.x - previous.x, current.y - previous.y);
    const outgoing = Math.hypot(next.x - current.x, next.y - current.y);
    if (!incoming || !outgoing) continue;
    const amount = Math.min(radius, incoming / 2, outgoing / 2);
    const ax = current.x - ((current.x - previous.x) * amount) / incoming;
    const ay = current.y - ((current.y - previous.y) * amount) / incoming;
    const bx = current.x + ((next.x - current.x) * amount) / outgoing;
    const by = current.y + ((next.y - current.y) * amount) / outgoing;
    path += ` L ${ax} ${ay} Q ${current.x} ${current.y} ${bx} ${by}`;
  }
  const last = points.at(-1)!;
  return `${path} L ${last.x} ${last.y}`;
}
