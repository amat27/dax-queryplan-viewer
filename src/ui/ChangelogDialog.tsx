import * as Dialog from '@radix-ui/react-dialog';
import { GitCommitHorizontal, Sparkles, X } from 'lucide-react';
import { BUILD_INFO, CHANGELOG } from '../data/changelog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content w-[min(560px,94vw)]" data-testid="changelog-dialog">
          <div className="h-12 px-4 border-b border-border flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-500" />
            <Dialog.Title className="font-semibold text-sm">What's new</Dialog.Title>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]" data-testid="changelog-version">v{BUILD_INFO.version}</span>
            <Dialog.Close className="btn-ghost ml-auto h-7 w-7 p-0" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="max-h-[62vh] overflow-y-auto px-4 py-3 space-y-4">
            {CHANGELOG.map((entry) => (
              <section key={entry.version}>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-mono text-[13px] font-semibold">v{entry.version}</h3>
                  <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {entry.changes.map((change) => (
                    <li key={change} className="flex gap-2 text-[12px] leading-relaxed text-foreground/90">
                      <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="border-t border-border px-4 py-2.5 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
            <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span data-testid="build-commit">commit {BUILD_INFO.commit}</span>
            <span className="opacity-50">·</span>
            <span>built {formatBuildTime(BUILD_INFO.builtAt)}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatBuildTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}
