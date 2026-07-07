import { useEffect } from 'react';
import { Dot, Note, Sw } from '../components/kit';
import { useApp } from '../lib/appContext';
import { useTraces, useTraceFlow } from '../features/traces';
import type { CapKind } from '../api/types';
import { flowNodeLabel, nodeSourceLabel } from '../lib/labels';

const LEGEND: Array<[CapKind, string]> = [
  ['trusted', '可信输入 · 你直接提供'],
  ['data', '内部数据 · 系统读取'],
  ['parsed', '解析结果 · AI 提取'],
  ['write', '写操作 · 会改动数据'],
];

function useActiveTrace() {
  const { traceSel, setTraceSel } = useApp();
  const traces = useTraces();
  useEffect(() => {
    if (!traceSel && traces.data?.items.length) setTraceSel(traces.data.items[0].id);
  }, [traceSel, traces.data, setTraceSel]);
  return traceSel ?? traces.data?.items[0]?.id;
}

export function FlowMain() {
  const { flowSel, setFlowSel } = useApp();
  const traceId = useActiveTrace();
  const { data, isLoading } = useTraceFlow(traceId);

  if (isLoading) return <div className="fill center muted sm">加载数据流…</div>;
  if (!data || data.nodes.length === 0) return <div className="fill center muted sm">暂无数据流，先在对话里执行一次操作。</div>;

  return (
    <div className="fill center scroll" style={{ background: 'var(--canvas)', padding: 24 }} data-tour="flow-graph">
      <div className="col center gap2">
        {data.nodes.map((node, i) => (
          <div key={node.node_id} className="col center">
            <button className={`node ${node.cap} ${i === flowSel ? 'sel' : ''}`}
              style={{ width: 340, justifyContent: 'space-between' }} onClick={() => setFlowSel(i)}>
              <span style={{ fontSize: 11.5 }}>{flowNodeLabel(node.label)}</span>
              <Dot k={node.cap} />
            </button>
            {i < data.nodes.length - 1 && <div className="edge flow" style={{ height: 26 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlowAside() {
  const { flowSel } = useApp();
  const traceId = useActiveTrace();
  const { data } = useTraceFlow(traceId ?? undefined);
  const n = data?.nodes[flowSel] ?? data?.nodes[0];

  return (
    <div className="col fill">
      <div className="pad14" style={{ borderBottom: '1px solid var(--line-2)' }}>
        <span className="h3">节点详情</span>
      </div>
      <div className="col gap12 pad14 fill scroll">
        {!n && <span className="muted sm">选择一个节点查看详情。</span>}
        {n && (
          <>
            <div className={`node ${n.cap}`} style={{ alignSelf: 'flex-start', cursor: 'default' }}>
              <span>{flowNodeLabel(n.label)}</span><Dot k={n.cap} />
            </div>
            <div className="col gap6">
              {([['来源', nodeSourceLabel(n.source)], ['可见角色', n.readers], ['经由', flowNodeLabel(n.via)]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="row between sm">
                  <span className="muted">{k}</span>
                  <span className="muted2" style={{ textAlign: 'right' }}>{v || '-'}</span>
                </div>
              ))}
            </div>
            <div className="divln" />
            <span className="eyebrow">能力图例</span>
            <div className="col gap6">
              {LEGEND.map(([k, l]) => <Sw key={k} c={`var(--cap-${k})`}>{l}</Sw>)}
            </div>
            <div className="divln" />
            <Note>解析结果会保留原始数据的可信级别，防止被误当成可信输入。</Note>
          </>
        )}
      </div>
    </div>
  );
}
