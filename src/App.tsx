import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  User, 
  MessageSquare, 
  ChevronRight, 
  Download, 
  Upload, 
  RefreshCcw,
  Users,
  CheckCircle2,
  ArrowRight,
  FileText
} from 'lucide-react';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ScriptStep, CustomerType, ScriptOption } from './types';
import { DEFAULT_EXISTING_SCRIPT, CSV_TEMPLATE } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [customerType, setCustomerType] = useState<CustomerType>('existing');
  const [existingScript, setExistingScript] = useState<ScriptStep[]>(DEFAULT_EXISTING_SCRIPT);
  const [newScript, setNewScript] = useState<ScriptStep[]>([]);
  const [globalOptions, setGlobalOptions] = useState<ScriptOption[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>('开场白');
  const [history, setHistory] = useState<{ role: 'agent' | 'customer', text: string }[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const script = customerType === 'existing' ? existingScript : newScript;
  const currentStep = script.find(s => s.id === currentStepId) || script[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    // Extract global options from script on load or script change
    const globalStep = script.find(s => s.id === '全局问题');
    if (globalStep) {
      setGlobalOptions(globalStep.customerOptions);
    } else {
      setGlobalOptions([]);
    }
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
    // 1. Add customer's response to chat
    newHistory.push({ role: 'customer', text: option.label });
    // 2. Add agent's immediate reaction to chat
    newHistory.push({ role: 'agent', text: option.agentResponse });
    
    // 3. Move to next step if exists
    if (option.nextStepId && option.nextStepId !== '结束') {
      const nextStep = script.find(s => s.id === option.nextStepId);
      if (nextStep) {
        // If the next step has a script, and it's not just a duplicate of the response
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

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'script_template.csv';
    link.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const newSteps: ScriptStep[] = [];
        const phases = Array.from(new Set(data.map(d => d.Phase)));
        
        phases.forEach((phase, index) => {
          const phaseData = data.filter(d => d.Phase === phase);
          // If StepId is "全局问题", we treat it specially
          const stepId = phaseData[0].StepId || `step_${index}`;
          
          newSteps.push({
            id: stepId,
            phase: phase as string,
            agentScript: phaseData[0].AgentScript || (stepId === '全局问题' ? '（客户随时可能追问的问题）' : '请继续引导客户'),
            customerOptions: phaseData.map(d => ({
              label: d.CustomerOption,
              agentResponse: d.AgentResponse,
              nextStepId: d.NextStepId
            }))
          });
        });

        if (newSteps.length > 0) {
          if (customerType === 'existing') {
            setExistingScript(newSteps);
          } else {
            setNewScript(newSteps);
          }
          alert(`${customerType === 'existing' ? '保有潜客' : '首次邀约'}话术库更新成功！`);
        }
      }
    });
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F5F7F9] text-[#1A1A1A] font-sans overflow-x-hidden lg:overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-brand p-1.5 rounded-lg shrink-0">
              <Phone className="text-white w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate max-w-[120px] sm:max-w-none">邀约话术助手</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl">
              <button 
                onClick={() => { setCustomerType('existing'); resetCall(); }}
                className={cn(
                  "px-2 sm:px-4 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all",
                  customerType === 'existing' ? "bg-white shadow-sm text-brand" : "text-gray-500 hover:text-gray-700"
                )}
              >
                保有潜客
              </button>
              <button 
                onClick={() => { setCustomerType('new'); resetCall(); }}
                className={cn(
                  "px-2 sm:px-4 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all",
                  customerType === 'new' ? "bg-white shadow-sm text-brand" : "text-gray-500 hover:text-gray-700"
                )}
              >
                首次邀约
              </button>
            </div>
            
            <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
            
            <div className="flex items-center gap-2">
              <button onClick={downloadTemplate} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-gray-500 hover:text-brand" title="下载模板">
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">下载模板</span>
              </button>
              
              <label className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-gray-500 hover:text-brand cursor-pointer" title="上传话术">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">上传话术</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:overflow-hidden">
        {/* Left: Chat History (WeChat Style) */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px] lg:min-h-0 h-[calc(100vh-120px)] lg:h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Chat Header */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-bold text-gray-600">通话模拟中</span>
              </div>
              {isCallActive && (
                <button onClick={resetCall} className="text-[10px] font-bold text-red-500 hover:underline">重置对话</button>
              )}
            </div>

            {/* History Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#EDEDED]">
              {!isCallActive ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-light rounded-full flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-brand" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold mb-1">开始您的邀约</h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-6 max-w-[240px] sm:max-w-none">点击下方按钮，可点选客户反馈查看应对话术。</p>
                  <button 
                    onClick={startCall}
                    className="bg-brand hover:bg-brand-hover text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold shadow-lg shadow-brand-light transition-all active:scale-95"
                  >
                    开始邀约
                  </button>
                </div>
              ) : (
                history.map((msg, i) => (
                  <div key={i} className={cn("flex items-start gap-2 sm:gap-2.5", msg.role === 'agent' ? "flex-row" : "flex-row-reverse")}>
                    <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center shrink-0", msg.role === 'agent' ? "bg-brand" : "bg-white border border-gray-200")}>
                      {msg.role === 'agent' ? <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] sm:max-w-[80%] px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg text-xs sm:text-[14px] leading-relaxed shadow-sm",
                      msg.role === 'agent' ? "bg-white text-gray-800 rounded-tl-none" : "bg-[#95EC69] text-gray-800 rounded-tr-none"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Interaction Area (Customer Options) */}
            {isCallActive && (
              <div className="p-3 sm:p-4 bg-white border-t border-gray-100 shrink-0 space-y-3 sm:space-y-4">
                {/* Global Options */}
                {globalOptions.length > 0 && (
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-brand uppercase tracking-widest mb-2 flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 客户随时可能追问
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {globalOptions.map((option, idx) => (
                        <button
                          key={`global-${idx}`}
                          onClick={() => handleCustomerResponse(option)}
                          className="bg-brand-light hover:bg-brand/20 border border-brand/20 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-brand transition-all"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Step Options */}
                {currentStep && currentStep.id !== '全局问题' && currentStep.customerOptions.length > 0 && (
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">当前对话反馈</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {currentStep.customerOptions.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCustomerResponse(option)}
                          className="bg-white hover:bg-brand-light border-2 border-brand/10 hover:border-brand/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-gray-700 hover:text-brand transition-all shadow-sm"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isCallActive && (!currentStep || (currentStep.id !== '全局问题' && currentStep.customerOptions.length === 0)) && (
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mx-auto mb-1" />
                <p className="font-bold text-gray-800 text-xs sm:text-sm">流程结束，邀约成功！</p>
                <button onClick={resetCall} className="mt-2 text-brand text-[10px] sm:text-xs font-bold hover:underline">重新开始</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Key Points Only */}
        <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6 min-h-0">
          {/* Points Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 flex flex-col h-full max-h-[400px] lg:max-h-none">
            <div className="flex items-center gap-2 mb-4 sm:mb-6 shrink-0">
              <div className="bg-brand-light p-1.5 rounded-lg">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-800">当前阶段要点提示</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
              <div className="bg-brand-light rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-brand-light">
                <h4 className="text-[10px] sm:text-xs font-black text-brand uppercase tracking-widest mb-2 sm:mb-3">核心逻辑</h4>
                <p className="text-xs sm:text-sm font-bold text-gray-800 leading-relaxed">
                  {currentStepId === '开场白' && "建立信任，抛出利益点，争取30秒时间。"}
                  {currentStepId === '核心价值传递' && "强调权益力度，引导到店算账，避免死磕价格。"}
                  {currentStepId === '邀约成交' && "二选一锁定时间，利用盲盒等礼品增加吸引力。"}
                  {currentStepId === '结束' && "保持礼貌，为后续跟进留好伏笔。"}
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">实战建议</h4>
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <RefreshCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed">如果客户犹豫，可以强调“名额有限”和“老客户优先”的紧迫感。</p>
                  </div>
                  <div className="flex gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed">当客户对比竞品时，重点引导其亲自感受内饰质感和底盘调校。</p>
                  </div>
                  <div className="flex gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed">始终保持积极乐观的情绪价值，让客户感受到您的专业与热情。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100 shrink-0">
              <div className="bg-gray-900 rounded-xl p-3 sm:p-4 text-white">
                <p className="text-[9px] sm:text-[10px] font-black text-brand uppercase tracking-widest mb-0.5 sm:mb-1">当前阶段</p>
                <p className="text-xs sm:text-sm font-bold">{currentStep?.phase || '准备中'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
