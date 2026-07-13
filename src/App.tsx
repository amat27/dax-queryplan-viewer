import { useRef, useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { PlanCanvas } from './graph/PlanCanvas';
import { EventSidebar } from './ui/EventSidebar';
import { FilterBar } from './ui/FilterBar';
import { Inspector } from './ui/Inspector';
import { PasteDialog } from './ui/PasteDialog';
import { SearchDialog } from './ui/SearchDialog';
import { QueryBar } from './ui/QueryBar';
import { ResizeHandle } from './ui/ResizeHandle';
import { TopBar } from './ui/TopBar';
import { selectLogicalEvent, selectPhysicalEvent, useAppStore } from './state/store';
import { useThemeEffect } from './state/useThemeEffect';
import { useGlobalShortcuts } from './state/useGlobalShortcuts';

export default function App() {
  useThemeEffect();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useGlobalShortcuts(() => setSearchOpen(true));
  const document = useAppStore((state) => state.document);
  const viewMode = useAppStore((state) => state.viewMode);
  const activeLogicalEventId = useAppStore((state) => state.activeLogicalEventId);
  const activePhysicalEventId = useAppStore((state) => state.activePhysicalEventId);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const splitRatio = useAppStore((state) => state.splitRatio);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const setSidebarWidth = useAppStore((state) => state.setSidebarWidth);
  const setInspectorWidth = useAppStore((state) => state.setInspectorWidth);
  const setSplitRatio = useAppStore((state) => state.setSplitRatio);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const logical = selectLogicalEvent(document, activeLogicalEventId);
  const physical = selectPhysicalEvent(document, activePhysicalEventId);
  const isSplit = viewMode === 'split';
  const showLogical = viewMode === 'logical' || isSplit;
  const showPhysical = viewMode === 'physical' || isSplit;

  return (
    <div className="app-shell">
      <TopBar onPaste={() => setPasteOpen(true)} onSearch={() => setSearchOpen(true)} />
      <div className="workspace" ref={workspaceRef}>
        <EventSidebar />
        {!sidebarCollapsed && (
          <ResizeHandle
            testid="resize-sidebar"
            onDrag={(x) => {
              const rect = workspaceRef.current?.getBoundingClientRect();
              if (rect) setSidebarWidth(x - rect.left);
            }}
          />
        )}

        <main className="canvas-workspace" data-view={viewMode}>
          <FilterBar />
          <QueryBar />
          <div className="canvas-grid" ref={gridRef} data-view={viewMode}>
            {showLogical && (
              <div className="plan-slot" style={{ flexGrow: isSplit ? splitRatio : 1, flexBasis: 0 }}>
                {logical ? <PlanCanvas event={logical} title="Logical Query Plan" /> : <MissingPlan title="No logical plan event" />}
              </div>
            )}
            {isSplit && (
              <ResizeHandle
                testid="resize-split"
                onDrag={(x) => {
                  const rect = gridRef.current?.getBoundingClientRect();
                  if (rect && rect.width > 0) setSplitRatio((x - rect.left) / rect.width);
                }}
              />
            )}
            {showPhysical && (
              <div className="plan-slot" style={{ flexGrow: isSplit ? 1 - splitRatio : 1, flexBasis: 0 }}>
                {physical ? <PlanCanvas event={physical} title="Physical Query Plan" /> : <MissingPlan title="No physical plan event" />}
              </div>
            )}
          </div>
        </main>

        {selectedNodeId && (
          <ResizeHandle
            testid="resize-inspector"
            onDrag={(x) => {
              const rect = workspaceRef.current?.getBoundingClientRect();
              if (rect) setInspectorWidth(rect.right - x);
            }}
          />
        )}
        <Inspector />
      </div>
      <PasteDialog open={pasteOpen} onOpenChange={setPasteOpen} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function MissingPlan({ title }: { title: string }) {
  return <section className="plan-panel missing-plan"><FileQuestion className="h-8 w-8" /><strong>{title}</strong><span>Choose another event or load a document containing this plan type.</span></section>;
}
