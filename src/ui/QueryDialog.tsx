import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, Copy, FileCode2, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  name: string;
}

export function QueryDialog({ open, onOpenChange, query, name }: Props) {
  const [copied, setCopied] = useState(false);

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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content w-[min(760px,94vw)]" data-testid="query-dialog">
          <div className="h-12 px-4 border-b border-border flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-sky-500" />
            <Dialog.Title className="font-semibold text-sm">Source query</Dialog.Title>
            <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={name}>{name}</span>
            <button className="btn-outline ml-auto h-7 px-2 text-[11px] gap-1" onClick={copy} data-testid="query-copy">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <Dialog.Close className="btn-ghost h-7 w-7 p-0" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <pre className="query-text" data-testid="query-text">{query}</pre>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
