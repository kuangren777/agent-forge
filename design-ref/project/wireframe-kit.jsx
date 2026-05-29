/* wireframe-kit.jsx — primitives, icon set, and the 4 directional shells.
   Exports to window: Icon, Bar, Btn, Chip, Tag, Dot, Field, Note, Sw,
   NAV, ShellA, ShellB, ShellC, ShellD, RoleSw, Logo  */

/* ---------- icon set (18px stroke) ---------- */
function Icon({ n, s = 18, c = "currentColor", sw = 1.7 }) {
  const P = {
    compass: <><circle cx="12" cy="12" r="9"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5z"/></>,
    pulse: <path d="M3 12h4l2 6 4-13 2 7h6"/>,
    chat: <path d="M4 5h16v11H9l-4 3v-3H4z"/>,
    flow: <><circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M8 7l8 4M8 17l8-4"/></>,
    sliders: <><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/></>,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></>,
    puzzle: <path d="M10 4h4v2.5a1.5 1.5 0 003 0V4h0v0M14 4v0m-4 16H6v-4H3.5a1.5 1.5 0 010-3H6V9h4M14 20h4v-4h2.5a1.5 1.5 0 000-3H18V9h-4"/>,
    hex: <path d="M12 3l7 4v8l-7 4-7-4V7z"/>,
    user: <><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></>,
    search: <><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2"/></>,
    chevron: <path d="M9 6l6 6-6 6"/>,
    chevd: <path d="M6 9l6 6 6-6"/>,
    bell: <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0"/>,
    check: <path d="M5 12l4 4 10-10"/>,
    doc: <><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/></>,
    db: <><ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 12c0 1.5 3 2.8 7 2.8s7-1.3 7-2.8"/></>,
    code: <path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
    x: <path d="M6 6l12 12M18 6L6 18"/>,
    dots: <><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></>,
    play: <path d="M7 5l12 7-12 7z"/>,
    refresh: <path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2M18 4v5h-5M6 20v-5h5"/>,
    link: <path d="M9 15l6-6M8 9H6a3 3 0 000 6h2M16 15h2a3 3 0 000-6h-2"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.6"/></>,
    filter: <path d="M3 5h18l-7 8v6l-4-2v-4z"/>,
    bolt: <path d="M13 3L5 13h6l-1 8 8-11h-6z"/>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/></>,
    branch: <><circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 8v8M6 12h6a4 4 0 004-4"/></>,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
      {P[n] || P.dots}
    </svg>
  );
}

/* ---------- tiny primitives ---------- */
const Bar = ({ w = "100%", h = 8, c, style }) =>
  <span className="bar" style={{ width: w, height: h, background: c, ...style }} />;
const Btn = ({ children, k = "", ic, sz = "", ...p }) =>
  <button className={`btn ${sz} ${k}`} {...p}>{ic && <Icon n={ic} s={14} />}{children}</button>;
const Chip = ({ children, on, ic }) =>
  <span className={`chip ${on ? "on" : ""}`}>{ic && <Icon n={ic} s={12} />}{children}</span>;
const Tag = ({ children, k }) => <span className={`tag ${k}`}>{children}</span>;
const Dot = ({ k }) => <span className={`dot ${k}`} />;
const Field = ({ children, lg, ic = "search", style }) =>
  <div className={`field ${lg ? "lg" : ""}`} style={style}>{ic && <Icon n={ic} s={14} c="var(--ink-4)" />}<span>{children}</span></div>;
const Note = ({ children, ink, style }) => <span className={`note ${ink ? "ink" : ""}`} style={style}>{children}</span>;
const Sw = ({ c, children }) => <span className="swatch"><i style={{ background: c }} />{children}</span>;
const RoleSw = ({ active = "admin" }) => (
  <div className="roles">
    {[["customer", "客户"], ["employee", "员工"], ["admin", "管理员"]].map(([k, l]) =>
      <span key={k} className={active === k ? "on" : ""}>{l}</span>)}
  </div>
);
const Logo = ({ dark }) => (
  <div className="logo" style={dark ? { color: "#fff" } : null}>
    <span className="mk"><Icon n="hex" s={13} c="#fff" /></span>
    <span>CaMeL<span style={{ color: "var(--accent)" }}>·</span>Business</span>
  </div>
);

/* nav model shared by every shell */
const NAV = [
  { k: "explore", cn: "探索配置", en: "Explore", ic: "compass" },
  { k: "live", cn: "实时探索", en: "Live", ic: "pulse" },
  { k: "chat", cn: "对话", en: "Chat", ic: "chat" },
  { k: "flow", cn: "数据流", en: "Flow", ic: "flow" },
  { k: "ops", cn: "操作管理", en: "Ops", ic: "sliders" },
  { k: "audit", cn: "审计", en: "Audit", ic: "shield" },
  { k: "plugins", cn: "插件", en: "Plugins", ic: "puzzle" },
];

/* ============================================================
   SHELL A · 工作台 Workbench  (dark rail + subnav + main + aside)
   ============================================================ */
function ShellA({ active, children, aside, role = "admin" }) {
  return (
    <div className="wf">
      <div className="row fill">
        {/* activity rail */}
        <div className="rail">
          <span className="mk" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
            <Icon n="hex" s={16} c="#fff" />
          </span>
          {NAV.map(it => (
            <div key={it.k} className={`ricon ${active === it.k ? "on" : ""}`} title={it.cn}><Icon n={it.ic} s={18} /></div>
          ))}
          <div style={{ flex: 1 }} />
          <div className="ricon"><Icon n="gear" s={18} /></div>
        </div>
        {/* subnav */}
        <div className="subnav">
          <div className="row vcenter between" style={{ padding: "12px 12px 8px" }}>
            <span className="b" style={{ fontSize: 12.5 }}>{NAV.find(n => n.k === active)?.cn}</span>
            <Icon n="dots" s={15} c="var(--ink-4)" />
          </div>
          <div style={{ padding: "0 8px" }}><Field style={{ height: 26, fontSize: 11 }}>搜索…</Field></div>
          <div style={{ marginTop: 8 }}>
            {(aside?.tree || ["概览 Overview", "源代码 Code", "数据库 Database", "API", "管理后台 Admin", "文档 Docs"]).map((t, i) =>
              <div key={i} className={`navitem ${i === (aside?.treeOn ?? 0) ? "on" : ""}`}><Icon n={aside?.treeIc?.[i] || "chevron"} s={13} c="var(--ink-4)" />{t}</div>)}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: 10 }} className="col gap6">
            <span className="xs muted b" style={{ letterSpacing: ".1em" }}>身份 IDENTITY</span>
            <RoleSw active={role} />
          </div>
        </div>
        {/* main */}
        <div className="col fill" style={{ background: "var(--fill-2)" }}>{children}</div>
        {/* aside / inspector */}
        {aside?.panel && <div style={{ width: aside.w || 248, flex: "0 0 auto", borderLeft: "1px solid var(--line)", background: "var(--paper)" }} className="col">{aside.panel}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   SHELL B · 对话优先 Conversational (slim icon rail + centered)
   ============================================================ */
function ShellB({ active, children, role = "employee", wide }) {
  return (
    <div className="wf">
      <div className="topbar" style={{ height: 50 }}>
        <Icon n="dots" s={18} c="var(--ink-3)" />
        <div style={{ flex: 1 }} className="row center"><Logo /></div>
        <Chip ic="bolt">CaMeL 安全已启用</Chip>
        <RoleSw active={role} />
      </div>
      <div className="row fill">
        <div className="rail" style={{ width: 46, background: "var(--fill)", color: "var(--ink-3)", borderRight: "1px solid var(--line)" }}>
          {NAV.slice(0, 6).map(it => (
            <div key={it.k} className="ricon" style={active === it.k ? { background: "var(--accent-soft)", color: "#9c4a2e" } : { color: "var(--ink-4)" }}><Icon n={it.ic} s={17} /></div>
          ))}
        </div>
        <div className="fill col center" style={{ overflow: "hidden", padding: "20px 0" }}>
          <div className="col fill" style={{ width: "100%", maxWidth: wide || 660, minHeight: 0 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHELL C · 控制台 Console  (top logo + horizontal tabs + role)
   ============================================================ */
function ShellC({ active, children, role = "admin", sub }) {
  return (
    <div className="wf">
      <div className="topbar" style={{ height: 52, gap: 18 }}>
        <Logo />
        <div className="row gap4" style={{ marginLeft: 8 }}>
          {NAV.map(it => (
            <div key={it.k} className="row vcenter gap6" style={{
              padding: "7px 11px", borderRadius: 7, fontSize: 12.5,
              fontWeight: active === it.k ? 600 : 500,
              color: active === it.k ? "var(--ink)" : "var(--ink-3)",
              background: active === it.k ? "var(--fill)" : "transparent",
            }}><Icon n={it.ic} s={15} c={active === it.k ? "var(--accent)" : "var(--ink-4)"} />{it.cn}</div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <Icon n="bell" s={17} c="var(--ink-3)" />
        <RoleSw active={role} />
      </div>
      {sub && <div className="row vcenter gap16" style={{ height: 38, flex: "0 0 auto", borderBottom: "1px solid var(--line)", padding: "0 18px", background: "var(--fill-2)" }}>{sub}</div>}
      <div className="fill col" style={{ background: "var(--fill-2)", overflow: "hidden" }}>{children}</div>
    </div>
  );
}

/* ============================================================
   SHELL D · 安全视角 Security / Graph (dark bar + thin nav + split)
   ============================================================ */
function ShellD({ active, children, aside, role = "admin", trace = "trace · a1b2c3" }) {
  return (
    <div className="wf">
      <div className="topbar dark" style={{ height: 48 }}>
        <Logo dark />
        <div className="row vcenter gap8" style={{ marginLeft: 6, padding: "4px 10px", borderRadius: 7, background: "rgba(255,255,255,.07)", fontSize: 11.5, fontFamily: "var(--mono)", color: "#cfc8bd" }}>
          <Icon n="branch" s={13} c="#8d877d" />{trace}<Icon n="chevd" s={12} c="#8d877d" />
        </div>
        <div className="row vcenter gap6" style={{ fontSize: 11, color: "#7fae87" }}><Dot k="ok" />链完整 verified</div>
        <div style={{ flex: 1 }} />
        <RoleSw active={role} />
      </div>
      <div className="row fill">
        <div className="rail" style={{ width: 50 }}>
          {NAV.map(it => <div key={it.k} className={`ricon ${active === it.k ? "on" : ""}`}><Icon n={it.ic} s={18} /></div>)}
        </div>
        <div className="fill col" style={{ background: "#fbfaf7" }}>{children}</div>
        {aside && <div style={{ width: 270, flex: "0 0 auto", borderLeft: "1px solid var(--line)", background: "var(--paper)" }} className="col">{aside}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Bar, Btn, Chip, Tag, Dot, Field, Note, Sw, RoleSw, Logo, NAV, ShellA, ShellB, ShellC, ShellD });
