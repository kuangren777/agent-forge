/* screen-explore.jsx — 探索配置 Explore config · 4 directions
   Theme: mount data sources + the 5 pluggable Explorers (extensibility). */

const SOURCES = [
  { ic: "code", cn: "源代码", t: "GitHub · company/backend", st: "已探索 · 142 files", k: "ok" },
  { ic: "db", cn: "数据库", t: "PostgreSQL · prod-db", st: "已映射 · 34 表", k: "ok" },
  { ic: "globe", cn: "API", t: "OpenAPI · /api/v1/docs", st: "已解析 · 47 路由", k: "ok" },
  { ic: "table", cn: "管理后台", t: "admin.company.com", st: "爬取中 · 45%", k: "wait" },
  { ic: "doc", cn: "文档", t: "Confluence · Engineering", st: "已索引 · 128 页", k: "ok" },
];
const EXPLORERS = ["CodeExplorer", "DatabaseExplorer", "APIExplorer", "AdminPanelExplorer", "DocExplorer"];

/* ---------- A · Workbench ---------- */
function ExploreA() {
  const aside = {
    tree: ["数据源 Sources", "CodeExplorer", "DatabaseExplorer", "APIExplorer", "AdminPanelExplorer", "DocExplorer"],
    treeIc: ["chevd", "code", "db", "globe", "table", "doc"], treeOn: 1,
    w: 280,
    panel: (
      <div className="col fill">
        <div className="row between vcenter" style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-2)" }}>
          <span className="h3">CodeExplorer</span><Tag k="trusted">active</Tag>
        </div>
        <div className="col gap10 pad14 fill">
          <div className="col gap6"><span className="eyebrow">连接 Connector</span>
            <div className="field">git@github.com:company/backend</div></div>
          <div className="col gap6"><span className="eyebrow">探索阶段 Phases</span>
            {["① 全局认知", "② 深度探索", "③ 操作生成", "④ 能力标注"].map((p, i) =>
              <div key={i} className="row vcenter gap8 sm muted2"><Dot k={i < 3 ? "ok" : "wait"} />{p}</div>)}
          </div>
          <div className="divln" />
          <span className="eyebrow">实现接口 implements</span>
          <div className="code">{`class Explorer(ABC):
  async def `}<span className="f">explore</span>{`(self,
    src) -> list[`}<span className="v">OperationDraft</span>{`]`}</div>
          <Note style={{ marginTop: 2 }}>↳ 换数据源 = 新写一个 Explorer 即可</Note>
        </div>
      </div>
    ),
  };
  return (
    <ShellA active="explore" aside={aside}>
      <div className="row between vcenter" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="col"><span className="h2">数据源管理</span><span className="sm muted">挂载企业系统 · 自主探索生成 Operation Registry</span></div>
        <div className="row gap8"><Btn ic="refresh">增量更新</Btn><Btn k="pri" ic="play">开始探索</Btn></div>
      </div>
      <div className="col gap10 pad16 fill">
        {SOURCES.map((s, i) =>
          <div key={i} className="card row vcenter gap12 pad12">
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n={s.ic} s={18} c="var(--ink-2)" /></span>
            <div className="col" style={{ width: 150 }}><span className="b sm">{s.cn}</span><span className="xs muted mono">{s.t}</span></div>
            <div className="fill">{s.k === "wait" && <div className="prog" style={{ maxWidth: 220 }}><i style={{ width: "45%" }} /></div>}</div>
            <div className="row vcenter gap6 sm muted2"><Dot k={s.k} />{s.st}</div>
            <Icon n="dots" s={16} c="var(--ink-4)" />
          </div>)}
        <div className="card pad12 row vcenter gap12" style={{ borderStyle: "dashed", background: "var(--fill-2)" }}>
          <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="puzzle" s={18} c="#9c4a2e" /></span>
          <div className="col fill"><span className="b sm">+ 接入新探索器 Explorer 插件</span><span className="xs muted">实现 Explorer 接口即可挂载任意数据源（gRPC、消息队列、SaaS…）</span></div>
          <Btn sz="sm" ic="plus">添加</Btn>
        </div>
      </div>
    </ShellA>
  );
}

/* ---------- B · Conversational ---------- */
function ExploreB() {
  return (
    <ShellB active="explore" wide={620}>
      <div className="col gap16 fill" style={{ justifyContent: "center" }}>
        <div className="col gap4"><span className="eyebrow">第一步 · setup</span><span className="h1">先让我了解你的系统</span>
          <span className="sm muted">挂载数据源后，我会自主探索、生成可执行操作。读操作自动激活，写操作待你审核。</span></div>
        <div className="card pad8 col gap6">
          {SOURCES.map((s, i) =>
            <div key={i} className="row vcenter gap10" style={{ padding: "8px 8px", borderRadius: 8, background: i === 3 ? "var(--fill-2)" : "transparent" }}>
              <Icon n={s.ic} s={17} c="var(--ink-2)" />
              <div className="col fill"><span className="sm b">{s.cn}</span><span className="xs muted mono">{s.t}</span></div>
              <div className="row vcenter gap5 xs muted"><Dot k={s.k} />{s.st}</div>
            </div>)}
          <div className="row vcenter gap10" style={{ padding: "8px", borderRadius: 8, borderTop: "1px dashed var(--line)", color: "var(--ink-3)" }}>
            <Icon n="plus" s={16} /><span className="sm">接入其它数据源 · Explorer 插件</span>
          </div>
        </div>
        <Btn k="pri" sz="lg" ic="play" style={{ alignSelf: "stretch", justifyContent: "center" }}>开始探索 5 个数据源</Btn>
        <Note ink style={{ textAlign: "center" }}>探索过程会实时显示在「实时探索」里 →</Note>
      </div>
    </ShellB>
  );
}

/* ---------- C · Console ---------- */
function ExploreC() {
  const sub = <><span className="sm b">工作空间</span><Chip on>company / prod</Chip><span className="sm muted">·</span><span className="sm muted">上次探索 2h 前</span><div style={{ flex: 1 }} /><Btn sz="sm" ic="refresh">增量更新</Btn><Btn sz="sm" k="pri" ic="play">开始探索</Btn></>;
  return (
    <ShellC active="explore" sub={sub}>
      <div className="pad16 col gap14 fill">
        <div className="row gap12">
          {[["5", "数据源"], ["23", "已生成操作"], ["15", "读操作 active"], ["8", "写操作待审核"]].map(([n, l], i) =>
            <div key={i} className="card pad12 col fill"><span className="h1 tnum">{n}</span><span className="xs muted">{l}</span></div>)}
        </div>
        <span className="eyebrow">数据源 Data sources</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {SOURCES.map((s, i) =>
            <div key={i} className="card pad12 col gap8">
              <div className="row between vcenter"><Icon n={s.ic} s={18} c="var(--ink-2)" /><div className="row vcenter gap5 xs muted"><Dot k={s.k} />{s.k === "ok" ? "就绪" : "进行中"}</div></div>
              <div className="col"><span className="b sm">{s.cn}</span><span className="xs muted mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.t}</span></div>
              <span className="xs muted">{s.st}</span>
            </div>)}
          <div className="card pad12 col gap8 center" style={{ borderStyle: "dashed", background: "var(--fill-2)", color: "var(--ink-3)" }}>
            <Icon n="plus" s={20} /><span className="sm b">添加数据源</span>
          </div>
        </div>
        <span className="eyebrow">可插拔探索器 Explorer plugins · 高扩展性</span>
        <div className="row gap8 wrap">
          {EXPLORERS.map((e, i) => <Chip key={i} ic="puzzle">{e}</Chip>)}
          <Chip ic="plus">注册新 Explorer</Chip>
        </div>
      </div>
    </ShellC>
  );
}

/* ---------- D · Security / Graph ---------- */
function ExploreD() {
  const aside = (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">探索产物 · Inventory</span></div>
      <div className="col gap10 pad14 fill">
        <div className="col gap6">
          <span className="eyebrow">能力标签来源 source tags</span>
          <Sw c="var(--cap-trusted)">user · 可信</Sw>
          <Sw c="var(--cap-data)">database.* · 内部</Sw>
          <Sw c="var(--cap-parsed)">qllm · 解析</Sw>
        </div>
        <div className="divln" />
        <span className="eyebrow">权限标注 permission</span>
        {[["customer", "5 ops"], ["employee", "12 ops"], ["admin", "23 ops"]].map(([r, n], i) =>
          <div key={i} className="row between sm muted2"><span>{r}</span><span className="mono">{n}</span></div>)}
        <div className="divln" />
        <Note ink>每个 Explorer 输出 → 统一 OperationDraft → 进 Registry</Note>
      </div>
    </div>
  );
  return (
    <ShellD active="explore" aside={aside} trace="explore · run #18">
      <div className="row between vcenter" style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
        <span className="h3">探索拓扑 · 数据源 → Registry</span><Btn sz="sm" k="pri" ic="play">开始探索</Btn>
      </div>
      <div className="fill center" style={{ position: "relative" }}>
        <div className="row vcenter gap20" style={{ padding: 24 }}>
          <div className="col gap10">
            {SOURCES.map((s, i) => <div key={i} className="node data" style={{ width: 168 }}><Icon n={s.ic} s={15} c="var(--cap-data)" /><span className="fill">{s.cn}</span><Dot k={s.k} /></div>)}
          </div>
          <div className="col gap4 center">
            {SOURCES.map((_, i) => <div key={i} className="edgeh" style={{ width: 46 }} />)}
          </div>
          <div className="col gap8 center">
            <div className="node" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)", flexDirection: "column", padding: "14px 18px" }}>
              <Icon n="sliders" s={20} c="#9c4a2e" /><span className="b">Operation Registry</span><span className="xs muted">23 ops</span>
            </div>
            <div className="row gap6"><Tag k="trusted">15 query · active</Tag><Tag k="m">8 mutation · 待审</Tag></div>
          </div>
        </div>
        <span className="anno" style={{ left: 30, bottom: 18 }}>5 个可插拔 Explorer →<br />同一接口产出 Draft</span>
      </div>
    </ShellD>
  );
}

Object.assign(window, { ExploreA, ExploreB, ExploreC, ExploreD });
