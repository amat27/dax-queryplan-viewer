import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ClipboardPaste, X } from 'lucide-react';
import { useAppStore } from '../state/store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasteDialog({ open, onOpenChange }: Props) {
  const rawInput = useAppStore((state) => state.document.rawInput);
  const loadInput = useAppStore((state) => state.loadInput);
  const [value, setValue] = useState('');

  useEffect(() => { if (open) setValue(rawInput); }, [open, rawInput]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content w-[min(900px,94vw)]" data-testid="paste-dialog">
          <div className="h-12 px-4 border-b border-border flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
            <Dialog.Title className="font-semibold text-sm">Paste query plan</Dialog.Title>
            <span className="text-xs text-muted-foreground">JSON string array or raw event text</span>
            <Dialog.Close className="btn-ghost ml-auto h-7 w-7 p-0" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <textarea
            data-testid="paste-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            spellCheck={false}
            className="w-full h-[min(62vh,620px)] resize-none bg-background/60 p-4 font-mono text-[12px] leading-relaxed outline-none"
          />
          <div className="h-14 px-4 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Unknown fields are preserved; malformed lines appear in Diagnostics.</span>
            <button
              className="btn-primary"
              data-testid="parse-paste"
              onClick={() => { loadInput(value); onOpenChange(false); }}
              disabled={!value.trim()}
            >
              Parse plan
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
