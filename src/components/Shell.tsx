import { useEffect, type KeyboardEvent } from 'react';
import { Icon, Chip } from './kit';
import { useApp } from '../lib/appContext';
import { NAV } from '../lib/config/navigation';
import { SCREENS } from '../screens/registry';
import { useMe, login, logout } from '../features/auth';
import type { Role, ScreenKey } from '../api/types';

function clickable(onClick: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
    },
  };
}

const ROLES: Array<[Role, string]> = [['customer', '客户'], ['employee', '员工'], ['admin', '管理员']];

export function Shell() {
  const { active, setActive, treeSel, setTreeSel, query, setQuery, toasts, toast } = useApp();
  const me = useMe();
  const role = me.data?.acting_role ?? 'admin';
  const allowed = me.data?.allowed_screens ?? [];
  const s = SCREENS[active];
  const { Main, Aside } = s;

  // if the current role can't see the active screen, jump to an allowed one
  useEffect(() => {
    if (allowed.length && !allowed.includes(active)) {
      setActive(allowed.includes('chat') ? 'chat' : allowed[0]);
    }
  }, [allowed, active, setActive]);

  const rows = s.tree
    .map((label, i) => ({ label, i }))
    .filter((r) => !query || r.label.toLowerCase().includes(query.toLowerCase()));

  async function switchRole(r: Role) {
    await login(r);
    toast(`已切换身份：${ROLES.find(([k]) => k === r)?.[1]}`, 'info');
  }

  return (
    <div className="wf">
      <div className="row fill">
        {/* activity rail */}
        <div className="rail">
          <span className="mk" style={{ marginBottom: 8, flexShrink: 0 }} aria-label="agent-forge">
            <Icon n="hex" s={15} c="#fff" />
          </span>
          {NAV.map((item) => {
            const ok = allowed.includes(item.k as ScreenKey);
            return (
              <div
                key={item.k}
                className={`ricon ${active === item.k ? 'on' : ''} ${ok ? '' : 'dis'}`}
                title={item.cn + (ok ? '' : ' · 当前角色无权')}
                aria-label={item.cn} aria-disabled={!ok}
                style={{ cursor: ok ? 'pointer' : 'not-allowed', opacity: ok ? 1 : 0.3 }}
                {...(ok ? clickable(() => setActive(item.k as ScreenKey)) : {})}
              >
                <Icon n={item.ic} s={18} />
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div className="ricon" aria-label="退出登录" {...clickable(() => { logout(); })}>
            <Icon n="gear" s={18} />
          </div>
        </div>

        {/* subnav */}
        <div className="subnav">
          <div className="row vcenter between" style={{ padding: '14px 12px 10px' }}>
            <div className="logo">
              <span>agent<span style={{ color: 'var(--accent)' }}>·</span>forge</span>
            </div>
            <Icon n="dots" s={15} c="var(--ink-4)" />
          </div>
          <div style={{ padding: '0 8px' }}>
            <label className="field" style={{ height: 28, fontSize: 11 }}>
              <Icon n="search" s={13} c="var(--ink-4)" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索…" aria-label="搜索" />
            </label>
          </div>
          <div className="col scroll fill" style={{ marginTop: 10 }}>
            <div className="eyebrow" style={{ padding: '0 16px 4px' }}>
              {NAV.find((n) => n.k === active)?.cn}
            </div>
            {rows.length === 0 && <div className="sm muted" style={{ padding: '6px 16px' }}>无匹配项</div>}
            {rows.map(({ label, i }) => (
              <div key={i} className={`navitem ${i === treeSel ? 'on' : ''}`} {...clickable(() => setTreeSel(i))}>
                <Icon n={s.treeIc[i]} s={13} c={i === treeSel ? 'var(--accent)' : 'var(--ink-4)'} />
                <span className="fill" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: '1px solid var(--line-2)' }} className="col gap6">
            <span className="eyebrow">身份 · 切换看权限差异</span>
            <div className="roles">
              {ROLES.map(([k, label]) => (
                <span key={k} className={role === k ? 'on' : ''} style={{ cursor: 'pointer' }}
                  onClick={() => switchRole(k)}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* main */}
        <div className="col fill" style={{ background: 'var(--canvas)', minWidth: 0 }}>
          <div className="row between vcenter"
            style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', background: 'var(--paper)', flexShrink: 0 }}>
            <div className="col">
              <span className="h2">{s.title}</span>
              <span className="sm muted">{s.sub}</span>
            </div>
            <div className="row vcenter gap8">
              {active === 'chat' && <Chip ic="shield">CaMeL 已启用</Chip>}
              <Chip>{ROLES.find(([k]) => k === role)?.[1] ?? role}</Chip>
            </div>
          </div>
          <Main />
        </div>

        {/* aside */}
        <div className="col aside-panel"
          style={{ width: s.asideW, flex: '0 0 auto', borderLeft: '1px solid var(--line)', background: 'var(--paper)' }}>
          <Aside />
        </div>
      </div>

      <div className="toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}><span className="tdot" />{t.text}</div>
        ))}
      </div>
    </div>
  );
}
