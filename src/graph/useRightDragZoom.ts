import { useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';

interface DragState {
  startCanvasX: number;
  startCanvasY: number;
  startZoom: number;
  startVx: number;
  startVy: number;
  pointerId: number;
  moved: boolean;
  previousCursor: string;
}

export function useRightDragZoom(hostRef: React.RefObject<HTMLElement | null>) {
  const flow = useReactFlow();
  const drag = useRef<DragState | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const down = (event: PointerEvent) => {
      if (event.button !== 2) return;
      const rect = host.getBoundingClientRect();
      const viewport = flow.getViewport();
      drag.current = {
        startCanvasX: event.clientX - rect.left,
        startCanvasY: event.clientY - rect.top,
        startZoom: viewport.zoom,
        startVx: viewport.x,
        startVy: viewport.y,
        pointerId: event.pointerId,
        moved: false,
        previousCursor: host.style.cursor,
      };
      try { host.setPointerCapture(event.pointerId); } catch { /* optional */ }
    };
    const move = (event: PointerEvent) => {
      const state = drag.current;
      if (!state) return;
      const rect = host.getBoundingClientRect();
      const dy = event.clientY - rect.top - state.startCanvasY;
      const dx = event.clientX - rect.left - state.startCanvasX;
      if (!state.moved && Math.hypot(dx, dy) < 3) return;
      state.moved = true;
      host.style.cursor = 'ns-resize';
      const zoom = Math.min(2, Math.max(0.2, state.startZoom * Math.exp(-dy * 0.006)));
      const worldX = (state.startCanvasX - state.startVx) / state.startZoom;
      const worldY = (state.startCanvasY - state.startVy) / state.startZoom;
      flow.setViewport({ x: state.startCanvasX - worldX * zoom, y: state.startCanvasY - worldY * zoom, zoom });
      event.preventDefault();
    };
    const finish = (event: PointerEvent) => {
      const state = drag.current;
      if (!state || (event.type === 'pointerup' && event.button !== 2)) return;
      try { host.releasePointerCapture(state.pointerId); } catch { /* optional */ }
      host.style.cursor = state.previousCursor;
      drag.current = null;
    };
    const menu = (event: MouseEvent) => event.preventDefault();
    host.addEventListener('pointerdown', down);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerup', finish);
    host.addEventListener('pointercancel', finish);
    host.addEventListener('contextmenu', menu);
    return () => {
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', finish);
      host.removeEventListener('pointercancel', finish);
      host.removeEventListener('contextmenu', menu);
    };
  }, [flow, hostRef]);
}
