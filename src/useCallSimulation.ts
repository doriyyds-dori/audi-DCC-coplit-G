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
  const [conversationId, setConversationId] = useState<string>('');

  const currentStep = script.find(s => s.id === currentStepId) || script[0];

  // 首个步骤 ID（动态获取，不硬编码）
  const firstStepId = script[0]?.id || '开场白';

  useEffect(() => {
    const globalStep = script.find(s => s.id === '全局问题');
    setGlobalOptions(globalStep ? globalStep.customerOptions : []);
  }, [script]);

  // 当话术数据源变更时，如果通话已开始且仍在首步阶段，重新填充开场白
  useEffect(() => {
    if (isCallActive && script.length > 0) {
      const opening = script[0];
      if (opening?.agentScript) {
        setCurrentStepId(opening.id);
        setHistory([{ role: 'agent', text: opening.agentScript }]);
      }
    }
  }, [script]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCall = () => {
    setIsCallActive(true);
    setConversationId(`conv_${crypto.randomUUID()}`);
    const opening = script[0];
    setCurrentStepId(opening?.id || '开场白');
    setHistory([{ role: 'agent', text: opening?.agentScript || '' }]);
  };

  const resetCall = () => {
    setIsCallActive(false);
    setConversationId('');
    setHistory([]);
    setCurrentStepId(script[0]?.id || '开场白');
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
    conversationId,
    startCall,
    resetCall,
    handleCustomerResponse,
    appendMessages,
  };
}
