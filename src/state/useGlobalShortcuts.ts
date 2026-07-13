import { useEffect } from 'react';
import { useAppStore } from './store';

export function useGlobalShortcuts(onSearch: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (editable) return;
      if (event.key === '/') {
        event.preventDefault();
        onSearch();
      } else if (event.key === 'Escape') {
        const state = useAppStore.getState();
        if (state.selectedNodeId) state.setSelectedNode(null);
        else if (state.focusStack.length) state.popFocus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSearch]);
}
