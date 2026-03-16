import { useState, useEffect } from 'react';
import { ScriptStep, ScriptOption } from './types';
import { ChatMessage } from './ChatPanel';

/**
 * useCallSimulation — 通话模拟逻辑
 *
 * 管理：对话历史、当前步骤、通话状态、全局选项
 * 不关心：话术数据来源、持久化
 */
export function useCallSimulation(script: ScriptStep[]) {
  const [currentStepId, setCurrentStepId] = useState<string>('开场白');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [globalOptions, setGlobalOptions] = useState<ScriptOption[]>([]);

  const currentStep = script.find(s => s.id === currentStepId) || script[0];

  useEffect(() => {
    const globalStep = script.find(s => s.id === '全局问题');
    setGlobalOptions(globalStep ? globalStep.customerOptions : []);
  }, [script]);

  const startCall = () => {
    setIsCallActive(true);
    setCurrentStepId('开场白');
    setHistory([{ role: 'agent', text: script.find(s => s.id === '开场白')?.agentScript || '' }]);
  };

  const resetCall = () => {
    setIsCallActive(false);
    setHistory([]);
    setCurrentStepId('开场白');
  };

  const handleCustomerResponse = (option: ScriptOption) => {
    const newHistory = [...history];
    newHistory.push({ role: 'customer', text: option.label });
    newHistory.push({ role: 'agent', text: option.agentResponse });
    
    if (option.nextStepId && option.nextStepId !== '结束') {
      const nextStep = script.find(s => s.id === option.nextStepId);
      if (nextStep) {
        if (nextStep.agentScript && nextStep.agentScript !== option.agentResponse) {
          newHistory.push({ role: 'agent', text: nextStep.agentScript });
        }
        setCurrentStepId(option.nextStepId);
      }
    } else if (option.nextStepId === '结束') {
      setCurrentStepId('结束');
    }
    
    setHistory(newHistory);
  };

  /** 追加消息到对话历史（用于 FAQ 等不涉及步骤跳转的场景） */
  const appendMessages = (...messages: ChatMessage[]) => {
    setHistory(prev => [...prev, ...messages]);
  };

  return {
    currentStep,
    history,
    isCallActive,
    globalOptions,
    startCall,
    resetCall,
    handleCustomerResponse,
    appendMessages,
  };
}
