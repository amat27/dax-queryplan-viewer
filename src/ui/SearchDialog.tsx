import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { eventLabel } from '../parser/queryPlan';
import { useAppStore } from '../state/store';
import { cn } from '../lib/cn';

interface Props { open: boolean; onOpenChange: (open: boolean) => void }

export function SearchDialog({ open, onOpenChange }: Props) {
  const document = useAppStore((state) => state.document);
  const setSearch = useAppStore((state) => state.setSearch);
  const selectAndCenter = useAppStore((state) => state.selectAndCenter);
  const persistedQuery = useAppStore((state) => state.searchQuery);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);
  const entries = useMemo(() => document.events.flatMap((event) => event.nodes.map((node) => ({
    node,
    event,
    searchable: [node.operator, node.logicalOperator, node.queryObject, node.rawLine, ...Object.values(node.columns).flatMap((set) => set?.names.map((column) => column.raw) ?? [])].filter(Boolean).join(' '),
  }))), [document]);
  const fuse = useMemo(() => new Fuse(entries, { keys: ['searchable'], threshold: 0.3, ignoreLocation: true }), [entries]);
  const results = useMemo(() => query.trim() ? fuse.search(query).slice(0, 60).map((result) => result.item) : entries.slice(0, 30), [entries, fuse, query]);

  useEffect(() => {
    if (open) {
      setQuery(persistedQuery);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open, persistedQuery]);
  useEffect(() => {
    setSearch(query, query.trim() ? results.map((entry) => entry.node.id) : []);
    setActive(0);
  }, [query, results, setSearch]);

  const choose = (index: number) => {
    const result = results[index];
    if (!result) return;
    selectAndCenter(result.event.id, result.node.id);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content top-[16%] w-[min(680px,92vw)]" data-testid="search-dialog">
          <Dialog.Title className="sr-only">Search query plan</Dialog.Title>
          <div className="h-12 px-3 flex items-center gap-2 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={input}
              data-testid="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') { setActive((value) => Math.min(results.length - 1, value + 1)); event.preventDefault(); }
                if (event.key === 'ArrowUp') { setActive((value) => Math.max(0, value - 1)); event.preventDefault(); }
                if (event.key === 'Enter') choose(active);
              }}
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Operator, column, variable, metric..."
            />
            <span className="kbd">Esc</span>
          </div>
          <div className="max-h-[56vh] overflow-y-auto py-1">
            {results.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No matches.</div>}
            {results.map((result, index) => (
              <button
                key={result.node.id}
                data-testid={`search-result-${result.node.lineNumber}-${result.node.operator}`}
                className={cn('search-result', index === active && 'active')}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <div className="min-w-0">
                  <div className="font-mono text-[12px] font-medium truncate">{result.node.operator}</div>
                  <div className="font-mono text-[9px] text-muted-foreground truncate">{result.node.rawTail}</div>
                </div>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] shrink-0">{eventLabel(result.event.kind)}</span>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
