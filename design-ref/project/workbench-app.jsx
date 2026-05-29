/* workbench-app.jsx — CaMeL-Business 统一「工作台」原型
   左活动栏切换 6+1 屏 · 角色差异化内容 · 双人确认 · 插件中心
   复用 wireframe-kit 原语 (window.*) */
const { useState, useEffect, useContext, createContext } = React;

const AppCtx = createContext(null);

/* 角色 → 可见导航 (能力标签隔离的 UI 体现) */
const ROLE_NAV = {
  customer: ["chat", "flow"],
  employee: ["chat", "flow", "live", "ops"],
  admin: ["explore", "live", "chat", "flow", "ops", "audit", "plugins"],
};

/* 可点击角色切换器 */
function RoleSwitch({ value, onChange }) {
  return (
    <div className="roles">
      {[["customer", "客户"], ["employee", "员工"], ["admin", "管理员"]].map(([k, l]) =>
        <span key={k} className={value === k ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => onChange(k)}>{l}</span>)}
    </div>
  );
}

/* ========== ① 探索配置 ========== */
function ExploreMain() {
  const SRC = [
    ["code", "源代码", "GitHub · company/backend", "已探索 · 142 files", "ok"],
    ["db", "数据库", "PostgreSQL · prod-db", "已映射 · 34 表", "ok"],
    ["globe", "API", "OpenAPI · /api/v1/docs", "已解析 · 47 路由", "ok"],
    ["table", "管理后台", "admin.company.com", "爬取中 · 45%", "wait"],
    ["doc", "文档", "Confluence · Engineering", "已索引 · 128 页", "ok"],
  ];
  return (
    <div className="col gap10 pad16 fill">
      {SRC.map((s, i) =>
        <div key={i} className="card row vcenter gap12 pad12">
          <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n={s[0]} s={18} c="var(--ink-2)" /></span>
          <div className="col" style={{ width: 150 }}><span className="b sm">{s[1]}</span><span className="xs muted mono">{s[2]}</span></div>
          <div className="fill">{s[4] === "wait" && <div className="prog" style={{ maxWidth: 220 }}><i style={{ width: "45%" }} /></div>}</div>
          <div className="row vcenter gap6 sm muted2"><Dot k={s[4]} />{s[3]}</div>
          <Icon n="dots" s={16} c="var(--ink-4)" />
        </div>)}
      <div className="card pad12 row vcenter gap12" style={{ borderStyle: "dashed", background: "var(--fill-2)" }}>
        <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="puzzle" s={18} c="#9c4a2e" /></span>
        <div className="col fill"><span className="b sm">+ 接入新探索器 Explorer 插件</span><span className="xs muted">实现 Explorer 接口即可挂载任意数据源(gRPC、消息队列、SaaS…)</span></div>
        <Btn sz="sm" ic="plus">添加</Btn>
      </div>
    </div>
  );
}
function ExploreAside() {
  return (
    <div className="col fill">
      <div className="row between vcenter" style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-2)" }}><span className="h3">CodeExplorer</span><Tag k="trusted">active</Tag></div>
      <div className="col gap10 pad14 fill">
        <div className="col gap6"><span className="eyebrow">连接 Connector</span><div className="field">git@github.com:company/backend</div></div>
        <div className="col gap6"><span className="eyebrow">探索阶段 Phases</span>
          {["① 全局认知", "② 深度探索", "③ 操作生成", "④ 能力标注"].map((p, i) => <div key={i} className="row vcenter gap8 sm muted2"><Dot k={i < 3 ? "ok" : "wait"} />{p}</div>)}</div>
        <div className="divln" />
        <span className="eyebrow">实现接口 implements</span>
        <div className="code">{`class Explorer(ABC):
  async def `}<span className="f">explore</span>{`(self,
    src) -> list[`}<span className="v">OperationDraft</span>{`]`}</div>
        <Note>↳ 换数据源 = 新写一个 Explorer 即可</Note>
      </div>
    </div>
  );
}

/* ========== ② 实时探索 ========== */
function Phases() {
  const P = [["Phase 1", "全局认知", "done"], ["Phase 2", "深度探索", "now"], ["Phase 3", "操作生成", "todo"], ["Phase 4", "能力标注", "todo"]];
  return <div className="col gap6">{P.map(([p, l, st], i) =>
    <div key={i} className="row vcenter gap8" style={{ fontSize: 12.5, color: st === "todo" ? "var(--ink-4)" : "var(--ink-2)" }}>
      <Dot k={st === "done" ? "ok" : st === "now" ? "wait" : "off"} /><span className="b">{p}</span><span>{l}</span>
      {st === "done" && <Icon n="check" s={13} c="var(--cap-trusted)" />}</div>)}</div>;
}
function LiveMain() {
  const FILES = ["src/api/orders.py", "src/models/order.py", "src/services/refund.py", "src/services/order.py"];
  return (
    <div className="col gap14 pad16 fill">
      <div className="row gap14">
        <div className="card pad14 col gap10" style={{ width: 230 }}><span className="eyebrow">探索阶段</span><Phases /></div>
        <div className="card pad14 col fill gap8">
          <div className="row between vcenter"><span className="eyebrow">正在读取 · reading</span><Tag k="data">phase 2</Tag></div>
          <div className="code fill">{FILES.map((f, i) => <div key={i} style={{ opacity: i === 3 ? 1 : .5 }}>{i === 3 ? <span className="k">▸ </span> : "  "}{f}</div>)}</div>
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
  );
}
function LiveAside() {
  const EX = [["实体 Entity", "Order, OrderItem, Refund"], ["操作 Ops", "create · cancel · query"], ["规则 Rule", "取消需检查退款条件"], ["联动 Chain", "cancel → 恢复库存 + 退款"]];
  return (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">🤖 本文件提取</span></div>
      <div className="col gap10 pad14 fill">
        {EX.map(([k, v], i) => <div key={i} className="col gap3"><span className="eyebrow">{k}</span><span className="sm muted2">{v}</span></div>)}
        <div className="divln" />
        <div className="row between"><span className="sm muted">生成操作</span><span className="b">23</span></div>
        <div className="row between"><span className="sm muted">待审核 (写)</span><Tag k="m">8</Tag></div>
      </div>
    </div>
  );
}

/* ========== ③ 对话界面 (角色差异化 + 确认微交互) ========== */
const CHAT = {
  customer: {
    q: "查我订单 #3901 的退款进度，能不能加急？",
    note: "已自动注入 user_id = 你本人 · 看不到他人数据",
    plan: [["1", "查询我的订单 #3901", "q"], ["2", "查看退款状态", "q"], ["3", "申请退款加急", "m"]],
    writes: 1, foot: "订单 #3901 退款 ¥299 · 仅本人",
    done: "已为订单 #3901 提交加急申请，预计 24h 内处理，结果会通知你。",
  },
  employee: {
    q: "帮我查张伟退货订单，把 pending 的退款加急",
    note: null,
    plan: [["1", "查询客户「张伟」", "q"], ["2", "查询其上月订单", "q"], ["3", "筛选退货订单 · Q-LLM", "p"], ["4", "对 pending 退款执行加急", "m"], ["5", "通知客户", "m"]],
    writes: 2, foot: "订单 #3901 退款 ¥299 → 加急 · 通知张伟",
    done: "已执行完成 — 订单 #3901 退款已加急，已通知张伟。可在审计里回滚。",
  },
};
CHAT.admin = CHAT.employee;
function PlanCard({ c }) {
  return (
    <div className="card pad12 col gap8">
      <div className="row between vcenter"><span className="eyebrow">📋 执行计划 · execution plan</span><Tag k="m">{c.writes} 写操作</Tag></div>
      {c.plan.map(([n, t, k], i) => <div key={i} className="row vcenter gap8" style={{ fontSize: 12 }}>
        <span className="mono muted xs" style={{ width: 14 }}>{n}</span><Dot k={k === "q" ? "data" : k === "p" ? "parsed" : "write"} />
        <span className="fill muted2">{t}</span>{k === "m" && <Tag k="write">mutation</Tag>}</div>)}
      <div className="divln" />
      <div className="row vcenter gap6 xs muted"><Icon n="bolt" s={12} c="var(--cap-write)" />{c.foot}</div>
    </div>
  );
}
function ChatMain() {
  const { role } = useContext(AppCtx);
  const c = CHAT[role] || CHAT.employee;
  const [done, setDone] = useState(false);
  useEffect(() => { setDone(false); }, [role]);
  return (
    <div className="col gap12 fill" style={{ padding: "16px 18px", justifyContent: "flex-end" }}>
      {role === "customer" && <div className="row vcenter gap6" style={{ alignSelf: "flex-start" }}><Tag k="trusted">客户通道</Tag><span className="xs muted">仅限你自己的数据</span></div>}
      <div className="msg u">{c.q}</div>
      <div className="col gap8" style={{ maxWidth: "82%" }}>
        <div className="msg a" style={{ maxWidth: "100%" }}>{done ? c.done : `我将执行以下操作，涉及 ${c.writes} 个写操作，需要你确认：`}</div>
        {c.note && !done && <div className="row vcenter gap6 xs" style={{ color: "var(--cap-data)" }}><Icon n="lock" s={12} c="var(--cap-data)" />{c.note}</div>}
        <PlanCard c={c} />
        {done
          ? <div className="row vcenter gap8 sm" style={{ color: "var(--cap-trusted)" }}><Icon n="check" s={15} c="var(--cap-trusted)" />已确认并执行 · 142ms · <span className="muted">DATAFLOW_SNAPSHOT 已写入审计链</span></div>
          : <div className="row gap8"><Btn k="go" ic="check" onClick={() => setDone(true)}>确认执行</Btn><Btn ic="code">修改</Btn><Btn k="ghost">取消</Btn></div>}
      </div>
      <div className="field lg" style={{ marginTop: 4 }}><Icon n="chat" s={15} c="var(--ink-4)" /><span>继续输入…</span><div style={{ flex: 1 }} /><Icon n="bolt" s={15} c="var(--accent)" /></div>
    </div>
  );
}
function ChatAside() {
  const { role } = useContext(AppCtx);
  return (
    <div className="col fill">
      <div className="pad14 row between vcenter" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">P-LLM 生成的代码</span><Tag k="q">只读</Tag></div>
      <div className="pad12 fill">
        {role === "customer"
          ? <div className="code fill">{`order = `}<span className="f">order_query</span>{`(
  order_id=`}<span className="s">"#3901"</span>{`)
  `}<span className="c"># Policy 强制注入:</span>{`
  `}<span className="c"># user_id = self</span>{`
`}<span className="f">expedite_refund</span>{`(
  order_id=order.id)`}</div>
          : <div className="code fill">{`customer = `}<span className="f">customer_query</span>{`(name=`}<span className="s">"张伟"</span>{`)
orders = `}<span className="f">order_query</span>{`(
  user_id=customer.id,
  date_range=`}<span className="s">"last_month"</span>{`)
refunds = `}<span className="f">query_quarantined_llm</span>{`(
  `}<span className="s">"找出退货订单"</span>{`, data=orders)
`}<span className="k">for</span>{` o `}<span className="k">in</span>{` refunds:
  `}<span className="k">if</span>{` o.status==`}<span className="s">"pending"</span>{`:
    `}<span className="f">expedite_refund</span>{`(order_id=o.id)`}</div>}
      </div>
      <div className="pad12" style={{ borderTop: "1px solid var(--line-2)" }}><Note>{role === "customer" ? "客户角色 → Policy 把 user_id 强制改回本人" : "P-LLM 只看自己写的代码 · 看不到变量内容"}</Note></div>
    </div>
  );
}

/* ========== ④ 数据流可视化 ========== */
const FLOW = [["trusted", "user_input(\"张伟\")"], ["data", "customer_query → customer"], ["data", "order_query → orders"], ["parsed", "Q-LLM → refund_orders"], ["write", "expedite_refund → result"]];
function FlowMain() {
  return (
    <div className="fill center" style={{ background: "var(--fill-2)" }}>
      <div className="col center gap8">
        {FLOW.map(([k, t], i) => <React.Fragment key={i}>
          <div className={`node ${k}`} style={{ width: 320, justifyContent: "space-between" }}><span className="mono" style={{ fontSize: 11 }}>{t}</span><Dot k={k} /></div>
          {i < FLOW.length - 1 && <div className="edge" style={{ height: 16 }} />}
        </React.Fragment>)}
      </div>
    </div>
  );
}
function FlowAside() {
  const LEGEND = [["trusted", "🟢 可信 user"], ["data", "🔵 内部数据"], ["parsed", "🟡 解析结果"], ["write", "🟠 写操作"]];
  return (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">节点详情 · node</span></div>
      <div className="col gap10 pad14 fill">
        <div className="node parsed" style={{ alignSelf: "flex-start" }}>refund_orders</div>
        <div className="col gap6">
          <div className="row between sm"><span className="muted">source</span><span className="mono muted2">database.orders</span></div>
          <div className="row between sm"><span className="muted">readers</span><span className="mono muted2">emp, admin</span></div>
          <div className="row between sm"><span className="muted">via</span><span className="mono muted2">Q-LLM (无放宽)</span></div>
        </div>
        <div className="divln" />
        <div className="col gap6">{LEGEND.map(([k, l], i) => <Sw key={i} c={`var(--cap-${k})`}>{l}</Sw>)}</div>
        <div className="divln" />
        <Note>Q-LLM 输出继承输入能力 → 防数据洗白</Note>
      </div>
    </div>
  );
}

/* ========== ⑤ 操作管理 (角色过滤 + 行选中 + 双人确认) ========== */
const OPS = [
  { name: "order.query", type: "q", perm: "all", confirm: "auto", status: "active", roles: ["customer", "employee", "admin"] },
  { name: "order.cancel", type: "m", perm: "emp+", confirm: "confirm", status: "pending", roles: ["employee", "admin"] },
  { name: "refund.expedite", type: "m", perm: "emp+", confirm: "confirm", status: "pending", roles: ["employee", "admin"] },
  { name: "hr.salary_set", type: "m", perm: "admin", confirm: "dual", status: "pending", roles: ["admin"] },
  { name: "user.ban", type: "m", perm: "admin", confirm: "confirm", status: "pending", roles: ["admin"] },
  { name: "customer.query", type: "q", perm: "emp+", confirm: "auto", status: "active", roles: ["employee", "admin"] },
];
const stColor = s => s === "active" ? "var(--cap-trusted)" : "var(--cap-write)";
function OpsMain() {
  const { role, opsSel, setOpsSel } = useContext(AppCtx);
  const visible = OPS.filter(o => o.roles.includes(role));
  const readonly = role !== "admin";
  return (
    <div className="pad12 fill">
      {readonly && <div className="row vcenter gap6 sm muted" style={{ marginBottom: 10 }}><Icon n="eye" s={14} c="var(--ink-3)" />{role} 视角 · 只显示你可调用的操作 · 审核为只读</div>}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>操作</th><th>类型</th><th>权限</th><th>确认级别</th><th>状态</th><th></th></tr></thead>
          <tbody>{visible.map((o) =>
            <tr key={o.name} className={o.name === opsSel ? "sel" : ""} style={{ cursor: "pointer" }} onClick={() => setOpsSel(o.name)}>
              <td className="mono b" style={{ color: "var(--ink)" }}>{o.name}</td>
              <td><Tag k={o.type}>{o.type === "m" ? "mutation" : "query"}</Tag></td>
              <td className="mono">{o.perm}</td>
              <td>{o.confirm === "dual" ? <span style={{ color: "var(--danger)" }} className="b">dual_approval</span> : o.confirm}</td>
              <td><span className="row vcenter gap5"><Dot k={o.status === "active" ? "ok" : "wait"} /><span style={{ color: stColor(o.status) }}>{o.status}</span></span></td>
              <td><Icon n="dots" s={15} c="var(--ink-4)" /></td>
            </tr>)}</tbody>
        </table>
      </div>
      {role === "admin" && <div className="col gap8" style={{ marginTop: 14 }}>
        <span className="eyebrow">可插拔后端 · 高扩展性</span>
        <div className="row gap8 wrap">
          <Chip ic="puzzle">Policy: Python · OPA · Casbin</Chip>
          <Chip ic="bolt">Executor: API · Function · SQL · RPA</Chip>
          <Chip ic="plus">注册插件</Chip>
        </div>
      </div>}
    </div>
  );
}
function OpsAside() {
  const { role, opsSel } = useContext(AppCtx);
  const visible = OPS.filter(o => o.roles.includes(role));
  const o = visible.find(x => x.name === opsSel) || visible[0];
  if (!o) return <div className="pad14 muted sm">无可见操作</div>;
  const isM = o.type === "m";
  /* dual_approval 专属面板 */
  if (o.confirm === "dual") {
    return (
      <div className="col pad14 fill gap10">
        <div className="row between vcenter"><span className="h3 mono">{o.name}</span><Tag k="write">dual approval</Tag></div>
        <div className="card pad12 col gap8" style={{ borderColor: "var(--cap-write)", background: "var(--cap-write-bg)" }}>
          <span className="eyebrow" style={{ color: "#9c5316" }}>待双人确认 · 高风险写操作</span>
          <div className="row between sm"><span style={{ color: "#9c5316" }}>发起人</span><span className="mono muted2">hr.li@company</span></div>
          <div className="row between sm"><span style={{ color: "#9c5316" }}>对象</span><span className="mono muted2">员工 #2031</span></div>
        </div>
        <span className="eyebrow">改动 diff</span>
        <div className="code">{`salary:
  `}<span className="c">- ¥28,000</span>{`
  `}<span className="s">+ ¥32,000</span></div>
        <div className="divln" />
        <span className="eyebrow">确认链</span>
        <div className="row vcenter gap8 sm"><Icon n="check" s={14} c="var(--cap-trusted)" /><span className="muted2">mgr.zhao 已批准</span><span className="xs muted">12:01</span></div>
        <div className="row vcenter gap8 sm"><Dot k="wait" /><span className="muted2">等待第二管理员(你)</span></div>
        <div className="row gap8" style={{ marginTop: 4 }}><Btn sz="sm" k="go" ic="check">确认执行</Btn><Btn sz="sm" k="warn" ic="x">拒绝</Btn></div>
        <Note>两名管理员都确认后才执行 · 全程入审计链</Note>
      </div>
    );
  }
  return (
    <div className="col pad14 fill gap10">
      <div className="row between vcenter"><span className="h3 mono">{o.name}</span><Tag k={o.type}>{isM ? "mutation" : "query"}</Tag></div>
      {[["语义", isM ? "执行一次写操作" : "查询数据"], ["参数", "见 Registry schema"], ["权限", o.perm], ["确认级别", o.confirm], ["执行", "API · Function · SQL fallback"]].map(([k, v], i) =>
        <div key={i} className="row gap8 sm"><span className="muted" style={{ width: 52, flex: "0 0 auto" }}>{k}</span><span className="muted2">{v}</span></div>)}
      <div className="divln" />
      <div className="row between vcenter"><span className="eyebrow">关联策略 policy</span><Chip ic="puzzle">PythonPolicyEngine</Chip></div>
      <div className="code">{`def `}<span className="f">{o.name.replace(".", "_")}</span>{`_policy(id, op, kw):
  `}<span className="k">if</span>{` src ⊄ trusted:
    `}<span className="k">return</span>{` Denied(...)`}</div>
      {role === "admin"
        ? (o.status === "pending"
          ? <div className="row gap8" style={{ marginTop: 2 }}><Btn sz="sm" k="go" ic="check">批准激活</Btn><Btn sz="sm" ic="sliders">调整</Btn><Btn sz="sm" k="ghost">禁用</Btn></div>
          : <div className="row vcenter gap6 sm" style={{ color: "var(--cap-trusted)", marginTop: 2 }}><Icon n="check" s={14} c="var(--cap-trusted)" />已激活 · query 自动上线</div>)
        : <div className="row vcenter gap6 sm muted" style={{ marginTop: 2 }}><Icon n="eye" s={14} c="var(--ink-3)" />只读 · 审核需管理员</div>}
    </div>
  );
}

/* ========== ⑥ 审计查看器 ========== */
const EVENTS = [["REQUEST_RECEIVED", "employee · 张伟退款加急", "data"], ["PLAN_GENERATED", "P-LLM · 5 步计划", "data"], ["POLICY_EVALUATED", "expedite_refund · allow", "trusted"], ["CONFIRMATION_REQUESTED", "confirm · 2 写操作", "parsed"], ["USER_CONFIRMED", "wei@company · 12:04", "trusted"], ["OPERATION_EXECUTED", "expedite_refund · 142ms", "write"], ["DATAFLOW_SNAPSHOT", "5 节点 · 4 边", "data"], ["RESPONSE_SENT", "1.2k tokens · 3.4s", "data"]];
function AuditMain() {
  return (
    <div className="pad16 fill"><div className="card pad16">
      <div className="col">{EVENTS.map(([e, d, c], i) =>
        <div key={i} className="row gap10" style={{ alignItems: "stretch" }}>
          <div className="col vcenter" style={{ width: 16, flex: "0 0 auto" }}><Dot k={c} />{i < EVENTS.length - 1 && <div className="edge fill" style={{ width: 2, marginTop: 2 }} />}</div>
          <div className="col gap2" style={{ paddingBottom: 12 }}>
            <div className="row vcenter gap8"><span className="mono b xs" style={{ color: "var(--ink)" }}>{e}</span>{e === "OPERATION_EXECUTED" && <Tag k="write">mutation</Tag>}</div>
            <span className="xs muted">{d}</span><span className="xs mono" style={{ color: "var(--ink-4)" }}>hash 9f3a… ← prev e21c…</span>
          </div>
        </div>)}</div>
    </div></div>
  );
}
function AuditAside() {
  return (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">OPERATION_EXECUTED</span></div>
      <div className="col gap10 pad14 fill">
        <span className="eyebrow">before → after diff</span>
        <div className="code">{`refund_status:
  `}<span className="c">- pending</span>{`
  `}<span className="s">+ expedited</span>{`
amount: ¥299`}</div>
        <div className="divln" />
        <div className="row between sm"><span className="muted">executor</span><span className="mono muted2">APIExecutor</span></div>
        <div className="row between sm"><span className="muted">耗时</span><span className="mono muted2">142ms</span></div>
        <Btn sz="sm" k="warn" ic="refresh" style={{ marginTop: 4 }}>回滚此操作 rollback</Btn>
      </div>
    </div>
  );
}

/* ========== ⑦ 插件中心 (高扩展性) ========== */
const PLUGINS = [
  { key: "explorer", iface: "Explorer", sub: "数据源探索", ic: "compass", impls: [["CodeExplorer", "ok"], ["DatabaseExplorer", "ok"], ["APIExplorer", "ok"], ["AdminPanelExplorer", "wait"], ["DocExplorer", "ok"]], code: `class Explorer(ABC):
  async def explore(self,
    src) -> list[OperationDraft]` },
  { key: "executor", iface: "Executor", sub: "执行后端 · 按优先级 fallback", ic: "bolt", impls: [["APIExecutor", "ok"], ["FunctionExecutor", "ok"], ["SQLExecutor", "wait"], ["RPAExecutor", "wait"]], code: `class Executor(ABC):
  async def execute(op, params)
  async def rollback(exec_id)
  async def capture_state(...)` },
  { key: "policy", iface: "PolicyEngine", sub: "策略判定", ic: "shield", impls: [["PythonPolicyEngine", "ok"], ["OPAPolicyEngine", "off"], ["CasbinPolicyEngine", "off"]], code: `class PolicyEngine(ABC):
  def evaluate(identity, op,
    kwargs, dataflow) -> Decision` },
  { key: "sink", iface: "AuditSink", sub: "审计后端", ic: "doc", impls: [["PostgresAuditSink", "ok"], ["S3AuditSink", "ok"], ["ElasticAuditSink", "off"], ["SIEMAuditSink", "off"]], code: `class AuditSink(ABC):
  async def write(record)
  async def query(range)` },
  { key: "llm", iface: "LLMAdapter", sub: "模型接入", ic: "code", impls: [["AnthropicAdapter · P-LLM", "ok"], ["LocalQwen · Q-LLM", "ok"], ["OpenAIAdapter", "off"], ["vLLMAdapter", "off"]], code: `class LLMAdapter(ABC):
  def chat(msgs)
  def structured_output(schema)` },
];
function PluginsMain() {
  const { plugSel, setPlugSel } = useContext(AppCtx);
  return (
    <div className="pad16 col gap12 fill">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {PLUGINS.map(p =>
          <div key={p.key} className="card pad12 col gap8" style={{ cursor: "pointer", borderColor: p.key === plugSel ? "var(--accent)" : "var(--line)", boxShadow: p.key === plugSel ? "0 0 0 1px var(--accent)" : "none" }} onClick={() => setPlugSel(p.key)}>
            <div className="row vcenter gap8"><span style={{ width: 28, height: 28, borderRadius: 7, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n={p.ic} s={15} c="var(--ink-2)" /></span>
              <div className="col fill"><span className="b sm mono">{p.iface}</span><span className="xs muted">{p.sub}</span></div>
              <span className="xs muted tnum">{p.impls.filter(i => i[1] === "ok").length}/{p.impls.length}</span></div>
            <div className="row gap6 wrap">{p.impls.map(([n, st], i) => <span key={i} className="swatch"><Dot k={st} />{n}</span>)}</div>
          </div>)}
        <div className="card pad12 col gap8 center" style={{ borderStyle: "dashed", background: "var(--fill-2)", color: "var(--ink-3)" }}>
          <Icon n="puzzle" s={22} /><span className="sm b">+ 注册新接口实现</span><span className="xs muted" style={{ textAlign: "center" }}>实现接口 → 注册 → 内核零改动</span>
        </div>
      </div>
    </div>
  );
}
function PluginsAside() {
  const { plugSel } = useContext(AppCtx);
  const p = PLUGINS.find(x => x.key === plugSel) || PLUGINS[0];
  return (
    <div className="col fill">
      <div className="pad14 row between vcenter" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3 mono">{p.iface}</span><Tag k="trusted">稳定接口</Tag></div>
      <div className="col gap10 pad14 fill">
        <span className="eyebrow">接口定义 interface</span>
        <div className="code">{p.code}</div>
        <div className="divln" />
        <span className="eyebrow">已注册实现</span>
        {p.impls.map(([n, st], i) => <div key={i} className="row vcenter gap8 sm muted2"><Dot k={st} />{n}</div>)}
        <div className="row vcenter gap8 sm muted"><Icon n="plus" s={13} />接入新实现</div>
        <div className="divln" />
        <Note>5 个接口稳定不变 · 客户的库/权限/模型/日志都靠插件接入</Note>
      </div>
    </div>
  );
}

/* ========== 屏幕配置 ========== */
const SCREENS = {
  explore: { title: "数据源管理", sub: "挂载企业系统 · 自主探索生成 Operation Registry", actions: [["refresh", "增量更新", ""], ["play", "开始探索", "pri"]], tree: ["数据源 Sources", "CodeExplorer", "DatabaseExplorer", "APIExplorer", "AdminPanelExplorer", "DocExplorer"], treeIc: ["chevd", "code", "db", "globe", "table", "doc"], treeOn: 1, asideW: 280, Main: ExploreMain, Aside: ExploreAside },
  live: { title: "Explorer · 实时探索", sub: "CodeExplorer 正在阅读 company/backend", prog: 73, tree: ["探索进程", "Phase 1 ✓", "Phase 2 ⏳", "Phase 3", "Phase 4"], treeIc: ["pulse", "check", "refresh", "sliders", "shield"], treeOn: 2, asideW: 300, Main: LiveMain, Aside: LiveAside },
  chat: { title: "张伟退款加急", sub: "自然语言操作 · 写操作执行前确认", tree: ["会话 Sessions", "张伟退款加急", "Q3 报表导出", "封禁违规账号"], treeIc: ["chat", "chevron", "chevron", "chevron"], treeOn: 1, asideW: 320, Main: ChatMain, Aside: ChatAside },
  flow: { title: "数据流图", sub: "trace: abc123 · 5 节点 · 4 边", actions: [["eye", "展开全部", ""], ["doc", "导出审计", ""]], tree: ["数据流 traces", "abc123 张伟退款", "de45f6 报表导出", "78ghij 账号封禁"], treeIc: ["flow", "chevron", "chevron", "chevron"], treeOn: 1, asideW: 268, Main: FlowMain, Aside: FlowAside },
  ops: { title: "操作管理 · Operation Registry", sub: "8 个写操作待审核", actions: [["check", "批量批准", "pri"]], tree: ["全部 (23)", "待审核 (8)", "query · active", "mutation", "已禁用"], treeIc: ["sliders", "refresh", "check", "bolt", "x"], treeOn: 1, asideW: 320, Main: OpsMain, Aside: OpsAside },
  audit: { title: "审计链 · trace abc123", sub: "8 事件 · hash 链 · 完整性已验证", actions: [["doc", "导出", ""]], tree: ["全部 traces", "abc123 张伟退款", "de45f6 报表导出", "78ghij 账号封禁"], treeIc: ["shield", "chevron", "chevron", "chevron"], treeOn: 1, asideW: 300, Main: AuditMain, Aside: AuditAside },
  plugins: { title: "插件中心 · Extensibility", sub: "5 个稳定接口 · 实现即接入，内核不变", tree: ["全部接口", "Explorer", "Executor", "PolicyEngine", "AuditSink", "LLMAdapter"], treeIc: ["puzzle", "compass", "bolt", "shield", "doc", "code"], treeOn: 0, asideW: 300, Main: PluginsMain, Aside: PluginsAside },
};

/* ========== 工作台外壳 ========== */
function Workbench() {
  const [role, setRole] = useState("admin");
  const [active, setActive] = useState("explore");
  const [opsSel, setOpsSel] = useState("order.cancel");
  const [plugSel, setPlugSel] = useState("explorer");
  const allowed = ROLE_NAV[role];
  useEffect(() => { if (!allowed.includes(active)) setActive(allowed.includes("chat") ? "chat" : allowed[0]); }, [role]);
  const s = SCREENS[active];
  const Main = s.Main, Aside = s.Aside;
  const ctx = { role, setRole, opsSel, setOpsSel, plugSel, setPlugSel };
  return (
    <AppCtx.Provider value={ctx}>
    <div className="wf">
      <div className="row fill">
        {/* activity rail */}
        <div className="rail">
          <span className="mk" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}><Icon n="hex" s={16} c="#fff" /></span>
          {NAV.map(it => {
            const ok = allowed.includes(it.k);
            return <div key={it.k} className={`ricon ${active === it.k ? "on" : ""}`} title={it.cn + (ok ? "" : " · 当前角色无权")} style={{ cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : .3 }} onClick={() => ok && setActive(it.k)}><Icon n={it.ic} s={18} /></div>;
          })}
          <div style={{ flex: 1 }} />
          <div className="ricon" style={{ cursor: "pointer" }}><Icon n="gear" s={18} /></div>
        </div>
        {/* subnav */}
        <div className="subnav">
          <div className="row vcenter between" style={{ padding: "12px 12px 8px" }}><span className="b" style={{ fontSize: 12.5 }}>{NAV.find(n => n.k === active)?.cn}</span><Icon n="dots" s={15} c="var(--ink-4)" /></div>
          <div style={{ padding: "0 8px" }}><Field style={{ height: 26, fontSize: 11 }}>搜索…</Field></div>
          <div style={{ marginTop: 8 }}>{s.tree.map((t, i) => <div key={i} className={`navitem ${i === s.treeOn ? "on" : ""}`} style={{ cursor: "pointer" }}><Icon n={s.treeIc[i]} s={13} c="var(--ink-4)" />{t}</div>)}</div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: 10 }} className="col gap6"><span className="xs muted b" style={{ letterSpacing: ".1em" }}>身份 IDENTITY · 切换看差异</span><RoleSwitch value={role} onChange={setRole} /></div>
        </div>
        {/* main */}
        <div className="col fill" style={{ background: "var(--fill-2)", minWidth: 0 }}>
          <div className="row between vcenter" style={{ padding: "13px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
            <div className="col"><span className="h2">{s.title}</span><span className="sm muted">{s.sub}</span></div>
            <div className="row vcenter gap8">
              {s.prog != null && <><span className="sm muted tnum">{s.prog}%</span><div className="prog" style={{ width: 150 }}><i style={{ width: s.prog + "%" }} /></div></>}
              {active === "chat" && <><Chip ic="bolt">CaMeL 已启用</Chip><Chip>{role}</Chip></>}
              {active === "ops" && role !== "admin" && <Chip ic="eye">只读视角</Chip>}
              {s.actions && (active !== "ops" || role === "admin") && s.actions.map(([ic, l, k], i) => <Btn key={i} sz="sm" ic={ic} k={k}>{l}</Btn>)}
            </div>
          </div>
          <Main />
        </div>
        {/* aside */}
        <div style={{ width: s.asideW, flex: "0 0 auto", borderLeft: "1px solid var(--line)", background: "var(--paper)" }} className="col"><Aside /></div>
      </div>
    </div>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Workbench />);
