/* screen-chat.jsx — 对话界面 Chat · 4 directions
   Theme: NL request → execution plan → write-op confirmation. */

const PLAN = [
  ["1", "查询客户「张伟」", "q"],
  ["2", "查询其上月订单", "q"],
  ["3", "筛选退货订单 · Q-LLM", "p"],
  ["4", "对 pending 退款执行加急", "m"],
  ["5", "通知客户", "m"],
];
const USERQ = "帮我查张伟退货订单，把 pending 的退款加急";

function PlanCard({ flat }) {
  return (
    <div className={`card ${flat ? "soft" : ""} pad12 col gap8`} style={{ borderColor: "var(--line)" }}>
      <div className="row between vcenter"><span className="eyebrow">📋 执行计划 · execution plan</span><Tag k="m">2 写操作</Tag></div>
      {PLAN.map(([n, t, k], i) =>
        <div key={i} className="row vcenter gap8" style={{ fontSize: 12 }}>
          <span className="mono muted xs" style={{ width: 14 }}>{n}</span>
          <Dot k={k === "q" ? "data" : k === "p" ? "parsed" : "write"} />
          <span className="fill muted2">{t}</span>
          {k === "m" && <Tag k="write">mutation</Tag>}
        </div>)}
      <div className="divln" />
      <div className="row vcenter gap6 xs muted"><Icon n="bolt" s={12} c="var(--cap-write)" />订单 #3901 退款 ¥299 → 加急 · 通知张伟</div>
    </div>
  );
}

/* ---------- A · Workbench (chat left, code/plan inspector right) ---------- */
function ChatA() {
  const aside = {
    tree: ["会话 Sessions", "张伟退款加急", "Q3 报表导出", "封禁违规账号"], treeOn: 1,
    treeIc: ["chat", "chevron", "chevron", "chevron"], w: 320,
    panel: (
      <div className="col fill">
        <div className="pad14 row between vcenter" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">P-LLM 生成的代码</span><Tag k="q">只读视图</Tag></div>
        <div className="pad12 fill">
          <div className="code fill">{`customer = `}<span className="f">customer_query</span>{`(name=`}<span className="s">"张伟"</span>{`)
orders = `}<span className="f">order_query</span>{`(
  user_id=customer.id,
  date_range=`}<span className="s">"last_month"</span>{`)
refunds = `}<span className="f">query_quarantined_llm</span>{`(
  `}<span className="s">"找出退货订单"</span>{`, data=orders)
`}<span className="k">for</span>{` o `}<span className="k">in</span>{` refunds:
  `}<span className="k">if</span>{` o.status == `}<span className="s">"pending"</span>{`:
    `}<span className="f">expedite_refund</span>{`(order_id=o.id)
    `}<span className="f">notify_customer</span>{`(...)`}</div>
        </div>
        <div className="pad12" style={{ borderTop: "1px solid var(--line-2)" }}><Note ink>P-LLM 只看自己写的代码 · 看不到变量内容</Note></div>
      </div>
    ),
  };
  return (
    <ShellA active="chat" aside={aside}>
      <div className="row between vcenter" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <span className="h2">张伟退款加急</span><div className="row gap6"><Chip ic="bolt">CaMeL 已启用</Chip><Chip>employee</Chip></div>
      </div>
      <div className="col gap12 fill" style={{ padding: "16px 18px", justifyContent: "flex-end" }}>
        <div className="msg u">{USERQ}</div>
        <div className="col gap8" style={{ maxWidth: "82%" }}>
          <div className="msg a" style={{ maxWidth: "100%" }}>我将执行以下操作，涉及 2 个写操作，需要你确认：</div>
          <PlanCard />
          <div className="row gap8"><Btn k="go" ic="check">确认执行</Btn><Btn ic="code">修改</Btn><Btn k="ghost">取消</Btn></div>
        </div>
        <div className="field lg" style={{ marginTop: 4 }}><Icon n="chat" s={15} c="var(--ink-4)" /><span>继续输入…</span><div style={{ flex: 1 }} /><Icon n="bolt" s={15} c="var(--accent)" /></div>
      </div>
    </ShellA>
  );
}

/* ---------- B · Conversational (the hero) ---------- */
function ChatB() {
  return (
    <ShellB active="chat" wide={640}>
      <div className="col gap14 fill" style={{ justifyContent: "flex-end", paddingBottom: 6 }}>
        <div className="col center gap6" style={{ marginBottom: "auto", paddingTop: 30 }}>
          <span className="h1">你想做什么？</span>
          <span className="sm muted">用自然语言操作系统 · 写操作执行前一定先问你</span>
        </div>
        <div className="msg u">{USERQ}</div>
        <div className="msg a">我将执行以下操作 — 涉及 <span className="b">2 个写操作</span>，需要你确认：</div>
        <PlanCard flat />
        <div className="row gap8"><Btn k="go" sz="lg" ic="check" style={{ flex: 1, justifyContent: "center" }}>确认执行</Btn><Btn sz="lg" ic="code">修改</Btn><Btn sz="lg" k="ghost">取消</Btn></div>
        <div className="field lg"><Icon n="chat" s={16} c="var(--ink-4)" /><span>问点什么、或让我做点什么…</span><div style={{ flex: 1 }} /><span className="btn pri sm" style={{ height: 26 }}>发送</span></div>
      </div>
    </ShellB>
  );
}

/* ---------- C · Console (chat panel + structured side) ---------- */
function ChatC() {
  const sub = <><span className="sm b">对话</span><Chip on>张伟退款加急</Chip><div style={{ flex: 1 }} /><span className="sm muted">角色约束:</span><Chip>employee · 部门级</Chip></>;
  return (
    <ShellC active="chat" sub={sub}>
      <div className="row fill" style={{ overflow: "hidden" }}>
        <div className="col fill" style={{ padding: 16, gap: 12, justifyContent: "flex-end", borderRight: "1px solid var(--line)" }}>
          <div className="msg u">{USERQ}</div>
          <div className="msg a">已生成执行计划，请在右侧确认 2 个写操作 →</div>
          <div className="field lg"><Icon n="chat" s={15} c="var(--ink-4)" /><span>输入消息…</span><div style={{ flex: 1 }} /><span className="btn pri sm" style={{ height: 26 }}>发送</span></div>
        </div>
        <div className="col gap12" style={{ width: 360, flex: "0 0 auto", padding: 16, background: "var(--paper)" }}>
          <span className="eyebrow">待确认 · pending confirmation</span>
          <PlanCard />
          <div className="card pad12 col gap6">
            <span className="eyebrow">影响 diff</span>
            <div className="row between sm"><span className="muted">#3901 refund_status</span><span className="mono"><span style={{ color: "var(--ink-4)" }}>pending</span> → <span style={{ color: "var(--cap-write)" }}>expedited</span></span></div>
          </div>
          <div className="row gap8"><Btn k="go" ic="check" style={{ flex: 1, justifyContent: "center" }}>确认</Btn><Btn k="ghost">取消</Btn></div>
        </div>
      </div>
    </ShellC>
  );
}

/* ---------- D · Security / Graph (plan with capability provenance) ---------- */
function ChatD() {
  const aside = (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">Policy 检查</span></div>
      <div className="col gap10 pad14 fill">
        {[["order_id 来源", "database.orders ✓", "trusted"], ["参数约束注入", "user_id = self ✓", "data"], ["confirm_level", "confirm", "write"]].map(([k, v, c], i) =>
          <div key={i} className="col gap3"><span className="eyebrow">{k}</span><div className="row vcenter gap6 sm muted2"><Dot k={c} />{v}</div></div>)}
        <div className="divln" />
        <Note ink>即便 P-LLM 被诱导，Policy 也会在执行前强制改回 user_id</Note>
      </div>
    </div>
  );
  return (
    <ShellD active="chat" aside={aside} trace="chat · req #4471">
      <div className="row between vcenter" style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
        <span className="h3">请求 → 计划 → 能力检查</span><Tag k="m">2 写操作待确认</Tag>
      </div>
      <div className="col gap12 pad16 fill">
        <div className="msg u" style={{ alignSelf: "flex-start", maxWidth: "70%" }}>{USERQ}</div>
        <div className="row gap10 fill">
          <div className="col gap6 center" style={{ width: 240 }}>
            <div className="node trusted">user · 张伟</div><div className="edge" style={{ height: 14 }} />
            <div className="node data">customer_query</div><div className="edge" style={{ height: 14 }} />
            <div className="node data">order_query</div><div className="edge" style={{ height: 14 }} />
            <div className="node parsed">Q-LLM 筛选</div><div className="edge" style={{ height: 14 }} />
            <div className="node write">expedite_refund</div>
          </div>
          <div className="col fill"><PlanCard /><div className="row gap8" style={{ marginTop: 10 }}><Btn k="go" ic="check">确认执行</Btn><Btn ic="eye">查看完整数据流</Btn><Btn k="ghost">取消</Btn></div></div>
        </div>
      </div>
    </ShellD>
  );
}

Object.assign(window, { ChatA, ChatB, ChatC, ChatD });
