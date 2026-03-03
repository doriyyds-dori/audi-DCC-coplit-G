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
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  HelpCircle
} from 'lucide-react';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ScriptStep, CustomerType, ScriptOption, MenuItem } from './types';
import { DEFAULT_EXISTING_SCRIPT, CSV_TEMPLATE } from './constants';
import { DEFAULT_COMMON_FAQ } from './defaultFaqData';
import { FAQ_MENU } from './faqData';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [customerType, setCustomerType] = useState<CustomerType>('existing');
  const [existingScript, setExistingScript] = useState<ScriptStep[]>(() => {
    const saved = localStorage.getItem('existingScript');
    return saved ? JSON.parse(saved) : DEFAULT_EXISTING_SCRIPT;
  });
  const [newScript, setNewScript] = useState<ScriptStep[]>(() => {
    const saved = localStorage.getItem('newScript');
    return saved ? JSON.parse(saved) : [];
  });
  const [commonFaqScript, setCommonFaqScript] = useState<ScriptStep[]>(() => {
    const saved = localStorage.getItem('commonFaqScript');
    return saved ? JSON.parse(saved) : DEFAULT_COMMON_FAQ;
  });
  const [globalOptions, setGlobalOptions] = useState<ScriptOption[]>([]);

  // Persistence logic
  useEffect(() => {
    localStorage.setItem('existingScript', JSON.stringify(existingScript));
  }, [existingScript]);

  useEffect(() => {
    localStorage.setItem('newScript', JSON.stringify(newScript));
  }, [newScript]);

  useEffect(() => {
    localStorage.setItem('commonFaqScript', JSON.stringify(commonFaqScript));
  }, [commonFaqScript]);

  const [currentStepId, setCurrentStepId] = useState<string>('开场白');
  const [history, setHistory] = useState<{ role: 'agent' | 'customer', text: string }[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [expandedLevel1, setExpandedLevel1] = useState<string | null>(null);
  const [expandedLevel2, setExpandedLevel2] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const script = customerType === 'existing' ? existingScript : newScript;
  const currentStep = script.find(s => s.id === currentStepId) || script[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
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

  const handleFaqClick = (question: string, level1Label: string, level2Label?: string) => {
    // Matching logic:
    // 1. Exact match with "L1_L2_Question" (if L2 exists)
    // 2. Exact match with "L1_Question"
    // 3. Fuzzy match with "Question"
    const exactKeyWithL2 = level2Label ? `${level1Label}_${level2Label}_${question}` : null;
    const exactKeyL1 = `${level1Label}_${question}`;
    
    let foundOption: ScriptOption | undefined;
    
    const searchPools = [commonFaqScript, script];
    
    for (const pool of searchPools) {
      for (const step of pool) {
        // Try L1_L2_Q first
        if (exactKeyWithL2) {
          const exactL2 = step.customerOptions.find(opt => opt.label === exactKeyWithL2);
          if (exactL2) { foundOption = exactL2; break; }
        }
        // Then try L1_Q
        const exactL1 = step.customerOptions.find(opt => opt.label === exactKeyL1);
        if (exactL1) { foundOption = exactL1; break; }
      }
      if (foundOption) break;
    }

    if (!foundOption) {
      for (const pool of searchPools) {
        for (const step of pool) {
          const fuzzy = step.customerOptions.find(opt => opt.label.includes(question));
          if (fuzzy) {
            foundOption = fuzzy;
            break;
          }
        }
        if (foundOption) break;
      }
    }

    const newHistory = [...history];
    // Add customer's question to chat
    newHistory.push({ role: 'customer', text: question });
    
    if (foundOption) {
      // Add agent's response to chat
      newHistory.push({ role: 'agent', text: foundOption.agentResponse });
    } else {
      newHistory.push({ role: 'agent', text: '抱歉，该问题暂无录入话术' });
    }
    
    setHistory(newHistory);
  };

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'script_template.csv';
    link.click();
  };

  const downloadOfflineHtml = () => {
    // Check if running as a local file (offline)
    if (window.location.protocol === 'file:') {
      // In offline mode, we can't call the server API. 
      // Instead, we save the current DOM as a new HTML file.
      const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '邀约话术助手_离线更新版.html';
      link.click();
      URL.revokeObjectURL(url);
      alert('检测到您正在离线使用。已为您生成当前页面的快照文件。\n\n注意：如果您修改了话术，建议将此文件与 CSV 话术文件一同备份。');
    } else {
      // On the server, call the real backend API to get the bundled single file
      window.location.href = '/api/download-offline';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, target: 'existing' | 'new' | 'common' = 'existing') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadTarget = target === 'existing' ? (customerType === 'existing' ? 'existing' : 'new') : target;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const newSteps: ScriptStep[] = [];
        const phases = Array.from(new Set(data.map(d => d.Phase)));
        
        phases.forEach((phase, index) => {
          const phaseData = data.filter(d => d.Phase === phase);
          const stepId = phaseData[0].StepId || `step_${index}`;
          
          newSteps.push({
            id: stepId,
            phase: phase as string,
            coreLogic: phaseData[0].CoreLogic || '',
            agentScript: phaseData[0].AgentScript || (stepId === '全局问题' ? '（客户随时可能追问的问题）' : '请继续引导客户'),
            customerOptions: phaseData.map(d => ({
              label: d.CustomerOption,
              agentResponse: d.AgentResponse,
              nextStepId: d.NextStepId
            }))
          });
        });

        if (newSteps.length > 0) {
          if (uploadTarget === 'existing') {
            setExistingScript(newSteps);
            alert("保有潜客话术库更新成功！");
          } else if (uploadTarget === 'new') {
            setNewScript(newSteps);
            alert("首次邀约话术库更新成功！");
          } else if (uploadTarget === 'common') {
            setCommonFaqScript(newSteps);
            alert("常见问题通用话术库更新成功！两个模块均已生效。");
          }
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
              <button onClick={() => setIsHelpOpen(true)} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-blue-600 hover:text-blue-700" title="使用说明">
                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">使用说明</span>
              </button>

              <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

              <button onClick={() => {
                if(confirm('确定要重置所有话术吗？这将清除您上传的所有自定义内容并恢复到初始版本。')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-red-500 hover:text-red-600" title="重置系统">
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">重置系统</span>
              </button>
              
              <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

              <button onClick={downloadOfflineHtml} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-emerald-600 hover:text-emerald-700" title="下载离线版">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">下载离线版</span>
              </button>

              <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

              <button onClick={downloadTemplate} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-gray-500 hover:text-brand" title="下载模板">
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">下载模板</span>
              </button>
              
              <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

              <label className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-brand hover:text-brand-hover cursor-pointer" title="上传常见话术">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">上传常见话术</span>
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'common')} />
              </label>

              <label className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-gray-500 hover:text-brand cursor-pointer" title="上传流程话术">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">上传流程话术</span>
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'existing')} />
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:overflow-hidden">
        {/* Left: Chat History */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px] lg:min-h-0 h-[calc(100vh-120px)] lg:h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-bold text-gray-600">通话模拟中</span>
              </div>
              {isCallActive && (
                <button onClick={resetCall} className="text-[10px] font-bold text-red-500 hover:underline">重置对话</button>
              )}
            </div>

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

            {isCallActive && (
              <div className="p-3 sm:p-4 bg-white border-t border-gray-100 shrink-0 space-y-3 sm:space-y-4">
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

        {/* Right: FAQ Menu & Current Step Info */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 h-[calc(100vh-120px)] lg:h-full">
          {/* FAQ Menu Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 shrink-0">
              <HelpCircle className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-gray-800">常见问题话术库</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {FAQ_MENU.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedLevel1(expandedLevel1 === item.id ? null : item.id)}
                    className={cn(
                      "w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold transition-colors",
                      expandedLevel1 === item.id ? "bg-brand text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span>{item.label}</span>
                    {expandedLevel1 === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {expandedLevel1 === item.id && (
                    <div className="bg-gray-50 p-1 space-y-1">
                      {/* Level 2 Children (only for 产品卖点) */}
                      {item.children ? (
                        <div className="grid grid-cols-2 gap-1">
                          {[...item.children]
                            .sort((a, b) => (a.id === expandedLevel2 ? -1 : b.id === expandedLevel2 ? 1 : 0))
                            .map((child) => (
                              <div 
                                key={child.id} 
                                className={cn(
                                  "border border-gray-200 rounded-md overflow-hidden bg-white flex flex-col transition-all duration-200",
                                  expandedLevel2 === child.id ? "col-span-2" : "col-span-1"
                                )}
                              >
                                <button
                                  onClick={() => setExpandedLevel2(expandedLevel2 === child.id ? null : child.id)}
                                  className={cn(
                                    "w-full px-2 py-1.5 flex items-center justify-between text-[10px] font-bold transition-colors",
                                    expandedLevel2 === child.id 
                                      ? "bg-brand-light text-brand" 
                                      : "bg-brand-light/50 text-brand/80 hover:bg-brand-light/80"
                                  )}
                                >
                                  <span className="truncate">{child.label}</span>
                                  {expandedLevel2 === child.id ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
                                </button>
                                
                                {expandedLevel2 === child.id && (
                                  <div className="p-1 bg-gray-50 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-1 mb-1">
                                      {child.buttons.map((btn, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleFaqClick(btn, item.label, child.label)}
                                          className="text-left px-2 py-1.5 bg-white border border-gray-200 rounded text-[10px] text-gray-700 hover:border-brand hover:text-brand transition-all shadow-sm leading-tight"
                                        >
                                          {btn}
                                        </button>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => setExpandedLevel2(null)}
                                      className="w-full text-center py-1 text-[9px] text-gray-400 hover:text-brand flex items-center justify-center gap-1"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" /> 返回
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        /* Level 2 Buttons (for others) */
                        <div className="p-1 grid grid-cols-2 gap-1.5">
                          {item.buttons?.map((btn, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFaqClick(btn, item.label)}
                              className="text-left px-2 py-2 bg-white border border-gray-200 rounded-md text-[10px] text-gray-700 hover:border-brand hover:text-brand transition-all shadow-sm leading-tight"
                            >
                              {btn}
                            </button>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => setExpandedLevel1(null)}
                        className="w-full text-center py-1.5 text-[10px] text-gray-400 hover:text-brand flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> 返回上一级
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Step Info Box */}
          <div className="bg-gray-900 rounded-2xl p-4 shadow-lg shrink-0 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-brand p-1 rounded-md">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">当前阶段</span>
              </div>
              <span className="text-xs font-bold text-white">{currentStep?.phase || '准备中'}</span>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
              <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">核心逻辑</h4>
              <p className="text-xs font-bold text-gray-200 leading-relaxed">
                {currentStep?.coreLogic || "暂无逻辑提示"}
              </p>
            </div>
          </div>
        </div>
      </main>
      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand text-white">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">邀约话术助手 - 使用手册</h2>
              </div>
              <button onClick={() => setIsHelpOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <RotateCcw className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto text-gray-600 space-y-8">
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand/10 text-brand rounded-full flex items-center justify-center text-sm">1</span>
                  快速上手指南
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="font-bold text-gray-800 mb-1 text-sm">主流程通话</p>
                    <p className="text-xs">选择左上角客户类型，跟随左侧建议话术。点击紫色按钮反馈，系统自动进入下一阶段。</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="font-bold text-gray-800 mb-1 text-sm">应对突发提问</p>
                    <p className="text-xs">客户问及价格、配置时，使用右侧FAQ菜单。三级分类精准定位，点击即出标准答案。</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand/10 text-brand rounded-full flex items-center justify-center text-sm">2</span>
                  话术编写规范 (CSV)
                </h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-brand pl-4 py-1">
                    <p className="text-sm font-bold text-gray-800">常见问题 (FAQ) 规范：</p>
                    <p className="text-xs mt-1">匹配键 (CustomerOption) 必须为 <b>一级分类_二级分类_问题</b> 格式。例如：<code className="bg-gray-100 px-1">产品卖点_外观_灯语</code></p>
                  </div>
                  <div className="border-l-4 border-emerald-500 pl-4 py-1">
                    <p className="text-sm font-bold text-gray-800">主流程规范：</p>
                    <p className="text-xs mt-1">通过 <b>StepId</b> 和 <b>NextStepId</b> 实现逻辑跳转。确保跳转目标ID在表格中真实存在。</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand/10 text-brand rounded-full flex items-center justify-center text-sm">3</span>
                  更新与分发流程
                </h3>
                <ol className="list-decimal list-inside text-sm space-y-2 ml-2">
                  <li>点击 <b>下载模板</b>，使用Excel编辑并保存为CSV格式。</li>
                  <li>点击 <b>上传常见话术</b> 或 <b>流程话术</b> 进行更新。</li>
                  <li>点击 <b>下载离线版</b> 生成最新的 HTML 独立文件。</li>
                  <li>将该文件发给团队成员，双击即可离线使用最新话术。</li>
                </ol>
              </section>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-amber-800 text-xs">
                <b>💡 核心提示：</b> 离线版具备“内置记忆”。主管更新后分发新文件，员工打开即是最新版。若需清空本地缓存，请点击红色的“重置系统”。
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsHelpOpen(false)} className="px-6 py-2 bg-brand text-white rounded-xl font-bold hover:bg-brand-hover transition-colors">
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
