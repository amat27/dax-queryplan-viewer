import { useRef, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  ArrowDown,
  ArrowRight,
  Columns2,
  Download,
  FileJson,
  FolderOpen,
  GitCompareArrows,
  Link2,
  Moon,
  PanelLeft,
  RefreshCw,
  Search,
  Sun,
  Monitor,
} from 'lucide-react';
import { exportVisiblePlanSvg } from '../lib/export';
import { cn } from '../lib/cn';
import { BUILD_INFO } from '../data/changelog';
import { ChangelogDialog } from './ChangelogDialog';
import { useAppStore } from '../state/store';
import type { ViewMode } from '../types';

interface Props {
  onPaste: () => void;
  onSearch: () => void;
}

export function TopBar({ onPaste, onSearch }: Props) {
  const documentName = useAppStore((state) => state.document.name);
  const loadInput = useAppStore((state) => state.loadInput);
  const loadDemo = useAppStore((state) => state.loadDemo);
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const direction = useAppStore((state) => state.layoutDirection);
  const setDirection = useAppStore((state) => state.setLayoutDirection);
  const showReferences = useAppStore((state) => state.showReferences);
  const setShowReferences = useAppStore((state) => state.setShowReferences);
  const showMappings = useAppStore((state) => state.showMappings);
  const setShowMappings = useAppStore((state) => state.setShowMappings);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const input = useRef<HTMLInputElement | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);

  const openFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadInput(await file.text(), file.name);
    event.target.value = '';
  };

  return (
    <Tooltip.Provider delayDuration={180}>
      <header className="top-bar" data-testid="top-bar">
        <div className="brand shrink-0">
          <div className="brand-mark" aria-label="DAX Query Plan Viewer">
            <svg viewBox="0 0 64 64" className="h-[18px] w-[18px]" aria-hidden="true">
              <path d="M32 19V30M15 30H49M15 30V41M49 30V41" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="23" y="8" width="18" height="11" rx="3" fill="#fff" />
              <rect x="6" y="41" width="18" height="11" rx="3" fill="#fff" />
              <rect x="40" y="41" width="18" height="11" rx="3" fill="#fff" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">DAX Query Plan</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Logical / Physical</div>
          </div>
          <button
            className="version-badge"
            data-testid="version-badge"
            onClick={() => setChangelogOpen(true)}
            title="What's new and the deployed build"
          >
            v{BUILD_INFO.version}
          </button>
        </div>

        <button className="btn-primary shrink-0" onClick={() => input.current?.click()} data-testid="open-file">
          <FolderOpen className="h-3.5 w-3.5" /> Open file
        </button>
        <input ref={input} type="file" accept=".json,.txt,application/json,text/plain" className="hidden" onChange={openFile} />
        <button className="btn-outline shrink-0" onClick={onPaste} data-testid="open-paste"><FileJson className="h-3.5 w-3.5" /> Paste</button>
        <span className="document-name" title={documentName}>{documentName}</span>

        <div className="grow min-w-3" />
        <div className="segmented" aria-label="View mode">
          <ViewButton mode="logical" active={viewMode === 'logical'} onClick={setViewMode} icon={<PanelLeft className="h-3.5 w-3.5" />} />
          <ViewButton mode="split" active={viewMode === 'split'} onClick={setViewMode} icon={<Columns2 className="h-3.5 w-3.5" />} />
          <ViewButton mode="physical" active={viewMode === 'physical'} onClick={setViewMode} icon={<GitCompareArrows className="h-3.5 w-3.5" />} />
        </div>

        <ToolButton label="Search operators and columns" onClick={onSearch}>
          <Search className="h-3.5 w-3.5" /><span className="toolbar-label">Search</span><span className="kbd">/</span>
        </ToolButton>
        <ToolButton label="Show logical-to-physical mapping candidates" active={showMappings} onClick={() => setShowMappings(!showMappings)}>
          <GitCompareArrows className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Show query-variable reference edges" active={showReferences} onClick={() => setShowReferences(!showReferences)}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label={`Layout ${direction}`} onClick={() => setDirection(direction === 'DOWN' ? 'RIGHT' : 'DOWN')}>
          {direction === 'DOWN' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
        </ToolButton>
        <ToolButton label="Export the first visible canvas as SVG" onClick={exportVisiblePlanSvg}><Download className="h-3.5 w-3.5" /></ToolButton>
        <ToolButton label="Reload the built-in GroupSemiJoin demo" onClick={loadDemo}><RefreshCw className="h-3.5 w-3.5" /></ToolButton>
        <ToolButton
          label={`Theme: ${theme}`}
          onClick={() => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')}
        >
          {theme === 'light' ? <Sun className="h-3.5 w-3.5" /> : theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
        </ToolButton>
      </header>
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </Tooltip.Provider>
  );
}

function ViewButton({ mode, active, onClick, icon }: { mode: ViewMode; active: boolean; onClick: (mode: ViewMode) => void; icon: React.ReactNode }) {
  return <button className={cn('segmented-button', active && 'active')} onClick={() => onClick(mode)} data-testid={`view-${mode}`}>{icon}<span>{mode[0].toUpperCase() + mode.slice(1)}</span></button>;
}

function ToolButton({ label, active, onClick, children }: React.PropsWithChildren<{ label: string; active?: boolean; onClick: () => void }>) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild><button className={cn('btn-ghost shrink-0', active && 'bg-accent')} onClick={onClick}>{children}</button></Tooltip.Trigger>
      <Tooltip.Portal><Tooltip.Content side="bottom" sideOffset={6} className="tooltip-content">{label}</Tooltip.Content></Tooltip.Portal>
    </Tooltip.Root>
  );
}
