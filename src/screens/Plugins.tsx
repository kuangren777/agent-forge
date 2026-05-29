import { Icon } from '../components/kit/Icon';
import { Dot, Note, Tag } from '../components/kit/primitives';
import { PLUGINS } from '../lib/data';
import { useApp } from '../lib/appContext';

export function PluginsMain() {
  const { plugSel, setPlugSel } = useApp();

  return (
    <div className="pad16 col gap12 fill">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {PLUGINS.map((p) => {
          const selected = p.key === plugSel;
          return (
            <div
              key={p.key}
              className="card pad12 col gap8"
              style={{
                cursor: 'pointer',
                borderColor: selected ? 'var(--accent)' : 'var(--line)',
                boxShadow: selected ? '0 0 0 1px var(--accent)' : 'none',
              }}
              onClick={() => setPlugSel(p.key)}
            >
              {/* header row */}
              <div className="row vcenter gap8">
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: 'var(--fill)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon n={p.ic} s={15} c="var(--ink-2)" />
                </span>
                <div className="col fill">
                  <span className="b sm mono">{p.iface}</span>
                  <span className="xs muted">{p.sub}</span>
                </div>
                <span className="xs muted tnum">
                  {p.impls.filter((i) => i[1] === 'ok').length}/{p.impls.length}
                </span>
              </div>

              {/* implementations row */}
              <div className="row gap6 wrap">
                {p.impls.map(([name, dotKind], idx) => (
                  <span key={idx} className="swatch">
                    <Dot k={dotKind as any} />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* dashed "接入新插件" entry */}
        <div
          className="card pad12 col gap8 center"
          style={{
            borderStyle: 'dashed',
            background: 'var(--fill-2)',
            color: 'var(--ink-3)',
          }}
        >
          <Icon n="puzzle" s={22} />
          <span className="sm b">+ 注册新接口实现</span>
          <span className="xs muted" style={{ textAlign: 'center' }}>
            实现接口 → 注册 → 内核零改动
          </span>
        </div>
      </div>
    </div>
  );
}

export function PluginsAside() {
  const { plugSel } = useApp();
  const p = PLUGINS.find((x) => x.key === plugSel) ?? PLUGINS[0];

  return (
    <div className="col fill">
      {/* header */}
      <div
        className="pad14 row between vcenter"
        style={{ borderBottom: '1px solid var(--line-2)' }}
      >
        <span className="h3 mono">{p.iface}</span>
        <Tag k="trusted">稳定接口</Tag>
      </div>

      {/* body */}
      <div className="col gap10 pad14 fill">
        <span className="eyebrow">接口定义 interface</span>
        <div className="code">{p.code}</div>

        <div className="divln" />

        <span className="eyebrow">已注册实现</span>
        {p.impls.map(([name, dotKind], idx) => (
          <div key={idx} className="row vcenter gap8 sm muted2">
            <Dot k={dotKind as any} />
            {name}
          </div>
        ))}

        <div className="row vcenter gap8 sm muted">
          <Icon n="plus" s={13} />
          接入新实现
        </div>

        <div className="divln" />

        <Note>5 个接口稳定不变 · 客户的库/权限/模型/日志都靠插件接入</Note>
      </div>
    </div>
  );
}
