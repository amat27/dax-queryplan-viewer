import { useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { PlanCanvas } from './graph/PlanCanvas';
import { EventSidebar } from './ui/EventSidebar';
import { FilterBar } from './ui/FilterBar';
import { Inspector } from './ui/Inspector';
import { PasteDialog } from './ui/PasteDialog';
import { SearchDialog } from './ui/SearchDialog';
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
  const logical = selectLogicalEvent(document, activeLogicalEventId);
  const physical = selectPhysicalEvent(document, activePhysicalEventId);

  return (
    <div className="app-shell">
      <TopBar onPaste={() => setPasteOpen(true)} onSearch={() => setSearchOpen(true)} />
      <div className="workspace">
        <EventSidebar />
        <main className="canvas-workspace" data-view={viewMode}>
          <FilterBar />
          <div className="canvas-grid">
            {(viewMode === 'logical' || viewMode === 'split') && (
              logical ? <PlanCanvas event={logical} title="Logical Query Plan" /> : <MissingPlan title="No logical plan event" />
            )}
            {(viewMode === 'physical' || viewMode === 'split') && (
              physical ? <PlanCanvas event={physical} title="Physical Query Plan" /> : <MissingPlan title="No physical plan event" />
            )}
          </div>
        </main>
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
