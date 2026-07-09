import { Icon, Btn, Chip, Tag, Dot, Note } from '../components/kit';
import { useApp } from '../lib/appContext';
import { useMe } from '../features/auth';
import { useOperations, usePublishOperation, useDisableOperation } from '../features/operations';
import { useApprovals, useVote } from '../features/approvals';
import { useLlmProfiles, useLlmModels, usePatchProfile } from '../features/llm';
import { usePolicies, useCompilePolicy, useCompileAndApply, useTogglePolicy } from '../features/policies';
import { useState } from 'react';
import type { ApprovalRequest, Operation, PolicyRule } from '../api/types';

const ROLE_LABEL: Record<string, string> = { pllm: 'P-LLM · 规划', qllm: 'Q-LLM · 解析' };

function LlmSettingsPanel() {
  const { toast } = useApp();
  const { data } = useLlmProfiles();
  const [fetchModels, setFetchModels] = useState(false);
  const models = useLlmModels(fetchModels);
  const patch = usePatchProfile();
  const [edit, setEdit] = useState<Record<string, { model?: string; max_tokens?: number }>>({});

  const items = data?.items ?? [];
  const opts = models.data?.models ?? [];

  return (
    <div className="col gap8" style={{ marginTop: 16 }}>
      <div className="row vcenter between">
        <span className="eyebrow">模型设置 · LLM profiles</span>
        <button className="btn sm" disabled={models.isFetching}
          onClick={() => setFetchModels(true)}>
          {models.isFetching ? '拉取中…' : '拉取可用模型'}
        </button>
      </div>
      {items.map((p) => {
        const e = edit[p.role] ?? {};
        const model = e.model ?? p.model;
        const maxTok = e.max_tokens ?? p.max_tokens;
        return (
          <div key={p.role} className="card pad12 row vcenter gap10 wrap">
            <span className="b sm" style={{ width: 92 }}>{ROLE_LABEL[p.role] ?? p.role}</span>
            {opts.length ? (
              <select value={model} onChange={(ev) => setEdit({ ...edit, [p.role]: { ...e, model: ev.target.value } })}
                style={selStyle}>
                {[model, ...opts.filter((m) => m !== model)].map((m) => <option key={m}>{m}</option>)}
              </select>
            ) : (
              <input value={model} onChange={(ev) => setEdit({ ...edit, [p.role]: { ...e, model: ev.target.value } })}
                style={selStyle} />
            )}
            <label className="row vcenter gap5 xs muted">max_tokens
              <input type="number" value={maxTok} style={{ ...selStyle, width: 90 }}
                onChange={(ev) => setEdit({ ...edit, [p.role]: { ...e, max_tokens: Number(ev.target.value) } })} />
            </label>
            <Btn sz="sm" k="go" ic="check" disabled={patch.isPending}
              onClick={() => patch.mutate({ role: p.role, body: { model, max_tokens: maxTok } },
                { onSuccess: () => toast(`已更新 ${p.role} 模型为 ${model}`), onError: (er) => toast((er as Error).message, 'warn') })}>
              保存
            </Btn>
          </div>
        );
      })}
      {data && <span className="xs muted">网关：{data.base_url} · 改动即时生效，无需重启</span>}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  height: 28, border: '1px solid var(--line)', borderRadius: 6, padding: '0 8px',
  font: 'inherit', fontSize: 12, background: 'var(--paper)', minWidth: 200,
};

function PolicyPanel() {
  const { toast } = useApp();
  const { data } = usePolicies();
  const compile = useCompilePolicy();
  const apply = useCompileAndApply();
  const toggle = useTogglePolicy();
  const [nlText, setNlText] = useState('');
  const [preview, setPreview] = useState<PolicyRule | null>(null);
  const rules = data?.items ?? [];

  const handleCompile = () => {
    if (!nlText.trim()) return;
    compile.mutate(nlText.trim(), {
      onSuccess: (r) => {
        setPreview(r.rule);
        toast('策略已编译，请在下方预览后确认或取消');
      },
      onError: (e) => toast((e as Error).message, 'warn'),
    });
  };

  const handleApply = () => {
    if (!nlText.trim()) return;
    apply.mutate(nlText.trim(), {
      onSuccess: (r) => {
        toast(`策略 ${r.rule.rule_id} 已激活`);
        setNlText('');
        setPreview(null);
      },
      onError: (e) => toast((e as Error).message, 'warn'),
    });
  };

  const handleCancel = () => { setPreview(null); setNlText(''); };

  return (
    <div className="col gap8" style={{ marginTop: 16 }}>
      <span className="eyebrow">策略管理 · Policy Rules（{rules.length} 条规则，{data?.active_count ?? 0} 激活）</span>

      {/* NL input */}
      <div className="col gap6">
        <span className="xs muted">用自然语言描述你的安全策略——系统会将其编译为 CaMeL 能力标签规则</span>
        <div className="row gap8">
          <input
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            placeholder="例：退款金额超过 5000 元需要双人审批"
            style={{ ...selStyle, flex: 1, minWidth: 300 }}
            onKeyDown={(e) => e.key === 'Enter' && handleCompile()}
          />
          <Btn sz="sm" k="go" ic="wand" disabled={compile.isPending || !nlText.trim()}
            onClick={handleCompile}>
            {compile.isPending ? '编译中…' : '编译'}
          </Btn>
        </div>
      </div>

      {/* compile preview */}
      {preview && (
        <div className="card pad10 col gap6" style={{ borderColor: 'var(--cap-parsed)' }}>
          <div className="row between vcenter">
            <span className="b sm mono">{preview.rule_id}</span>
            <div className="row gap5">
              <Btn sz="sm" k="go" ic="check" disabled={apply.isPending} onClick={handleApply}>确认激活</Btn>
              <Btn sz="sm" k="ghost" ic="x" onClick={handleCancel}>取消</Btn>
            </div>
          </div>
          <div className="row gap8 wrap xs">
            <span>效果：<Tag k={preview.effect === 'deny' ? 'm' : 'q'}>{preview.effect}</Tag></span>
            {preview.confirm_escalation && <span>升级：<Tag k="write">{preview.confirm_escalation}</Tag></span>}
            {preview.capability_tags.length > 0 && (
              <span>能力标签：{preview.capability_tags.map(t => <Chip key={t} ic="shield">{t}</Chip>)}</span>
            )}
          </div>
          <span className="xs muted">{preview.reason}</span>
        </div>
      )}

      {/* active rules list */}
      {rules.length > 0 && (
        <div className="col gap6">
          {rules.map((r) => (
            <div key={r.id} className="card pad8 row vcenter gap10">
              <div className="col fill gap2">
                <div className="row vcenter gap6">
                  <span className="b sm mono">{r.rule_id}</span>
                  <span className={`dot ${r.status === 'active' ? 'dot-ok' : 'dot-off'}`} />
                  <Tag k={r.effect === 'deny' ? 'm' : 'q'}>{r.effect}</Tag>
                  {r.confirm_escalation && <Tag k="write">{r.confirm_escalation}</Tag>}
                  {r.source === 'compiled' && <Chip ic="wand">NL编译</Chip>}
                </div>
                <span className="xs muted">{r.reason || r.description || '-'}</span>
                {r.capability_tags.length > 0 && (
                  <div className="row gap4 xs" style={{ marginTop: 2 }}>
                    {r.capability_tags.map(t => <span key={t} className="mono" style={{ color: 'var(--cap-parsed)' }}>[{t}]</span>)}
                  </div>
                )}
              </div>
              <Btn sz="sm" k={r.status === 'active' ? 'warn' : 'go'} ic={r.status === 'active' ? 'pause' : 'play'}
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ id: r.id, status: r.status === 'active' ? 'disabled' : 'active' },
                  { onSuccess: () => toast(`${r.rule_id} ${r.status === 'active' ? '已禁用' : '已激活'}`) })}>
                {r.status === 'active' ? '禁用' : '启用'}
              </Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalRow({ ar }: { ar: ApprovalRequest }) {
  const { toast } = useApp();
  const vote = useVote(ar.id);
  return (
    <div className="card pad12 row vcenter gap12">
      <Tag k="write">{ar.confirm_level}</Tag>
      <div className="col fill">
        <span className="b sm mono">{ar.target_id}</span>
        <span className="xs muted">{ar.approve_votes}/{ar.required_votes} 批准 · {ar.status}</span>
      </div>
      <Btn sz="sm" k="go" ic="check" disabled={vote.isPending || ar.status !== 'pending'}
        data-tour="ops-approve"
        onClick={() => vote.mutate({ decision: 'approve' }, {
          onSuccess: (r) => toast(r.status === 'approved' ? '已批准并满足条件' : `已投票 (${r.approve_votes}/${r.required_votes})`),
          onError: (e) => toast((e as Error).message, 'warn'),
        })}>批准</Btn>
      <Btn sz="sm" k="warn" ic="x" disabled={vote.isPending || ar.status !== 'pending'}
        onClick={() => vote.mutate({ decision: 'reject' }, { onSuccess: () => toast('已拒绝', 'warn') })}>拒绝</Btn>
    </div>
  );
}

function ApprovalsPanel() {
  const { data } = useApprovals('pending');
  const items = data?.items ?? [];
  return (
    <div className="col gap8" style={{ marginTop: 16 }} data-tour="ops-approvals">
      <span className="eyebrow">待人工审批 · dual approval（{items.length}）</span>
      {items.length === 0 && <span className="sm muted">暂无待审批请求。</span>}
      {items.map((ar) => <ApprovalRow key={ar.id} ar={ar} />)}
    </div>
  );
}

function matchTree(o: Operation, treeSel: number): boolean {
  switch (treeSel) {
    case 1: return o.status === 'pending';
    case 2: return o.kind === 'query' && o.status === 'active';
    case 3: return o.kind === 'mutation';
    case 4: return o.status === 'disabled';
    default: return true;
  }
}

export function OpsMain() {
  const { opsSel, setOpsSel, treeSel, query } = useApp();
  const role = useMe().data?.acting_role ?? 'admin';
  const { data, isLoading, isError } = useOperations();
  const readonly = role !== 'admin';

  if (isLoading) return <div className="pad16 muted sm">加载操作注册表…</div>;
  if (isError || !data) return <div className="pad16 muted sm" style={{ color: 'var(--danger)' }}>加载失败</div>;

  const visible = data.items
    .filter((o) => matchTree(o, treeSel))
    .filter((o) => !query || o.op_key.toLowerCase().includes(query.toLowerCase()));

  const stColor = (s: string) => (s === 'active' ? 'var(--cap-trusted)' : s === 'disabled' ? 'var(--ink-4)' : 'var(--cap-write)');

  return (
    <div className="pad16 fill scroll">
      {readonly && (
        <div className="row vcenter gap6 sm muted" style={{ marginBottom: 10 }}>
          <Icon n="eye" s={14} c="var(--ink-3)" />{role} 视角 · 只显示你可调用的操作 · 审核为只读
        </div>
      )}
      <div className="card" style={{ overflow: 'hidden' }} data-tour="ops-table">
        <table className="tbl">
          <thead><tr style={{ cursor: 'default' }}>
            <th>操作</th><th>类型</th><th>权限</th><th>确认级别</th><th>状态</th><th></th>
          </tr></thead>
          <tbody>
            {visible.length === 0 && (
              <tr style={{ cursor: 'default' }}>
                <td colSpan={6} className="muted sm" style={{ padding: '16px 12px', textAlign: 'center' }}>无匹配操作</td>
              </tr>
            )}
            {visible.map((o) => (
              <tr key={o.id} className={o.id === opsSel ? 'sel' : ''} onClick={() => setOpsSel(o.id)}>
                <td className="mono b" style={{ color: 'var(--ink)' }}>{o.op_key}</td>
                <td><Tag k={o.kind === 'mutation' ? 'm' : 'q'}>{o.kind}</Tag></td>
                <td className="mono">{o.perm}</td>
                <td>{o.confirm_level === 'dual'
                  ? <span style={{ color: 'var(--danger)' }} className="b">dual_approval</span> : o.confirm_level}</td>
                <td><span className="row vcenter gap5">
                  <Dot k={o.status === 'active' ? 'ok' : o.status === 'disabled' ? 'off' : 'wait'} />
                  <span style={{ color: stColor(o.status) }}>{o.status}</span>
                </span></td>
                <td><Icon n="chevron" s={15} c="var(--ink-4)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {role === 'admin' && (
        <div className="col gap8" style={{ marginTop: 14 }}>
          <span className="eyebrow">可插拔后端 · 高扩展性</span>
          <div className="row gap8 wrap">
            <Chip ic="puzzle">Policy: NL编译 · Python · OPA · Casbin</Chip>
            <Chip ic="bolt">Executor: API · Function · SQL · RPA</Chip>
          </div>
          <ApprovalsPanel />
          <PolicyPanel />
          <LlmSettingsPanel />
        </div>
      )}
    </div>
  );
}

export function OpsAside() {
  const { opsSel, toast } = useApp();
  const role = useMe().data?.acting_role ?? 'admin';
  const { data } = useOperations();
  const { data: policyData } = usePolicies();
  const publish = usePublishOperation();
  const disable = useDisableOperation();

  const o = data?.items.find((x) => x.id === opsSel) ?? data?.items[0];
  if (!o) return <div className="pad14 muted sm">无可见操作</div>;
  const isM = o.kind === 'mutation';

  // Find policy rules matching this operation
  const matchedRules = (policyData?.items ?? []).filter(
    (r) => r.status === 'active' && r.op_keys.some(
      (pattern) => pattern === '*' || pattern === o.op_key || (pattern.endsWith('*') && o.op_key.startsWith(pattern.slice(0, -1)))
    )
  );

  return (
    <div className="col pad14 fill gap10 scroll">
      <div className="row between vcenter">
        <span className="h3 mono">{o.op_key}</span>
        <Tag k={isM ? 'm' : 'q'}>{o.kind}</Tag>
      </div>
      {([
        ['语义', isM ? '执行一次写操作' : '查询数据'],
        ['版本', `v${o.version}`],
        ['权限', o.perm],
        ['确认级别', o.confirm_level],
        ['风险', o.risk_level],
        ['执行器', o.executor_binding ?? '-'],
      ] as [string, string][]).map(([k, v], i) => (
        <div key={i} className="row gap8 sm">
          <span className="muted" style={{ width: 52, flex: '0 0 auto' }}>{k}</span>
          <span className="muted2">{v}</span>
        </div>
      ))}
      <div className="divln" />
      <div className="row between vcenter">
        <span className="eyebrow">关联策略 · matching rules（{matchedRules.length}）</span>
        <Chip ic="puzzle">CaMeL Policy Engine</Chip>
      </div>
      {matchedRules.length === 0 ? (
        <div className="code sm muted">
          <span className="k"># 无匹配的数据库策略规则</span><br />
          <span className="k"># 当前仅应用 @rule 装饰器规则（customer scope 等）</span>
        </div>
      ) : (
        matchedRules.map((r) => (
          <div key={r.id} className="code xs col gap3">
            <div className="row gap4 wrap">
              <span className="f">{r.rule_id}</span>
              <Tag k={r.effect === 'deny' ? 'm' : 'q'}>{r.effect}</Tag>
              {r.confirm_escalation && <Tag k="write">{r.confirm_escalation}</Tag>}
            </div>
            <span className="muted">{r.reason}</span>
            {r.capability_tags.length > 0 && (
              <span className="k">cap_tags: [{r.capability_tags.join(', ')}]</span>
            )}
            {r.conditions.length > 0 && (
              <span className="k">conds: [{r.conditions.map(c => `${c.field} ${c.op} ${c.value}`).join('; ')}]</span>
            )}
          </div>
        ))
      )}
      {role === 'admin' ? (
        o.status === 'pending' ? (
          <div className="row gap8" style={{ marginTop: 2 }}>
            <Btn sz="sm" k="go" ic="check" disabled={publish.isPending}
              onClick={() => publish.mutate(o.id, { onSuccess: () => toast(`已批准 ${o.op_key}`) })}>批准激活</Btn>
            <Btn sz="sm" k="ghost" disabled={disable.isPending}
              onClick={() => disable.mutate(o.id, { onSuccess: () => toast(`已禁用 ${o.op_key}`, 'warn') })}>禁用</Btn>
          </div>
        ) : o.status === 'active' ? (
          <div className="row vcenter gap6 sm" style={{ color: 'var(--cap-trusted)', marginTop: 2 }}>
            <Icon n="check" s={14} c="var(--cap-trusted)" />已激活
            <Btn sz="sm" k="ghost" disabled={disable.isPending}
              onClick={() => disable.mutate(o.id, { onSuccess: () => toast(`已禁用 ${o.op_key}`, 'warn') })}>禁用</Btn>
          </div>
        ) : (
          <Btn sz="sm" k="go" ic="check" disabled={publish.isPending}
            onClick={() => publish.mutate(o.id, { onSuccess: () => toast(`已重新激活 ${o.op_key}`) })}>重新激活</Btn>
        )
      ) : (
        <div className="row vcenter gap6 sm muted" style={{ marginTop: 2 }}>
          <Icon n="eye" s={14} c="var(--ink-3)" />只读 · 审核需管理员
        </div>
      )}
      <Note>读操作自动激活，写操作需管理员审核后上线。</Note>
    </div>
  );
}
