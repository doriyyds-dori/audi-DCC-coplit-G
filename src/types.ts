
export interface ScriptOption {
  label: string;
  agentResponse: string;
  nextStepId?: string;
}

export interface ScriptStep {
  id: string;
  phase: string;
  agentScript: string;
  customerOptions: ScriptOption[];
  coreLogic?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  children?: {
    id: string;
    label: string;
    buttons: string[];
  }[];
  buttons?: string[];
}

export type MenuData = MenuItem[];

export type CustomerType = 'existing' | 'new';

/** CSV 上传时每行数据的类型定义 */
export interface CsvRow {
  Phase: string;
  StepId: string;
  CoreLogic?: string;
  AgentScript?: string;
  CustomerOption: string;
  AgentResponse: string;
  NextStepId?: string;
}
