import { Icon, Btn, Chip, Tag, Dot, Note } from '../components/kit';
import { useApp } from '../lib/appContext';
import { useMe } from '../features/auth';
import { useOperations, usePublishOperation, useDisableOperation } from '../features/operations';
import { useApprovals, useVote } from '../features/approvals';
import { useLlmProfiles, useLlmModels, usePatchProfile } from '../features/llm';
import { useState } from 'react';
import type { ApprovalRequest, Operation } from '../api/types';
import {
  opTitle, kindLabel, confirmLabel, opStatusLabel, permLabel, riskLabel,
  executorLabel, llmRoleLabel, approvalStatusLabel,
} from '../lib/labels';

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
        <span className="eyebrow">模型设置</span>
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
            <span className="b sm" style={{ width: 92 }}>{llmRoleLabel(p.role)}</span>
            {opts.length ? (
              <select value={model} onChange={(ev) => setEdit({ ...edit, [p.role]: { ...e, model: ev.target.value } })}
                style={selStyle}>
                {[model, ...opts.filter((m) => m !== model)].map((m) => <option key={m}>{m}</option>)}
              </select>
            ) : (
              <input value={model} onChange={(ev) => setEdit({ ...edit, [p.role]: { ...e, model: ev.target.value } })}
                style={selStyle} />
            )}
            <label className="row vcenter gap5 xs muted">回复长度上限
              <input type="number" value={maxTok} style={{ ...selStyle, width: 90 }}
                onChange={(ev) => setEdit({ ...edit, [p.role]: { ...e, max_tokens: Number(ev.target.value) } })} />
            </label>
            <Btn sz="sm" k="go" ic="check" disabled={patch.isPending}
              onClick={() => patch.mutate({ role: p.role, body: { model, max_tokens: maxTok } },
                { onSuccess: () => toast(`已更新${llmRoleLabel(p.role)}为 ${model}`), onError: (er) => toast((er as Error).message, 'warn') })}>
              保存
            </Btn>
          </div>
        );
      })}
      {data && <span className="xs muted">改动即时生效，无需重启</span>}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  height: 28, border: '1px solid var(--line)', borderRadius: 6, padding: '0 8px',
  font: 'inherit', fontSize: 12, background: 'var(--paper)', minWidth: 200,
};

function ApprovalRow({ ar }: { ar: ApprovalRequest }) {
  const { toast } = useApp();
  const vote = useVote(ar.id);
  return (
    <div className="card pad12 row vcenter gap12">
      <Tag k="write">{confirmLabel(ar.confirm_level)}</Tag>
      <div className="col fill">
        <span className="b sm">{ar.target_type === 'operation' ? '操作上线审批' : '写操作审批'}</span>
        <span className="xs muted">已批准 {ar.approve_votes}/{ar.required_votes} · {approvalStatusLabel(ar.status)}</span>
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
      <span className="eyebrow">待人工审批（{items.length}）</span>
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
    .filter((o) => !query
      || opTitle(o).toLowerCase().includes(query.toLowerCase())
      || o.op_key.toLowerCase().includes(query.toLowerCase()));

  const stColor = (s: string) => (s === 'active' ? 'var(--cap-trusted)' : s === 'disabled' ? 'var(--ink-4)' : 'var(--cap-write)');

  return (
    <div className="pad16 fill scroll">
      {readonly && (
        <div className="row vcenter gap6 sm muted" style={{ marginBottom: 10 }}>
          <Icon n="eye" s={14} c="var(--ink-3)" />当前身份 · 只显示你可调用的操作 · 审核为只读
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
                <td className="b" style={{ color: 'var(--ink)' }}>
                  <div className="col" style={{ gap: 1 }}>
                    <span>{opTitle(o)}</span>
                    <span className="xs muted mono" style={{ fontWeight: 400 }}>{o.op_key}</span>
                  </div>
                </td>
                <td><Tag k={o.kind === 'mutation' ? 'm' : 'q'}>{kindLabel(o.kind)}</Tag></td>
                <td>{permLabel(o.perm)}</td>
                <td>{o.confirm_level === 'dual'
                  ? <span style={{ color: 'var(--danger)' }} className="b">需双人审批</span> : confirmLabel(o.confirm_level)}</td>
                <td><span className="row vcenter gap5">
                  <Dot k={o.status === 'active' ? 'ok' : o.status === 'disabled' ? 'off' : 'wait'} />
                  <span style={{ color: stColor(o.status) }}>{opStatusLabel(o.status)}</span>
                </span></td>
                <td><Icon n="chevron" s={15} c="var(--ink-4)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {role === 'admin' && (
        <div className="col gap8" style={{ marginTop: 14 }}>
          <span className="eyebrow">可扩展的后端能力</span>
          <div className="row gap8 wrap">
            <Chip ic="puzzle">策略引擎 · 可按需接入</Chip>
            <Chip ic="bolt">执行方式 · 接口 / 数据库 / 流程</Chip>
          </div>
          <ApprovalsPanel />
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
  const publish = usePublishOperation();
  const disable = useDisableOperation();

  const o = data?.items.find((x) => x.id === opsSel) ?? data?.items[0];
  if (!o) return <div className="pad14 muted sm">无可见操作</div>;
  const isM = o.kind === 'mutation';

  return (
    <div className="col pad14 fill gap10 scroll">
      <div className="row between vcenter">
        <div className="col" style={{ gap: 1, minWidth: 0 }}>
          <span className="h3">{opTitle(o)}</span>
          <span className="xs muted mono">{o.op_key}</span>
        </div>
        <Tag k={isM ? 'm' : 'q'}>{kindLabel(o.kind)}</Tag>
      </div>
      {([
        ['说明', isM ? '执行一次写操作（会改动数据）' : '查询数据（不改动）'],
        ['版本', `第 ${o.version} 版`],
        ['权限', permLabel(o.perm)],
        ['确认级别', confirmLabel(o.confirm_level)],
        ['风险', riskLabel(o.risk_level)],
        ['执行方式', executorLabel(o.executor_binding)],
      ] as [string, string][]).map(([k, v], i) => (
        <div key={i} className="row gap8 sm">
          <span className="muted" style={{ width: 60, flex: '0 0 auto' }}>{k}</span>
          <span className="muted2">{v}</span>
        </div>
      ))}
      <div className="divln" />
      <div className="row between vcenter">
        <span className="eyebrow">安全策略</span>
        <Chip ic="puzzle">策略引擎</Chip>
      </div>
      <Note>执行前自动校验：当数据来源不可信时，系统会拒绝执行，保障操作安全。</Note>
      {role === 'admin' ? (
        o.status === 'pending' ? (
          <div className="row gap8" style={{ marginTop: 2 }}>
            <Btn sz="sm" k="go" ic="check" disabled={publish.isPending}
              onClick={() => publish.mutate(o.id, { onSuccess: () => toast(`已上线「${opTitle(o)}」`) })}>批准上线</Btn>
            <Btn sz="sm" k="ghost" disabled={disable.isPending}
              onClick={() => disable.mutate(o.id, { onSuccess: () => toast(`已停用「${opTitle(o)}」`, 'warn') })}>停用</Btn>
          </div>
        ) : o.status === 'active' ? (
          <div className="row vcenter gap6 sm" style={{ color: 'var(--cap-trusted)', marginTop: 2 }}>
            <Icon n="check" s={14} c="var(--cap-trusted)" />已上线
            <Btn sz="sm" k="ghost" disabled={disable.isPending}
              onClick={() => disable.mutate(o.id, { onSuccess: () => toast(`已停用「${opTitle(o)}」`, 'warn') })}>停用</Btn>
          </div>
        ) : (
          <Btn sz="sm" k="go" ic="check" disabled={publish.isPending}
            onClick={() => publish.mutate(o.id, { onSuccess: () => toast(`已重新上线「${opTitle(o)}」`) })}>重新上线</Btn>
        )
      ) : (
        <div className="row vcenter gap6 sm muted" style={{ marginTop: 2 }}>
          <Icon n="eye" s={14} c="var(--ink-3)" />只读 · 审核需管理员
        </div>
      )}
      <Note>读操作自动上线，写操作需管理员审核后上线。</Note>
    </div>
  );
}
