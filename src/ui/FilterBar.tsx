import { Crosshair, GitCompareArrows, RotateCcw, Search, Tags, X } from 'lucide-react';
import { findNode, useAppStore } from '../state/store';

export function FilterBar() {
  const document = useAppStore((state) => state.document);
  const focusStack = useAppStore((state) => state.focusStack);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const searchHits = useAppStore((state) => state.searchHits);
  const selectedColumnKey = useAppStore((state) => state.selectedColumnKey);
  const popFocus = useAppStore((state) => state.popFocus);
  const clearFocus = useAppStore((state) => state.clearFocus);
  const clearSearch = useAppStore((state) => state.clearSearch);
  const setSelectedColumnKey = useAppStore((state) => state.setSelectedColumnKey);
  if (!focusStack.length && !searchHits.length && !selectedColumnKey) return null;

  const reset = () => { clearFocus(); clearSearch(); setSelectedColumnKey(null); };
  const displayColumn = selectedColumnKey?.replace('\u0000', '.');

  return (
    <div className="filter-bar" data-testid="filter-bar">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">View</span>
      {focusStack.length > 0 && (
        <span className="filter-chip"><Crosshair className="h-3 w-3" />{focusStack.map((focus) => findNode(document, focus.rootId)?.operator ?? 'focus').join(' / ')}<button onClick={popFocus} title="Pop focus"><X className="h-3 w-3" /></button></span>
      )}
      {searchHits.length > 0 && (
        <span className="filter-chip"><Search className="h-3 w-3" /><span className="max-w-[140px] truncate">“{searchQuery}”</span><span className="text-muted-foreground">{searchHits.length}</span><button onClick={clearSearch}><X className="h-3 w-3" /></button></span>
      )}
      {selectedColumnKey && (
        <span className="filter-chip"><Tags className="h-3 w-3" /><span className="font-mono max-w-[180px] truncate">{displayColumn}</span><button onClick={() => setSelectedColumnKey(null)}><X className="h-3 w-3" /></button></span>
      )}
      <button className="btn-ghost h-6 px-1.5 text-[10px]" onClick={reset}><RotateCcw className="h-3 w-3" /> Reset</button>
    </div>
  );
}
