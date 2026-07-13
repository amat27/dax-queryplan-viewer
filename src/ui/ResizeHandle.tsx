import { useRef } from 'react';
import { cn } from '../lib/cn';

interface Props {
  /** Called on drag with the current pointer position (viewport coords). */
  onDrag: (clientX: number, clientY: number) => void;
  testid?: string;
  className?: string;
}

/** A thin vertical bar the user drags horizontally to resize an adjacent region. */
export function ResizeHandle({ onDrag, testid, className }: Props) {
  const active = useRef(false);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-testid={testid}
      className={cn('resize-handle', className)}
      onPointerDown={(event) => {
        active.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }}
      onPointerMove={(event) => {
        if (active.current) onDrag(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        active.current = false;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }}
    >
      <span className="resize-handle-grip" />
    </div>
  );
}
