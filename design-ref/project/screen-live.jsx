/* screen-live.jsx — 实时探索 Live exploration · 4 directions
   Theme: real-time phases, current file, extracted knowledge, ops counter. */

const PHASES = [["Phase 1", "全局认知", "done"], ["Phase 2", "深度探索", "now"], ["Phase 3", "操作生成", "todo"], ["Phase 4", "能力标注", "todo"]];
const EXTRACT = [["实体 Entity", "Order, OrderItem, Refund"], ["操作 Ops", "create · cancel · query"], ["规则 Rule", "取消需检查退款条件"], ["联动 Chain", "cancel → 恢复库存 + 退款"]];
const FILES = ["src/api/orders.py", "src/models/order.py", "src/services/refund.py", "src/services/order.py"];

function Phases({ compact }) {
  return (
    <div className="col gap6">
      {PHASES.map(([p, l, st], i) =>
        <div key={i} className="row vcenter gap8" style={{ fontSize: compact ? 11.5 : 12.5, color: st === "todo" ? "var(--ink-4)" : "var(--ink-2)" }}>
          <Dot k={st === "done" ? "ok" : st === "now" ? "wait" : "off"} />
          <span className="b">{p}</span><span>{l}</span>
          {st === "done" && <Icon n="check" s={13} c="var(--cap-trusted)" />}
          {st === "now" && <span className="xs" style={{ color: "var(--accent)" }}>⏳</span>}
        </div>)}
    </div>
  );
}

/* ---------- A · Workbench ---------- */
function LiveA() {
  const aside = {
    tree: ["探索进程", "Phase 1 ✓", "Phase 2 ⏳", "Phase 3", "Phase 4"], treeOn: 2,
    treeIc: ["pulse", "check", "refresh", "sliders", "shield"],
    w: 300,
    panel: (
      <div className="col fill">
        <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">🤖 本文件提取</span></div>
        <div className="col gap10 pad14 fill">
          {EXTRACT.map(([k, v], i) => <div key={i} className="col gap3"><span className="eyebrow">{k}</span><span className="sm muted2">{v}</span></div>)}
          <div className="divln" />
          <div className="row between"><span className="sm muted">生成操作</span><span className="b">23</span></div>
          <div className="row between"><span className="sm muted">待审核 (写)</span><Tag k="m">8</Tag></div>
        </div>
      </div>
    ),
  };
  return (
    <ShellA active="live" aside={aside}>
      <div className="row between vcenter" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="col"><span className="h2">Explorer · 实时探索</span><span className="sm muted">CodeExplorer 正在阅读 company/backend</span></div>
        <div className="row vcenter gap10"><span className="sm muted tnum">73%</span><div className="prog" style={{ width: 160 }}><i style={{ width: "73%" }} /></div></div>
      </div>
      <div className="col gap14 pad16 fill">
        <div className="row gap14">
          <div className="card pad14 col gap10" style={{ width: 230 }}><span className="eyebrow">探索阶段</span><Phases /></div>
          <div className="card pad14 col fill gap8">
            <div className="row between vcenter"><span className="eyebrow">正在读取 · reading</span><Tag k="data">phase 2</Tag></div>
            <div className="code fill">{FILES.map((f, i) =>
              <div key={i} style={{ opacity: i === 3 ? 1 : .5 }}>{i === 3 ? <span className="k">▸ </span> : "  "}{f}</div>)}</div>
          </div>
        </div>
        <div className="card pad14 col gap8">
          <span className="eyebrow">实时日志 · stream</span>
          <div className="code">{`[12:04:31] `}<span className="f">extract</span>{` order.py → entity Order, OrderItem
[12:04:33] `}<span className="f">rule</span>{`    取消订单需校验 refund_status
[12:04:34] `}<span className="f">chain</span>{`   order.cancel → inventory.restore + refund.create
[12:04:36] `}<span className="s">+ op</span>{`    order.cancel  `}<span className="c">// mutation · pending_review</span></div>
        </div>
      </div>
    </ShellA>
  );
}

/* ---------- B · Conversational ---------- */
function LiveB() {
  return (
    <ShellB active="live" wide={600}>
      <div className="col gap14 fill" style={{ justifyContent: "center" }}>
        <div className="row vcenter gap10"><span className="dot wait" style={{ width: 10, height: 10 }} /><span className="h2">正在探索你的系统…</span></div>
        <div className="prog" style={{ height: 9 }}><i style={{ width: "73%" }} /></div>
        <span className="sm muted">已读 104 / 142 文件 · 生成 23 个操作</span>
        <div className="card pad14 col gap10">
          <Phases />
          <div className="divln" />
          <div className="row vcenter gap8 sm"><Icon n="code" s={15} c="var(--ink-3)" /><span className="muted2 mono">src/services/order.py</span></div>
          <div className="col gap6">
            {EXTRACT.map(([k, v], i) =>
              <div key={i} className="row gap8 sm"><span className="muted" style={{ width: 70 }}>{k}</span><span className="muted2">{v}</span></div>)}
          </div>
        </div>
        <Note ink style={{ textAlign: "center" }}>读操作会自动可用 · 写操作我会列出来等你审核</Note>
      </div>
    </ShellB>
  );
}

/* ---------- C · Console ---------- */
function LiveC() {
  const sub = <><span className="dot wait" /><span className="sm b">探索进行中</span><span className="sm muted">CodeExplorer · 73%</span><div style={{ flex: 1 }} /><Btn sz="sm" ic="x">暂停</Btn></>;
  return (
    <ShellC active="live" sub={sub}>
      <div className="pad16 col gap14 fill">
        <div className="row gap12">
          {[["104/142", "已读文件"], ["23", "生成操作"], ["8", "待审写操作"], ["00:04:12", "已用时"]].map(([n, l], i) =>
            <div key={i} className="card pad12 col fill"><span className="h2 tnum">{n}</span><span className="xs muted">{l}</span></div>)}
        </div>
        <div className="row gap12 fill">
          <div className="card pad14 col gap10" style={{ width: 260 }}><span className="eyebrow">阶段进度</span><Phases />
            <div className="divln" />
            <span className="eyebrow">数据源</span>
            {["源代码 73%", "数据库 ✓", "API ✓"].map((t, i) => <div key={i} className="sm muted2 row vcenter gap6"><Dot k={i ? "ok" : "wait"} />{t}</div>)}
          </div>
          <div className="card pad14 col fill gap10">
            <span className="eyebrow">最新生成操作 · feed</span>
            <table className="tbl">
              <thead><tr><th>操作</th><th>类型</th><th>来源文件</th><th>状态</th></tr></thead>
              <tbody>
                {[["order.cancel", "m", "order.py"], ["order.query", "q", "order.py"], ["refund.expedite", "m", "refund.py"], ["inventory.restore", "m", "stock.py"], ["customer.query", "q", "customer.py"]].map(([o, t, f], i) =>
                  <tr key={i}><td className="mono b" style={{ color: "var(--ink)" }}>{o}</td><td><Tag k={t}>{t === "m" ? "mutation" : "query"}</Tag></td><td className="mono">{f}</td><td>{t === "m" ? <span className="xs" style={{ color: "var(--cap-write)" }}>待审核</span> : <span className="xs" style={{ color: "var(--cap-trusted)" }}>active</span>}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ShellC>
  );
}

/* ---------- D · Security / Graph ---------- */
function LiveD() {
  const aside = (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">提取知识 · 实时</span></div>
      <div className="col gap10 pad14 fill">
        {EXTRACT.map(([k, v], i) => <div key={i} className="col gap3"><span className="eyebrow">{k}</span><span className="sm muted2">{v}</span></div>)}
        <div className="divln" />
        <span className="eyebrow">权限推断 permission</span>
        <div className="row gap6 wrap"><Tag k="trusted">customer</Tag><Tag k="data">employee</Tag><Tag k="write">admin</Tag></div>
      </div>
    </div>
  );
  return (
    <ShellD active="live" aside={aside} trace="explore · live">
      <div className="row between vcenter" style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
        <span className="h3">知识图谱构建中 · knowledge graph</span><div className="row vcenter gap8"><span className="sm muted tnum">73%</span><div className="prog" style={{ width: 120 }}><i style={{ width: "73%" }} /></div></div>
      </div>
      <div className="fill center" style={{ position: "relative" }}>
        <div className="col center gap10" style={{ padding: 24 }}>
          <div className="node data"><Icon n="code" s={15} c="var(--cap-data)" />src/services/order.py</div>
          <div className="edge" style={{ height: 18 }} />
          <div className="row gap10">
            {["Order", "OrderItem", "Refund"].map((e, i) => <div key={i} className="node">{e}</div>)}
          </div>
          <div className="edge" style={{ height: 18 }} />
          <div className="row gap8">
            <div className="node trusted">order.query</div>
            <div className="node write">order.cancel</div>
            <div className="node write">refund.expedite</div>
          </div>
          <span className="anno" style={{ position: "static", marginTop: 8, color: "var(--ink-3)" }}>实体 → 操作 → 能力标注，逐节点点亮</span>
        </div>
      </div>
    </ShellD>
  );
}

Object.assign(window, { LiveA, LiveB, LiveC, LiveD });
