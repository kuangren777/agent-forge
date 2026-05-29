import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Role, ScreenKey } from './types';
import { ROLE_NAV } from './data';

interface AppCtxShape {
  role: Role;
  setRole: (r: Role) => void;
  active: ScreenKey;
  setActive: (s: ScreenKey) => void;
  opsSel: string;
  setOpsSel: (s: string) => void;
  plugSel: string;
  setPlugSel: (s: string) => void;
}

const AppCtx = createContext<AppCtxShape | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('admin');
  const [active, setActiveState] = useState<ScreenKey>('explore');
  const [opsSel, setOpsSel] = useState<string>('order.cancel');
  const [plugSel, setPlugSel] = useState<string>('explorer');

  const setRole = (r: Role) => setRoleState(r);
  const setActive = (s: ScreenKey) => setActiveState(s);

  useEffect(() => {
    const allowed = ROLE_NAV[role];
    if (!allowed.includes(active)) {
      setActiveState(allowed.includes('chat') ? 'chat' : allowed[0]);
    }
  }, [role, active]);

  return (
    <AppCtx.Provider value={{ role, setRole, active, setActive, opsSel, setOpsSel, plugSel, setPlugSel }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp(): AppCtxShape {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
