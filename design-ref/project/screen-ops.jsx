/* screen-ops.jsx — 操作管理 Operation registry · 4 directions
   Theme: review ops, set permission/confirm/policy; pluggable Policy+Executor. */

const OPS = [
  ["order.query", "q", "emp+", "auto", "active"],
  ["order.cancel", "m", "emp+", "confirm", "pending"],
  ["refund.expedite", "m", "emp+", "confirm", "pending"],
  ["hr.salary_set", "m", "admin", "dual", "pending"],
  ["user.ban", "m", "admin", "confirm", "pending"],
  ["customer.query", "q", "emp+", "auto", "active"],
];
const stColor = s => s === "active" ? "var(--cap-trusted)" : "var(--cap-write)";

function OpDetail() {
  return (
    <div className="col gap10">
      <div className="row between vcenter"><span className="h3 mono">order.cancel</span><Tag k="m">mutation</Tag></div>
      {[["语义", "取消一个订单"], ["参数", "order_id (string), reason (string?)"], ["前置", "order.status == 'active'"], ["联动", "恢复库存 · 发起退款"], ["执行", "API POST /orders/{id}/cancel"]].map(([k, v], i) =>
        <div key={i} className="row gap8 sm"><span className="muted" style={{ width: 44, flex: "0 0 auto" }}>{k}</span><span className="muted2">{v}</span></div>)}
      <div className="divln" />
      <div className="row between vcenter"><span className="eyebrow">关联策略 policy</span><Chip ic="puzzle">PythonPolicyEngine</Chip></div>
      <div className="code">{`def `}<span className="f">expedite_refund_policy</span>{`(id, op, kw):
  `}<span className="k">if</span>{` order_id.sources ⊄ trusted:
    `}<span className="k">return</span>{` Denied(...)`}</div>
      <div className="row gap8" style={{ marginTop: 2 }}><Btn sz="sm" k="go" ic="check">批准激活</Btn><Btn sz="sm" ic="sliders">调整</Btn><Btn sz="sm" k="ghost">禁用</Btn></div>
    </div>
  );
}

/* ---------- A · Workbench ---------- */
function OpsA() {
  const aside = {
    tree: ["全部 (23)", "待审核 (8)", "query · active", "mutation", "已禁用"], treeOn: 1,
    treeIc: ["sliders", "refresh", "check", "bolt", "x"], w: 300,
    panel: <div className="col pad14 fill">{OpDetail()}</div>,
  };
  return (
    <ShellA active="ops" aside={aside}>
      <div className="row between vcenter" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="col"><span className="h2">操作管理 · Operation Registry</span><span className="sm muted">8 个写操作待审核</span></div>
        <div className="row gap6"><Field style={{ width: 160, height: 28 }}>搜索操作…</Field><Btn sz="sm" k="pri" ic="check">批量批准</Btn></div>
      </div>
      <div className="pad12 fill">
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th>操作</th><th>类型</th><th>权限</th><th>确认级别</th><th>状态</th><th></th></tr></thead>
            <tbody>{OPS.map((o, i) =>
              <tr key={i} className={i === 1 ? "sel" : ""}>
                <td className="mono b" style={{ color: "var(--ink)" }}>{o[0]}</td>
                <td><Tag k={o[1]}>{o[1] === "m" ? "mutation" : "query"}</Tag></td>
                <td className="mono">{o[2]}</td>
                <td>{o[3] === "dual" ? <span style={{ color: "var(--danger)" }} className="b">dual_approval</span> : o[3]}</td>
                <td><span className="row vcenter gap5"><Dot k={o[4] === "active" ? "ok" : "wait"} /><span style={{ color: stColor(o[4]) }}>{o[4]}</span></span></td>
                <td><Icon n="dots" s={15} c="var(--ink-4)" /></td>
              </tr>)}</tbody>
          </table>
        </div>
      </div>
    </ShellA>
  );
}

/* ---------- B · Conversational ---------- */
function OpsB() {
  return (
    <ShellB active="ops" wide={620} role="admin">
      <div className="col gap12 fill" style={{ justifyContent: "center" }}>
        <div className="col gap3"><span className="eyebrow">待你审核 · 8</span><span className="h2">这些写操作要上线吗？</span><span className="sm muted">读操作已自动激活。写操作需你确认权限与确认级别。</span></div>
        {OPS.filter(o => o[4] === "pending").slice(0, 4).map((o, i) =>
          <div key={i} className="card pad12 row vcenter gap10">
            <Tag k="m">m</Tag>
            <div className="col fill"><span className="b sm mono">{o[0]}</span><span className="xs muted">权限 {o[2]} · 确认 {o[3]}</span></div>
            <Btn sz="sm" k="go" ic="check">批准</Btn><Btn sz="sm" k="ghost" ic="sliders">调整</Btn>
          </div>)}
        <Note ink style={{ textAlign: "center" }}>策略后端可换 · PythonPolicy / OPA / Casbin</Note>
      </div>
    </ShellB>
  );
}

/* ---------- C · Console ---------- */
function OpsC() {
  const sub = <><span className="sm b">操作管理</span><Chip on>全部 23</Chip><Chip>待审核 8</Chip><div style={{ flex: 1 }} /><Btn sz="sm" ic="filter">筛选</Btn><Btn sz="sm" k="pri" ic="check">批量批准</Btn></>;
  return (
    <ShellC active="ops" sub={sub}>
      <div className="row fill" style={{ overflow: "hidden" }}>
        <div className="fill pad16" style={{ borderRight: "1px solid var(--line)" }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="tbl">
              <thead><tr><th>操作</th><th>类型</th><th>权限</th><th>确认级别</th><th>状态</th></tr></thead>
              <tbody>{OPS.map((o, i) =>
                <tr key={i} className={i === 1 ? "sel" : ""}>
                  <td className="mono b" style={{ color: "var(--ink)" }}>{o[0]}</td><td><Tag k={o[1]}>{o[1] === "m" ? "mutation" : "query"}</Tag></td>
                  <td className="mono">{o[2]}</td><td>{o[3]}</td>
                  <td><span style={{ color: stColor(o[4]) }} className="row vcenter gap5"><Dot k={o[4] === "active" ? "ok" : "wait"} />{o[4]}</span></td>
                </tr>)}</tbody>
            </table>
          </div>
          <div className="col gap8" style={{ marginTop: 14 }}>
            <span className="eyebrow">可插拔后端 · 高扩展性</span>
            <div className="row gap8 wrap">
              <Chip ic="puzzle">Policy: Python · OPA · Casbin</Chip>
              <Chip ic="bolt">Executor: API · Function · SQL · RPA</Chip>
              <Chip ic="plus">注册插件</Chip>
            </div>
          </div>
        </div>
        <div className="col" style={{ width: 320, flex: "0 0 auto", padding: 16, background: "var(--paper)" }}>{OpDetail()}</div>
      </div>
    </ShellC>
  );
}

/* ---------- D · Security / Graph ---------- */
function OpsD() {
  const aside = (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: "1px solid var(--line-2)" }}><span className="h3">策略命中统计</span></div>
      <div className="col gap10 pad14 fill">
        <div className="row between sm"><span className="muted">allow</span><span className="mono" style={{ color: "var(--cap-trusted)" }}>1,284</span></div>
        <div className="row between sm"><span className="muted">deny</span><span className="mono" style={{ color: "var(--danger)" }}>37</span></div>
        <div className="row between sm"><span className="muted">约束注入</span><span className="mono muted2">412</span></div>
        <div className="divln" />
        <span className="eyebrow">执行后端 fallback</span>
        {["① APIExecutor", "② FunctionExecutor", "③ SQLExecutor", "④ RPAExecutor"].map((e, i) =>
          <div key={i} className="row vcenter gap6 sm muted2"><Dot k={i < 2 ? "ok" : "wait"} />{e}</div>)}
        <Note ink>API 缺失才降级到 SQL/RPA · 标记高风险</Note>
      </div>
    </div>
  );
  return (
    <ShellD active="ops" aside={aside} trace="registry · 23 ops">
      <div className="row between vcenter" style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
        <span className="h3">操作 × 策略 × 角色</span><Tag k="m">8 待审核</Tag>
      </div>
      <div className="pad16 fill">
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th>操作</th><th>customer</th><th>employee</th><th>admin</th><th>确认</th></tr></thead>
            <tbody>{OPS.map((o, i) => {
              const allow = (r) => o[2] === "admin" ? (r === "admin") : true;
              return <tr key={i}><td className="mono b" style={{ color: "var(--ink)" }}>{o[0]}</td>
                {["c", "e", "a"].map((r, j) => <td key={j}>{(o[2] === "admin" && r !== "a") ? <Icon n="x" s={13} c="var(--ink-4)" /> : <Icon n="check" s={13} c="var(--cap-trusted)" />}</td>)}
                <td>{o[3] === "dual" ? <Tag k="write">dual</Tag> : <span className="muted">{o[3]}</span>}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <Note ink style={{ marginTop: 10, display: "block" }}>同一操作，不同角色不同约束 · customer 强制 user_id=self</Note>
      </div>
    </ShellD>
  );
}

Object.assign(window, { OpsA, OpsB, OpsC, OpsD });
