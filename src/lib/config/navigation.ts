/* Static UI config (not business data) — the nav model. */
import type { ScreenKey } from '../../api/types';

export interface NavItem {
  k: ScreenKey;
  cn: string;
  en: string;
  ic: string;
}

export const NAV: NavItem[] = [
  { k: 'explore', cn: '探索配置', en: 'Explore', ic: 'compass' },
  { k: 'live',    cn: '实时探索', en: 'Live',    ic: 'pulse'   },
  { k: 'chat',    cn: '对话',     en: 'Chat',    ic: 'chat'    },
  { k: 'flow',    cn: '数据流',   en: 'Flow',    ic: 'flow'    },
  { k: 'ops',     cn: '操作管理', en: 'Ops',     ic: 'sliders' },
  { k: 'audit',   cn: '审计',     en: 'Audit',   ic: 'shield'  },
  { k: 'plugins', cn: '插件',     en: 'Plugins', ic: 'puzzle'  },
];
