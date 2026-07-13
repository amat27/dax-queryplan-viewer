import { create } from 'zustand';
import { DEMO_INPUT, DEMO_NAME } from '../data/demo';
import { buildMappingCandidates } from '../mapping/candidates';
import { parseQueryPlanInput } from '../parser/queryPlan';
import type {
  LayoutDirection,
  MappingCandidate,
  PlanDocument,
  PlanEvent,
  PlanNode,
  ViewMode,
} from '../types';

interface FocusFrame {
  eventId: string;
  rootId: string;
}

interface AppState {
  document: PlanDocument;
  mappings: MappingCandidate[];
  activeLogicalEventId: string | null;
  activePhysicalEventId: string | null;
  viewMode: ViewMode;
  layoutDirection: LayoutDirection;
  theme: 'light' | 'dark' | 'system';
  showReferences: boolean;
  showMappings: boolean;
  selectedNodeId: string | null;
  selectedColumnKey: string | null;
  searchQuery: string;
  searchHits: string[];
  focusStack: FocusFrame[];
  centerRequest: { eventId: string; nodeId: string; nonce: number } | null;
  loadInput: (raw: string, name?: string) => void;
  loadDemo: () => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveEvent: (event: PlanEvent) => void;
  setLayoutDirection: (direction: LayoutDirection) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setShowReferences: (show: boolean) => void;
  setShowMappings: (show: boolean) => void;
  setSelectedNode: (id: string | null) => void;
  selectAndCenter: (eventId: string, nodeId: string) => void;
  setSelectedColumnKey: (key: string | null) => void;
  setSearch: (query: string, hits: string[]) => void;
  clearSearch: () => void;
  pushFocus: (eventId: string, rootId: string) => void;
  popFocus: () => void;
  clearFocus: () => void;
}

function initialize(raw = DEMO_INPUT, name = DEMO_NAME) {
  const document = parseQueryPlanInput(raw, name);
  return { document, mappings: deriveMappings(document) };
}

const initial = initialize();
const initialLogical = initial.document.events.find((event) => isLogical(event));
const initialPhysical = initial.document.events.find((event) => event.kind === 'vp-physical');

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  activeLogicalEventId: initialLogical?.id ?? null,
  activePhysicalEventId: initialPhysical?.id ?? null,
  viewMode: 'split',
  layoutDirection: 'DOWN',
  theme: 'system',
  showReferences: true,
  showMappings: true,
  selectedNodeId: null,
  selectedColumnKey: null,
  searchQuery: '',
  searchHits: [],
  focusStack: [],
  centerRequest: null,

  loadInput: (raw, name = 'pasted-query-plan') => {
    const next = initialize(raw, name);
    set({
      ...next,
      activeLogicalEventId: next.document.events.find((event) => isLogical(event))?.id ?? null,
      activePhysicalEventId: next.document.events.find((event) => event.kind === 'vp-physical')?.id ?? null,
      selectedNodeId: null,
      selectedColumnKey: null,
      searchQuery: '',
      searchHits: [],
      focusStack: [],
      centerRequest: null,
    });
  },
  loadDemo: () => {
    const next = initialize();
    set({
      ...next,
      activeLogicalEventId: next.document.events.find((event) => isLogical(event))?.id ?? null,
      activePhysicalEventId: next.document.events.find((event) => event.kind === 'vp-physical')?.id ?? null,
      selectedNodeId: null,
      selectedColumnKey: null,
      searchQuery: '',
      searchHits: [],
      focusStack: [],
    });
  },
  setViewMode: (viewMode) => set({ viewMode }),
  setActiveEvent: (event) => set((state) => {
    const activeLogicalEventId = event.kind === 'vp-physical' ? state.activeLogicalEventId : event.id;
    const activePhysicalEventId = event.kind === 'vp-physical' ? event.id : state.activePhysicalEventId;
    const logical = selectLogicalEvent(state.document, activeLogicalEventId);
    const physical = selectPhysicalEvent(state.document, activePhysicalEventId);
    return {
      activeLogicalEventId,
      activePhysicalEventId,
      mappings: logical && physical ? buildMappingCandidates(logical, physical) : [],
      viewMode: state.viewMode === 'split'
        ? 'split'
        : event.kind === 'vp-physical' ? 'physical' : 'logical',
      selectedNodeId: null,
    };
  }),
  setLayoutDirection: (layoutDirection) => set({ layoutDirection }),
  setTheme: (theme) => set({ theme }),
  setShowReferences: (showReferences) => set({ showReferences }),
  setShowMappings: (showMappings) => set({ showMappings }),
  setSelectedNode: (selectedNodeId) => set({ selectedNodeId, selectedColumnKey: null }),
  selectAndCenter: (eventId, nodeId) => set((state) => ({
    selectedNodeId: nodeId,
    selectedColumnKey: null,
    centerRequest: { eventId, nodeId, nonce: (state.centerRequest?.nonce ?? 0) + 1 },
  })),
  setSelectedColumnKey: (selectedColumnKey) => set({ selectedColumnKey }),
  setSearch: (searchQuery, searchHits) => set({ searchQuery, searchHits }),
  clearSearch: () => set({ searchQuery: '', searchHits: [] }),
  pushFocus: (eventId, rootId) => set((state) => ({ focusStack: [...state.focusStack, { eventId, rootId }] })),
  popFocus: () => set((state) => ({ focusStack: state.focusStack.slice(0, -1) })),
  clearFocus: () => set({ focusStack: [] }),
}));

function deriveMappings(document: PlanDocument): MappingCandidate[] {
  const logical = document.events.find((event) => event.kind === 'vp-logical');
  const physical = document.events.find((event) => event.kind === 'vp-physical');
  return logical && physical ? buildMappingCandidates(logical, physical) : [];
}

export function selectLogicalEvent(document: PlanDocument, id?: string | null): PlanEvent | undefined {
  return document.events.find((event) => event.id === id && isLogical(event))
    ?? document.events.find((event) => isLogical(event));
}

export function selectPhysicalEvent(document: PlanDocument, id?: string | null): PlanEvent | undefined {
  return document.events.find((event) => event.id === id && event.kind === 'vp-physical')
    ?? document.events.find((event) => event.kind === 'vp-physical');
}

export function findNode(document: PlanDocument, id: string | null): PlanNode | undefined {
  if (!id) return undefined;
  for (const event of document.events) {
    const node = event.nodes.find((candidate) => candidate.id === id);
    if (node) return node;
  }
  return undefined;
}

export function findEventForNode(document: PlanDocument, id: string): PlanEvent | undefined {
  return document.events.find((event) => event.nodes.some((node) => node.id === id));
}

export function descendants(event: PlanEvent, rootId: string): Set<string> {
  const byId = new Map(event.nodes.map((node) => [node.id, node]));
  const result = new Set<string>();
  const visit = (id: string) => {
    if (result.has(id)) return;
    result.add(id);
    for (const child of byId.get(id)?.childIds ?? []) visit(child);
  };
  visit(rootId);
  return result;
}

function isLogical(event: PlanEvent): boolean {
  return event.kind === 'vp-logical' || event.kind === 'dq-logical' || event.kind === 'dq-algebrizer';
}
