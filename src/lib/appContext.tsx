import {
  createContext, useCallback, useContext, useRef, useState, type ReactNode,
} from 'react';
import type { ScreenKey } from '../api/types';

export interface Toast { id: number; text: string; kind: 'ok' | 'info' | 'warn' }

interface AppCtxShape {
  /* UI shell state only — business truth lives on the server */
  active: ScreenKey;
  setActive: (s: ScreenKey) => void;
  treeSel: number;
  setTreeSel: (i: number) => void;
  query: string;
  setQuery: (q: string) => void;

  /* per-screen selections (ids / indices) */
  opsSel: string | null;
  setOpsSel: (id: string | null) => void;
  plugSel: string | null;
  setPlugSel: (id: string | null) => void;
  traceSel: string | null;
  setTraceSel: (id: string | null) => void;
  flowSel: number;
  setFlowSel: (i: number) => void;

  toasts: Toast[];
  toast: (text: string, kind?: Toast['kind']) => void;
}

const AppCtx = createContext<AppCtxShape | null>(null);

const DEFAULT_TREE: Record<ScreenKey, number> = {
  explore: 1, live: 2, chat: 1, flow: 1, ops: 0, audit: 1, plugins: 0,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<ScreenKey>('chat');
  const [treeSel, setTreeSel] = useState<number>(DEFAULT_TREE.chat);
  const [query, setQuery] = useState('');
  const [opsSel, setOpsSel] = useState<string | null>(null);
  const [plugSel, setPlugSel] = useState<string | null>(null);
  const [traceSel, setTraceSel] = useState<string | null>(null);
  const [flowSel, setFlowSel] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const setActive = useCallback((s: ScreenKey) => {
    setActiveState(s);
    setTreeSel(DEFAULT_TREE[s]);
    setQuery('');
  }, []);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <AppCtx.Provider value={{
      active, setActive, treeSel, setTreeSel, query, setQuery,
      opsSel, setOpsSel, plugSel, setPlugSel, traceSel, setTraceSel, flowSel, setFlowSel,
      toasts, toast,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp(): AppCtxShape {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
