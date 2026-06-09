import type { ScreenKey } from '../api/types';
import { ExploreMain, ExploreAside } from './Explore';
import { LiveMain, LiveAside } from './Live';
import { ChatMain, ChatAside } from './Chat';
import { FlowMain, FlowAside } from './Flow';
import { OpsMain, OpsAside } from './Ops';
import { AuditMain, AuditAside } from './Audit';
import { PluginsMain, PluginsAside } from './Plugins';

export interface ScreenConfig {
  title: string;
  sub: string;
  asideW: number;
  tree: string[];
  treeIc: string[];
  Main: () => React.ReactElement;
  Aside: () => React.ReactElement;
}

export const SCREENS: Record<ScreenKey, ScreenConfig> = {
  explore: {
    title: '数据源管理',
    sub: '挂载企业系统 · 自主探索生成 Operation Registry',
    tree: ['数据源 Sources', 'CodeExplorer', 'DatabaseExplorer', 'APIExplorer', 'AdminPanelExplorer', 'DocExplorer'],
    treeIc: ['chevd', 'code', 'db', 'globe', 'table', 'doc'],
    asideW: 280, Main: ExploreMain, Aside: ExploreAside,
  },
  live: {
    title: 'Explorer · 实时探索',
    sub: '探索任务的实时事件流',
    tree: ['探索进程', 'Phase 1 · 全局认知', 'Phase 2 · 深度探索', 'Phase 3 · 操作生成', 'Phase 4 · 能力标注'],
    treeIc: ['pulse', 'check', 'refresh', 'sliders', 'shield'],
    asideW: 300, Main: LiveMain, Aside: LiveAside,
  },
  chat: {
    title: '对话',
    sub: '自然语言操作 · 写操作执行前确认',
    tree: ['会话 Sessions'],
    treeIc: ['chat'],
    asideW: 320, Main: ChatMain, Aside: ChatAside,
  },
  flow: {
    title: '数据流图',
    sub: '能力标注的数据流 · 与执行计划同源',
    tree: ['数据流 traces'],
    treeIc: ['flow'],
    asideW: 268, Main: FlowMain, Aside: FlowAside,
  },
  ops: {
    title: '操作管理 · Operation Registry',
    sub: '版本化操作 · 权限/确认级别/审核',
    tree: ['全部', '待审核', 'query · active', 'mutation', '已禁用'],
    treeIc: ['sliders', 'refresh', 'check', 'bolt', 'x'],
    asideW: 320, Main: OpsMain, Aside: OpsAside,
  },
  audit: {
    title: '审计链',
    sub: 'hash 链 · 可验证完整性',
    tree: ['全部 traces'],
    treeIc: ['shield'],
    asideW: 300, Main: AuditMain, Aside: AuditAside,
  },
  plugins: {
    title: '插件中心 · Extensibility',
    sub: '稳定接口 · 实现即接入，内核不变',
    tree: ['全部接口', 'Explorer', 'Executor', 'PolicyEngine', 'AuditSink', 'LLMAdapter'],
    treeIc: ['puzzle', 'compass', 'bolt', 'shield', 'doc', 'code'],
    asideW: 300, Main: PluginsMain, Aside: PluginsAside,
  },
};
