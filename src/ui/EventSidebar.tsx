import { AlertCircle, Box, Braces, FileJson, GitFork, PanelLeftClose, PanelLeftOpen, TriangleAlert } from 'lucide-react';
import { eventLabel } from '../parser/queryPlan';
import { useAppStore } from '../state/store';
import { cn } from '../lib/cn';

export function EventSidebar() {
  const document = useAppStore((state) => state.document);
  const activeLogicalEventId = useAppStore((state) => state.activeLogicalEventId);
  const activePhysicalEventId = useAppStore((state) => state.activePhysicalEventId);
  const setActiveEvent = useAppStore((state) => state.setActiveEvent);
  const selectAndCenter = useAppStore((state) => state.selectAndCenter);
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const setCollapsed = useAppStore((state) => state.setSidebarCollapsed);
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);
  const diagnosticCount = document.diagnostics.length + document.events.reduce((sum, event) => sum + event.diagnostics.length, 0);

  if (collapsed) {
    return (
      <aside className="event-sidebar collapsed" data-testid="event-sidebar">
        <button
          className="sidebar-expand"
          data-testid="sidebar-expand"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <span className="sidebar-rail-label">Events</span>
      </aside>
    );
  }

  return (
    <aside className="event-sidebar" data-testid="event-sidebar" style={{ '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties}>
      <div className="sidebar-document">
        <FileJson className="h-4 w-4 text-sky-500 shrink-0" />
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-semibold truncate" title={document.name}>{document.name}</div>
          <div className="text-[9px] text-muted-foreground">{document.events.length} event{document.events.length === 1 ? '' : 's'} · {document.events.reduce((sum, event) => sum + event.nodes.length, 0)} operators</div>
        </div>
        <button
          className="btn-ghost ml-auto h-6 w-6 p-0 shrink-0"
          data-testid="sidebar-collapse"
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="sidebar-scroll">
        <SectionTitle>Events</SectionTitle>
        <div className="event-list space-y-1 px-2">
          {document.events.length === 0 && <div className="empty-small">No plan events in this document.</div>}
          {document.events.map((event) => {
            const active = event.id === activeLogicalEventId || event.id === activePhysicalEventId;
            return (
              <div key={event.id} className={cn('event-card', active && 'active')}>
                <button className="w-full text-left" onClick={() => setActiveEvent(event)}>
                  <div className="flex items-center gap-1.5">
                    {event.kind === 'vp-physical' ? <Box className="h-3.5 w-3.5 text-teal-500" /> : <Braces className="h-3.5 w-3.5 text-sky-500" />}
                    <span className="text-[11px] font-medium truncate">{eventLabel(event.kind)}</span>
                    <span className="ml-auto text-[9px] font-mono text-muted-foreground">#{event.index + 1}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>{event.nodes.length} ops</span><span>{event.rootIds.length} roots</span>
                    {event.truncated && <span className="text-amber-600">truncated</span>}
                  </div>
                </button>
                {event.rootIds.length > 1 && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/60 space-y-0.5">
                    {event.rootIds.map((rootId) => {
                      const root = event.nodes.find((node) => node.id === rootId)!;
                      return <button key={rootId} className="root-link" onClick={() => selectAndCenter(event.id, rootId)}><GitFork className="h-2.5 w-2.5" />{root.queryObject ?? root.operator}</button>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <SectionTitle>Diagnostics {diagnosticCount ? `(${diagnosticCount})` : ''}</SectionTitle>
        <div className="diagnostic-list px-2 space-y-1">
          {diagnosticCount === 0 ? (
            <div className="diagnostic ok"><AlertCircle className="h-3 w-3" /> Parsed without diagnostics</div>
          ) : (
            [...document.diagnostics, ...document.events.flatMap((event) => event.diagnostics)].map((diagnostic, index) => (
              <div key={`${diagnostic.code}-${index}`} className={cn('diagnostic', diagnostic.severity)} title={diagnostic.message}>
                <TriangleAlert className="h-3 w-3 shrink-0" /><span>{diagnostic.message}</span>
              </div>
            ))
          )}
        </div>

        <SectionTitle>Reading rules</SectionTitle>
        <div className="rules-list px-2 space-y-1.5 text-[10px] leading-relaxed text-muted-foreground">
          <p className="rule-card"><strong>Column IDs are local.</strong> ID 0 is not a global column identity.</p>
          <p className="rule-card"><strong>Every line is an instance.</strong> Repeated Scan_Vertipaq nodes are never merged.</p>
          <p className="rule-card"><strong>Mappings are heuristic.</strong> Physical LogOp names do not contain logical node IDs.</p>
        </div>
      </div>
    </aside>
  );
}

function SectionTitle({ children }: React.PropsWithChildren) {
  return <div className="section-title">{children}</div>;
}
