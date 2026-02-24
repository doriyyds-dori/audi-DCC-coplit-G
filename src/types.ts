
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
}

export interface ScriptData {
  opening: string;
  steps: ScriptStep[];
}

export type CustomerType = 'existing' | 'new';
