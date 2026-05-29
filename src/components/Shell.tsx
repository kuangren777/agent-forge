import { Icon, Field, Chip, Btn, RoleSwitch } from './kit';
import { useApp } from '../lib/appContext';
import { NAV, ROLE_NAV } from '../lib/data';
import { SCREENS } from '../screens/registry';
import type { ScreenKey } from '../lib/types';

export function Shell() {
  const { role, setRole, active, setActive } = useApp();
  const allowed = ROLE_NAV[role];
  const s = SCREENS[active];
  const { Main, Aside } = s;

  return (
    <div className="wf">
      <div className="row fill">
        {/* ── activity rail ── */}
        <div className="rail">
          {/* logo hex */}
          <span
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 6, flexShrink: 0,
            }}
          >
            <Icon n="hex" s={16} c="#fff" />
          </span>

          {NAV.map(item => {
            const ok = allowed.includes(item.k as ScreenKey);
            return (
              <div
                key={item.k}
                className={`ricon ${active === item.k ? 'on' : ''}`}
                title={item.cn + (ok ? '' : ' · 当前角色无权')}
                style={{
                  cursor: ok ? 'pointer' : 'not-allowed',
                  opacity: ok ? 1 : 0.3,
                }}
                onClick={() => ok && setActive(item.k as ScreenKey)}
              >
                <Icon n={item.ic} s={18} />
              </div>
            );
          })}

          <div style={{ flex: 1 }} />
          <div className="ricon" style={{ cursor: 'pointer' }}>
            <Icon n="gear" s={18} />
          </div>
        </div>

        {/* ── subnav ── */}
        <div className="subnav">
          <div
            className="row vcenter between"
            style={{ padding: '12px 12px 8px' }}
          >
            <span className="b" style={{ fontSize: 12.5 }}>
              {NAV.find(n => n.k === active)?.cn}
            </span>
            <Icon n="dots" s={15} c="var(--ink-4)" />
          </div>

          <div style={{ padding: '0 8px' }}>
            <Field style={{ height: 26, fontSize: 11 }}>搜索…</Field>
          </div>

          <div style={{ marginTop: 8 }}>
            {s.tree.map((t, i) => (
              <div
                key={i}
                className={`navitem ${i === s.treeOn ? 'on' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <Icon n={s.treeIc[i]} s={13} c="var(--ink-4)" />
                {t}
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ padding: 10 }} className="col gap6">
            <span className="xs muted b" style={{ letterSpacing: '.1em' }}>
              身份 IDENTITY · 切换看差异
            </span>
            <RoleSwitch value={role} onChange={setRole} />
          </div>
        </div>

        {/* ── main area ── */}
        <div
          className="col fill"
          style={{ background: 'var(--fill-2)', minWidth: 0 }}
        >
          {/* titlebar */}
          <div
            className="row between vcenter"
            style={{
              padding: '13px 18px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--paper)',
              flexShrink: 0,
            }}
          >
            <div className="col">
              <span className="h2">{s.title}</span>
              <span className="sm muted">{s.sub}</span>
            </div>
            <div className="row vcenter gap8">
              {s.prog != null && (
                <>
                  <span className="sm muted tnum">{s.prog}%</span>
                  <div className="prog" style={{ width: 150 }}>
                    <i style={{ width: `${s.prog}%` }} />
                  </div>
                </>
              )}
              {active === 'chat' && (
                <>
                  <Chip ic="bolt">CaMeL 已启用</Chip>
                  <Chip>{role}</Chip>
                </>
              )}
              {active === 'ops' && role !== 'admin' && (
                <Chip ic="eye">只读视角</Chip>
              )}
              {s.actions && (active !== 'ops' || role === 'admin') &&
                s.actions.map(([ic, l, k], i) => (
                  <Btn key={i} sz="sm" ic={ic} k={k}>{l}</Btn>
                ))
              }
            </div>
          </div>

          {/* screen main content */}
          <Main />
        </div>

        {/* ── right inspector aside ── */}
        <div
          style={{
            width: s.asideW,
            flex: '0 0 auto',
            borderLeft: '1px solid var(--line)',
            background: 'var(--paper)',
          }}
          className="col"
        >
          <Aside />
        </div>
      </div>
    </div>
  );
}
