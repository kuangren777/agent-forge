import { useEffect, useRef, useState } from 'react';
import { Icon, Tag, Dot, Note, Btn } from '../components/kit';
import { useApp } from '../lib/appContext';
import { useMe } from '../features/auth';
import { useSources, useStartExplore, useJob, useExplorationStream } from '../features/sources';

const PHASES = ['全局认知', '深度探索', '操作生成', '能力标注'];

export function LiveMain() {
  const { toast } = useApp();
  const role = useMe().data?.acting_role ?? 'admin';
  const sources = useSources();
  const start = useStartExplore();
  const [jobId, setJobId] = useState<string>();
  const job = useJob(jobId);
  const events = useExplorationStream(jobId);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [events]);

  const src = sources.data?.items[0];
  const phase = job.data?.phase ?? 0;
  const progress = job.data?.progress ?? 0;

  function begin() {
    if (!src) return;
    start.mutate(src.id, {
      onSuccess: (r) => { setJobId(r.job_id); toast('探索已启动', 'info'); },
      onError: (e) => toast((e as Error).message, 'warn'),
    });
  }

  return (
    <div className="col gap14 fill scroll" style={{ padding: 16 }}>
      <div className="row between vcenter">
        <span className="sm muted">{src ? `${src.connector_kind} · ${src.conn}` : '无数据源'}</span>
        <div className="row vcenter gap10">
          {jobId && <><span className="sm muted tnum">{progress}%</span>
            <div className="prog" style={{ width: 140 }}><i style={{ width: `${progress}%` }} /></div></>}
          {role === 'admin' && <Btn sz="sm" k="pri" ic="play" disabled={start.isPending || !src} onClick={begin}>
            {jobId ? '重新探索' : '开始探索'}</Btn>}
        </div>
      </div>

      <div className="row gap14 wrap">
        <div className="card col gap10" style={{ width: 230, padding: 14 }}>
          <span className="eyebrow">探索阶段</span>
          {PHASES.map((label, i) => {
            const st = phase > i + 1 || job.data?.status === 'done' ? 'done' : phase === i + 1 ? 'now' : 'todo';
            return (
              <div key={i} className="row vcenter gap8" style={{ fontSize: 12.5, color: st === 'todo' ? 'var(--ink-4)' : 'var(--ink-2)' }}>
                <Dot k={st === 'done' ? 'ok' : st === 'now' ? 'wait' : 'off'} />
                <span className="b">Phase {i + 1}</span><span className="fill">{label}</span>
                {st === 'done' && <Icon n="check" s={13} c="var(--cap-trusted)" />}
                {st === 'now' && <span className="xs mono" style={{ color: 'var(--accent)' }}>running</span>}
              </div>
            );
          })}
        </div>
        <div className="card col fill gap8" style={{ padding: 14, minWidth: 280 }}>
          <div className="row between vcenter">
            <span className="eyebrow">实时日志 · stream</span>
            {jobId && job.data?.status !== 'done' && <span className="row vcenter gap5 xs muted"><Dot k="wait" /> live</span>}
          </div>
          <div ref={logRef} className="code" style={{ maxHeight: 320, minHeight: 120 }}>
            {!jobId && <span className="c">{'// 点击「开始探索」启动 LLM 驱动的真实探索'}</span>}
            {events.map((e, i) => (
              <div key={i}>
                <span className="c">{`[${e.type}] `}</span>
                <span>{e.type === 'op' ? `+ op ${e.payload.key} (${e.payload.kind})`
                  : e.type === 'phase' ? `phase ${e.payload.phase} · ${e.payload.label}`
                  : e.type === 'rule' ? `rule ${e.payload.text}`
                  : e.type === 'done' ? `done · ${e.payload.operations} operations`
                  : JSON.stringify(e.payload)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveAside() {
  const sources = useSources();
  const running = sources.data?.items.filter((s) => s.status === 'running').length ?? 0;
  return (
    <div className="col fill">
      <div style={{ padding: 14, borderBottom: '1px solid var(--line-2)' }}><span className="h3">探索概览</span></div>
      <div className="col gap12 fill scroll" style={{ padding: 14 }}>
        <div className="row between"><span className="sm muted">数据源</span><span className="b tnum">{sources.data?.items.length ?? 0}</span></div>
        <div className="row between"><span className="sm muted">探索中</span><Tag k="parsed">{running}</Tag></div>
        <div className="divln" />
        <Note ink>探索由 P-LLM 真实驱动：读取连接信息→抽取候选操作→写入注册表（写操作待审核）。</Note>
      </div>
    </div>
  );
}
