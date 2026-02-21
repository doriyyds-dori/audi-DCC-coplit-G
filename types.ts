
export enum ViewState {
  COPILOT = 'COPILOT',
  DASHBOARD = 'DASHBOARD'
}

// 话术流的阶段定义
export enum CallStage {
  OPENING = 'OPENING',       // 1. 破冰/开场
  DISCOVERY = 'DISCOVERY',   // 2. 需求探测
  PITCH = 'PITCH',           // 3. 核心卖点
  OFFER = 'OFFER',           // 4. 权益/活动
  CLOSING = 'CLOSING',       // 5. 邀约/加微/结束
}

// 快速问答（急救包）分类
export type QuickCategory = 'PRICE' | 'COMPETITOR' | 'BRAND' | 'OBJECTION';

export interface ScriptButton {
  id: string;
  label: string;
  content: string; // The actual script
  logSummary: string; // Short text for CRM log
  tags?: string[]; // Visual tags like 'Hot', 'New'
  models?: string[]; // New: Applicable car models (empty = universal)
  category?: string; // New: Category for filtering (e.g. in PITCH stage)
}

export interface CallStageConfig {
  stage: CallStage;
  title: string;
  icon: any; // Lucide icon component name
  colorTheme: string; // Tailwind class for background/border
  items: ScriptButton[] | NeedQuestion[]; // Can be scripts or profiling questions
}

export interface NeedOption {
  label: string;
  value: string;
}

export interface NeedQuestion {
  id: string;
  question: string;
  scriptHint: string;
  options: NeedOption[];
  isProfile?: boolean; // Marker to distinguish from script buttons
}

export interface CustomerProfile {
  phone: string;
  gender: '先生' | '女士' | '未知';
  carSeries: string;
  needs: Record<string, string>;
}

export interface QuickResponseItem {
  id: string;
  category: QuickCategory;
  question: string; // e.g. "这车多少钱？"
  answer: string;   // Script to read
  models?: string[]; // New: Applicable car models
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
