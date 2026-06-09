import { getToken } from './api/http';
import { useMe, login } from './features/auth';
import { Shell } from './components/Shell';
import { Icon } from './components/kit';
import type { Role } from './api/types';

const ROLE_LABELS: Array<[Role, string]> = [
  ['admin', '管理员'], ['employee', '员工'], ['customer', '客户'],
];

function Login() {
  return (
    <div className="wf center" style={{ background: 'var(--canvas)' }}>
      <div className="card pad16 col gap12" style={{ width: 320 }}>
        <div className="logo" style={{ fontSize: 16 }}>
          <span className="mk"><Icon n="hex" s={15} c="#fff" /></span>
          <span>agent<span style={{ color: 'var(--accent)' }}>·</span>forge</span>
        </div>
        <span className="sm muted">企业 AI Agent 治理控制台 · 选择身份登录（演示）</span>
        <div className="col gap8" style={{ marginTop: 4 }}>
          {ROLE_LABELS.map(([r, label]) => (
            <button key={r} className="btn lg" style={{ justifyContent: 'flex-start' }}
              onClick={() => login(r)}>
              <Icon n="user" s={15} /> 以「{label}」登录
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const hasToken = !!getToken();
  const me = useMe();

  if (!hasToken) return <Login />;
  if (me.isLoading) {
    return <div className="wf center muted sm">加载中…</div>;
  }
  if (me.isError || !me.data) return <Login />;
  return <Shell />;
}
