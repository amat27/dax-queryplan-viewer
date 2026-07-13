import { useState } from 'react';
import { Check, Copy, FileCode2, X } from 'lucide-react';
import { useAppStore } from '../state/store';

/** A collapsible strip above the canvases showing the source DAX query.
 *  Unlike a modal it coexists with the trees. */
export function QueryBar() {
  const query = useAppStore((state) => state.document.query);
  const open = useAppStore((state) => state.queryBarOpen);
  const setOpen = useAppStore((state) => state.setQueryBarOpen);
  const [copied, setCopied] = useState(false);

  if (!open || !query) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="query-bar" data-testid="query-bar">
      <div className="query-bar-head">
        <FileCode2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Source query</span>
        <button className="btn-ghost h-6 px-1.5 text-[10px] gap-1 ml-auto" onClick={copy} data-testid="query-bar-copy">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button className="btn-ghost h-6 w-6 p-0" onClick={() => setOpen(false)} data-testid="query-bar-close" title="Collapse" aria-label="Collapse query">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <pre className="query-bar-text" data-testid="query-bar-text">{query}</pre>
    </section>
  );
}
