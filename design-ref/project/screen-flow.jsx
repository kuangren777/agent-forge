/* screen-flow.jsx — 数据流可视化 Dataflow · 4 directions
   Theme: directed graph, nodes=vars/ops, edges=deps, color=capability. */

const LEGEND = [["trusted", "🟢 可信 user"], ["data", "🔵 内部数据"], ["parsed", "🟡 解析结果"], ["write", "🟠 写操作"]];
const FLOW = [
  ["trusted", "user_input(\"张伟\")", "source: user · readers: *"],
  ["data", "customer_query → customer", "database.customers · emp/admin"],
  ["data", "order_query → orders", "database.orders · emp/admin"],
  ["parsed", "Q-LLM → refund_orders", "继承 orders 能力"],
  ["write", "expedite_refund → result", "需确认 · readers 取交集"],
];

function Legend({ row }) {
  return (
    <div className={`row ${row ? "" : "col"} gap${row ? "12" : "6"} wrap`}>
      {LEGEND.map(([k, l], i) => <Sw key={i} c={`var(--cap-${k})`}>{l}</Sw>)}
    </div>
  );
}
function GraphChain({ horiz }) {
  return horiz ? (
    <div className="row vcenter" style={{ gap: 0 }}>
      {FLOW.map(([k, t], i) => <React.Fragment key={i}>
        <div className={`node ${k}`} style={{ flexDirection: "column", alignItems: "flex-start", minWidth: 120 }}><span>{t.split(" ")[0]}</span></div>
        {i < FLOW.length - 1 && <div className="edgeh" style={{ width: 22 }} />}
      </React.Fragment>)}
    </div>
  ) : (
    <div className="col center gap8">
      {FLOW.map(([k, t, m], i) => <React.Fragment key={i}>
        <div className={`node ${k}`} style={{ width: 300, justifyContent: "space-between" }}><span className="mono" style={{ fontSize: 11 }}>{t}</span><Dot k={k} /></div>
        {i < FLOW.length - 1 && <div className="edge" style={{ height: 16 }} />}
      </React.Fragment>)}
    </div>
  );
}

/* ---------- A · Workbench ---------- */
function FlowA() {
  const aside = {
    tree: ["数据流 traces", "abc123 张伟退款", "de45f6 报表导出", "78ghij 账号封禁"], treeOn: 1,
    treeIc: ["flow", "chevron", "chevron", "chevron"], w: 268,
    panel: (
      <div className="col fill">
        <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">节点详情 · node</span></div>
        <div className="col gap10 pad14 fill">
          <div className="node parsed" style={{ alignSelf: "flex-start" }}>refund_orders</div>
          <div className="col gap6">
            <div className="row between sm"><span className="muted">source</span><span className="mono muted2">database.orders</span></div>
            <div className="row between sm"><span className="muted">readers</span><span className="mono muted2">emp, admin</span></div>
            <div className="row between sm"><span className="muted">via</span><span className="mono muted2">Q-LLM (无放宽)</span></div>
          </div>
          <div className="divln" /><Legend /><div className="divln" />
          <Note ink>Q-LLM 输出继承输入能力 → 防数据洗白</Note>
        </div>
      </div>
    ),
  };
  return (
    <ShellA active="flow" aside={aside}>
      <div className="row between vcenter" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="col"><span className="h2">数据流图</span><span className="sm muted mono">trace: abc123 · 5 节点 · 4 边</span></div>
        <div className="row gap6"><Btn sz="sm" ic="eye">展开全部</Btn><Btn sz="sm" ic="doc">导出审计</Btn></div>
      </div>
      <div className="fill center" style={{ background: "var(--fill-2)" }}><GraphChain /></div>
    </ShellA>
  );
}

/* ---------- B · Conversational ---------- */
function FlowB() {
  return (
    <ShellB active="flow" wide={560}>
      <div className="col gap14 fill" style={{ justifyContent: "center" }}>
        <div className="col gap3"><span className="eyebrow">本次操作来源</span><span className="h2">数据从哪来、流向哪</span><span className="sm muted">「张伟退款加急」的完整数据流</span></div>
        <div className="card pad16"><GraphChain /></div>
        <div className="card soft pad12 row between vcenter"><Legend row /></div>
      </div>
    </ShellB>
  );
}

/* ---------- C · Console ---------- */
function FlowC() {
  const sub = <><span className="sm b">数据流</span><Chip on>trace abc123</Chip><span className="sm muted">张伟退款加急</span><div style={{ flex: 1 }} /><Legend row /></>;
  return (
    <ShellC active="flow" sub={sub}>
      <div className="row fill" style={{ overflow: "hidden" }}>
        <div className="fill center" style={{ borderRight: "1px solid var(--line)" }}><GraphChain /></div>
        <div className="col gap10" style={{ width: 320, flex: "0 0 auto", padding: 16, background: "var(--paper)" }}>
          <span className="eyebrow">能力传播 · 逐步</span>
          {FLOW.map(([k, t, m], i) =>
            <div key={i} className="card pad10 col gap4"><div className="row vcenter gap6"><Dot k={k} /><span className="sm b mono" style={{ fontSize: 11 }}>{t}</span></div><span className="xs muted">{m}</span></div>)}
        </div>
      </div>
    </ShellC>
  );
}

/* ---------- D · Security / Graph (canvas hero + inspector) ---------- */
function FlowD() {
  const aside = (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">trace abc123</span></div>
      <div className="col gap10 pad14 fill">
        <Legend />
        <div className="divln" />
        <span className="eyebrow">完整性 integrity</span>
        <div className="row vcenter gap6 sm" style={{ color: "var(--cap-trusted)" }}><Icon n="lock" s={14} c="var(--cap-trusted)" />hash 链已验证</div>
        <div className="row between sm"><span className="muted">输出 readers</span><span className="mono muted2">admin ∩ emp</span></div>
        <div className="divln" />
        <Btn sz="sm" ic="doc">写入审计链</Btn>
      </div>
    </div>
  );
  return (
    <ShellD active="flow" aside={aside}>
      <div className="row between vcenter" style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
        <span className="h3">数据流图 · dataflow graph</span><div className="row gap6"><Btn sz="sm" ic="search">缩放</Btn><Btn sz="sm" ic="filter">按能力筛选</Btn></div>
      </div>
      <div className="fill center" style={{ position: "relative", background: "radial-gradient(circle at 50% 40%, #fff, #f6f4f0)" }}>
        <div className="row vcenter gap8">
          <div className="node trusted" style={{ flexDirection: "column", padding: "12px 16px" }}><Icon n="user" s={16} c="var(--cap-trusted)" /><span className="xs">user 张伟</span></div>
          <div className="edgeh" style={{ width: 26 }} />
          <div className="col gap8">
            <div className="node data">customer</div>
            <div className="node data">orders</div>
          </div>
          <div className="edgeh" style={{ width: 26 }} />
          <div className="node parsed" style={{ flexDirection: "column", padding: "12px 16px" }}><Icon n="bolt" s={16} c="var(--cap-parsed)" /><span className="xs">Q-LLM refund_orders</span></div>
          <div className="edgeh" style={{ width: 26 }} />
          <div className="node write" style={{ flexDirection: "column", padding: "12px 16px" }}><Icon n="lock" s={16} c="var(--cap-write)" /><span className="xs">expedite_refund</span></div>
        </div>
        <span className="anno" style={{ right: 24, bottom: 18, color: "var(--ink-3)", textAlign: "right" }}>边 = 数据依赖<br />readers 取交集 ↓</span>
      </div>
    </ShellD>
  );
}

Object.assign(window, { FlowA, FlowB, FlowC, FlowD });
