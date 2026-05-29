/* screen-audit.jsx — 审计查看器 Audit · 4 directions
   Theme: hash-chained event timeline, integrity verify, rollback, sinks. */

const EVENTS = [
  ["REQUEST_RECEIVED", "employee · 张伟退款加急", "data"],
  ["PLAN_GENERATED", "P-LLM · 5 步计划", "data"],
  ["POLICY_EVALUATED", "expedite_refund · allow", "trusted"],
  ["CONFIRMATION_REQUESTED", "confirm · 2 写操作", "parsed"],
  ["USER_CONFIRMED", "wei@company · 12:04", "trusted"],
  ["OPERATION_EXECUTED", "expedite_refund · 142ms", "write"],
  ["DATAFLOW_SNAPSHOT", "5 节点 · 4 边", "data"],
  ["RESPONSE_SENT", "1.2k tokens · 3.4s", "data"],
];
const SINKS = ["PostgreSQL", "S3 Object Lock", "Elasticsearch", "企业 SIEM"];

function Chain({ compact }) {
  return (
    <div className="col">
      {EVENTS.map(([e, d, c], i) =>
        <div key={i} className="row gap10" style={{ alignItems: "stretch" }}>
          <div className="col vcenter" style={{ width: 16, flex: "0 0 auto" }}>
            <Dot k={c} />
            {i < EVENTS.length - 1 && <div className="edge fill" style={{ width: 2, marginTop: 2 }} />}
          </div>
          <div className="col gap2" style={{ paddingBottom: compact ? 8 : 12 }}>
            <div className="row vcenter gap8"><span className="mono b xs" style={{ color: "var(--ink)" }}>{e}</span>{e === "OPERATION_EXECUTED" && <Tag k="write">mutation</Tag>}</div>
            <span className="xs muted">{d}</span>
            {!compact && <span className="xs mono" style={{ color: "var(--ink-4)" }}>hash 9f3a… ← prev e21c…</span>}
          </div>
        </div>)}
    </div>
  );
}

/* ---------- A · Workbench ---------- */
function AuditA() {
  const aside = {
    tree: ["全部 traces", "abc123 张伟退款", "de45f6 报表导出", "78ghij 账号封禁"], treeOn: 1,
    treeIc: ["shield", "chevron", "chevron", "chevron"], w: 300,
    panel: (
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
    ),
  };
  return (
    <ShellA active="audit" aside={aside}>
      <div className="row between vcenter" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="col"><span className="h2">审计链 · trace abc123</span><span className="sm muted mono">8 事件 · hash 链</span></div>
        <div className="row vcenter gap8"><span className="row vcenter gap5 sm" style={{ color: "var(--cap-trusted)" }}><Icon n="lock" s={14} c="var(--cap-trusted)" />完整性已验证</span><Btn sz="sm" ic="doc">导出</Btn></div>
      </div>
      <div className="pad16 fill"><div className="card pad16">{Chain({})}</div></div>
    </ShellA>
  );
}

/* ---------- B · Conversational ---------- */
function AuditB() {
  return (
    <ShellB active="audit" wide={560} role="admin">
      <div className="col gap12 fill" style={{ justifyContent: "center" }}>
        <div className="col gap3"><span className="eyebrow">trace abc123</span><span className="h2">这次都发生了什么</span><span className="row vcenter gap6 sm" style={{ color: "var(--cap-trusted)" }}><Icon n="lock" s={13} c="var(--cap-trusted)" />hash 链完整，未被篡改</span></div>
        <div className="card pad16">{Chain({ compact: true })}</div>
        <Btn k="warn" ic="refresh" style={{ alignSelf: "flex-start" }}>回滚写操作 expedite_refund</Btn>
      </div>
    </ShellB>
  );
}

/* ---------- C · Console ---------- */
function AuditC() {
  const sub = <><span className="sm b">审计</span><Field style={{ width: 200, height: 26 }}>搜索 trace / 操作 / 用户</Field><div style={{ flex: 1 }} /><Btn sz="sm" ic="lock">验证完整性</Btn><Btn sz="sm" ic="doc">导出</Btn></>;
  return (
    <ShellC active="audit" sub={sub}>
      <div className="pad16 col gap14 fill">
        <div className="row gap12">
          {[["1,284", "今日事件"], ["37", "ACCESS_DENIED"], ["12", "写操作"], ["100%", "链完整"]].map(([n, l], i) =>
            <div key={i} className="card pad12 col fill"><span className="h2 tnum">{n}</span><span className="xs muted">{l}</span></div>)}
        </div>
        <div className="row gap12 fill">
          <div className="card pad16 fill"><span className="eyebrow">trace abc123 · 时间线</span><div style={{ marginTop: 10 }}>{Chain({ compact: true })}</div></div>
          <div className="col gap12" style={{ width: 250, flex: "0 0 auto" }}>
            <div className="card pad12 col gap8"><span className="eyebrow">可插拔审计后端</span>
              {SINKS.map((s, i) => <div key={i} className="row vcenter gap6 sm muted2"><Dot k="ok" />{s}</div>)}
              <div className="row vcenter gap6 sm muted"><Icon n="plus" s={13} />实现 AuditSink 接口</div>
            </div>
            <div className="card pad12 col gap6"><span className="eyebrow">回滚</span><span className="xs muted">before/after 已记录</span><Btn sz="sm" k="warn" ic="refresh">回滚此 trace 写操作</Btn></div>
          </div>
        </div>
      </div>
    </ShellC>
  );
}

/* ---------- D · Security / Graph ---------- */
function AuditD() {
  const aside = (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">完整性 · integrity</span></div>
      <div className="col gap10 pad14 fill">
        <div className="card pad12 col gap6" style={{ borderColor: "var(--cap-trusted)", background: "var(--cap-trusted-bg)" }}>
          <div className="row vcenter gap6 b sm" style={{ color: "#2c6b39" }}><Icon n="lock" s={14} c="var(--cap-trusted)" />链已验证</div>
          <span className="xs" style={{ color: "#3c7a48" }}>8/8 事件 hash 连续 · 无篡改</span>
        </div>
        <span className="eyebrow">不可变归档</span>
        <div className="row vcenter gap6 sm muted2"><Icon n="lock" s={13} c="var(--ink-3)" />S3 Object Lock · WORM</div>
        <div className="divln" />
        <span className="eyebrow">回滚 rollback</span>
        <Btn sz="sm" k="warn" ic="refresh">expedite_refund</Btn>
        <Note ink>每个 mutation 存 before/after</Note>
      </div>
    </div>
  );
  return (
    <ShellD active="audit" aside={aside} trace="audit · abc123">
      <div className="row between vcenter" style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
        <span className="h3">审计链 · hash chain</span><Btn sz="sm" ic="lock">verify_integrity()</Btn>
      </div>
      <div className="pad16 fill">
        <div className="row gap6 vcenter wrap" style={{ marginBottom: 14 }}>
          {EVENTS.map((e, i) => <React.Fragment key={i}>
            <div className="node" style={{ padding: "6px 9px", fontSize: 10 }}><Dot k={e[2]} /><span className="mono">{e[0].split("_")[0]}</span></div>
            {i < EVENTS.length - 1 && <Icon n="lock" s={11} c="var(--ink-4)" />}
          </React.Fragment>)}
        </div>
        <div className="card pad16">{Chain({ compact: true })}</div>
      </div>
    </ShellD>
  );
}

Object.assign(window, { AuditA, AuditB, AuditC, AuditD });
