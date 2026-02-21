
import React, { useState, useRef, useEffect } from 'react';
import { CALL_FLOW_CONFIG as INITIAL_FLOW, CAR_SERIES, ABNORMAL_SCENARIOS, CallOutcome, QUICK_RESPONSES as INITIAL_QUICK } from '../constants';
import { CallStage, ScriptButton, NeedQuestion } from '../types';
import { generateSummaryEnhancement } from '../services/geminiService';
import { 
  Phone, User, RotateCcw, MessageCircle, 
  HelpCircle, Loader2, Sparkles, 
  Smile, Search, Zap, CalendarCheck, 
  History, ClipboardCheck, ChevronLeft, Copy, Check, AlertCircle, Calendar, UserX, Settings, Upload, FileText, X, Download
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  'Smile': Smile, 'Search': Search, 'Zap': Zap, 'CalendarCheck': CalendarCheck, 'HelpCircle': HelpCircle
};

const Copilot: React.FC = () => {
  // --- 状态管理 ---
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'先生'|'女士'|'未知'>('先生');
  const [series, setSeries] = useState('');
  const [needs, setNeeds] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [amsResult, setAmsResult] = useState<{profile: string, record: string, plan: string} | null>(null);
  const [viewMode, setViewMode] = useState<'LOG' | 'AMS' | 'CONFIG'>('LOG');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CallOutcome>('UNDECIDED');
  
  const [dynamicFlow, setDynamicFlow] = useState(() => {
    const saved = localStorage.getItem('audi_copilot_flow');
    return saved ? JSON.parse(saved) : INITIAL_FLOW;
  });
  const [dynamicQuick, setDynamicQuick] = useState(() => {
    const saved = localStorage.getItem('audi_copilot_quick');
    return saved ? JSON.parse(saved) : INITIAL_QUICK;
  });
  const [csvContent, setCsvContent] = useState(() => {
    return localStorage.getItem('audi_copilot_csv') || '';
  });
  const [isLiveEdit, setIsLiveEdit] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [activeCategoryByStage, setActiveCategoryByStage] = useState<Record<number, string>>({});
  const [activeScript, setActiveScript] = useState('');

  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  useEffect(() => {
    const firstStage = dynamicFlow[currentStageIdx] || dynamicFlow[0];
    if (firstStage) {
      if (firstStage.stage === CallStage.DISCOVERY) {
        const firstItem = firstStage.items[0] as NeedQuestion;
        if (firstItem) setActiveScript(firstItem.scriptHint);
      } else {
        const firstItem = firstStage.items[0] as ScriptButton;
        if (firstItem) setActiveScript(firstItem.content.replace(/{Name}/g, name || '客户'));
      }
    }
  }, [dynamicFlow, name, currentStageIdx]);

  const addLog = (text: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => prev + `[${time}] ${text}\n`);
  };

  const handleDownloadTemplate = () => {
    const headers = "类型,分组ID,分类,标题_问题,内容_回答,日志摘要,适用车型\n";
    const examples = [
      "话术,OPENING,,标准开场,您好{Name}，我是奥迪体验官。E5实车到店了特邀您品鉴。,执行：标准开场,Audi E5",
      "话术,DISCOVERY,,谁开/怎么用?,(引导语)这车买回去主要是您自己代步还是全家出行?,询问：用车场景,通用",
      "话术,PITCH,座舱交互,59寸大屏,那您一定得看看这个59寸5K大屏，副驾娱乐主驾互不干扰。,推介：59寸大屏,Audi E5",
      "话术,OFFER,,限时权益,现在的预售权益只剩最后几名了，建议您尽快锁定。,执行：权益逼单,Audi E5",
      "急救包,PRICE,,太贵了,一分钱一分货。E5是原生纯电平台，核心成本都在三电系统上。,异议处理：价格太贵,通用"
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + headers + examples], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "话术导入模板_AudiCopilot.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadCurrentToCsv = () => {
    const headers = "类型,分组ID,分类,标题_问题,内容_回答,日志摘要,适用车型\n";
    const rows: string[] = [];
    
    dynamicFlow.forEach((stage: any) => {
      if (stage.stage === CallStage.DISCOVERY) {
         const q = stage.items[0] as NeedQuestion;
         if (q) {
           rows.push(`话术,${stage.stage},,${q.question},${q.scriptHint},,通用`);
         }
      } else {
         stage.items.forEach((item: ScriptButton) => {
           rows.push(`话术,${stage.stage},${item.category || ''},${item.label},${item.content},${item.logSummary},通用`);
         });
      }
    });

    dynamicQuick.forEach((q: any) => {
      rows.push(`急救包,${q.category || ''},,${q.question},${q.answer},,${q.models?.join(';') || '通用'}`);
    });

    const newCsv = headers + rows.join('\n');
    setCsvContent(newCsv);
    localStorage.setItem('audi_copilot_csv', newCsv);
  };

  const resetToDefault = () => {
    if (window.confirm('确定要恢复默认话术吗？这将清除所有自定义配置。')) {
      setDynamicFlow(INITIAL_FLOW);
      setDynamicQuick(INITIAL_QUICK);
      setCsvContent('');
      localStorage.removeItem('audi_copilot_flow');
      localStorage.removeItem('audi_copilot_quick');
      localStorage.removeItem('audi_copilot_csv');
    }
  };

  const parseAndApplyCSV = (content: string, silent: boolean = false) => {
    if (!content.trim()) return;
    try {
      const lines = content.trim().split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) return;

      const newQuick: any[] = [];
      const updatedFlow = JSON.parse(JSON.stringify(INITIAL_FLOW));

      // Check which stages are in the CSV
      const stagesInCsv = new Set();
      let hasQuick = false;
      lines.forEach((line, index) => {
        if (index === 0) return;
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s?.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
           const [type, groupId] = cols;
           if (type === '话术' || type?.toUpperCase() === 'SCRIPT') {
             stagesInCsv.add(groupId?.toUpperCase());
           }
           if (type === '急救包' || type?.toUpperCase() === 'QUICK') {
             hasQuick = true;
           }
        }
      });

      // Only clear stages that are present in the CSV
      updatedFlow.forEach((stage: any) => {
        if (stagesInCsv.has(stage.stage)) {
          stage.items = [];
        }
      });

      lines.forEach((line, index) => {
        if (index === 0) return; // 跳过表头
        
        // 使用正则处理 CSV，防止内容中包含逗号导致分割错误
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s?.trim().replace(/^"|"$/g, ''));
        if (cols.length < 4) return;

        const [type, groupId, category, title, scriptText, logText, carModel] = cols;
        
        // 兼容中英文关键词
        const isQuick = type === '急救包' || type?.toUpperCase() === 'QUICK';
        const isScript = type === '话术' || type?.toUpperCase() === 'SCRIPT';

        if (isQuick) {
          newQuick.push({
            id: `csv_q_${index}`,
            category: category || groupId, // Use category if provided, else fallback to groupId
            question: title,
            answer: scriptText,
            models: carModel ? [carModel] : []
          });
        } else if (isScript) {
          const targetStage = groupId?.toUpperCase();
          const stageIdx = updatedFlow.findIndex((s: any) => 
            s.stage === targetStage || 
            (targetStage === 'PITCH' && s.stage === CallStage.PITCH) || 
            (targetStage === 'OFFER' && s.stage === CallStage.OFFER) ||
            (targetStage === 'OPENING' && s.stage === CallStage.OPENING) ||
            (targetStage === 'DISCOVERY' && s.stage === CallStage.DISCOVERY) ||
            (targetStage === 'CLOSING' && s.stage === CallStage.CLOSING)
          );

          if (stageIdx > -1) {
            updatedFlow[stageIdx].items.push({
              id: `csv_s_${index}`,
              label: title,
              content: scriptText,
              category: category,
              logSummary: logText || `推介：${title}`
            });
          }
        }
      });

      const totalImported = newQuick.length + updatedFlow.reduce((acc: number, s: any) => acc + (stagesInCsv.has(s.stage) ? s.items.length : 0), 0);
      
      if (totalImported === 0) {
        if (!silent) alert('导入失败：未识别到有效的话术行。请检查文件编码是否为 UTF-8，且第一列是否为“话术”或“急救包”。');
        return;
      }

      setDynamicFlow(updatedFlow);
      localStorage.setItem('audi_copilot_flow', JSON.stringify(updatedFlow));
      
      if (hasQuick || content.includes('急救包') || content.includes('QUICK')) {
        setDynamicQuick(newQuick);
        localStorage.setItem('audi_copilot_quick', JSON.stringify(newQuick));
      }
      
      localStorage.setItem('audi_copilot_csv', content);
      
      if (!silent) {
        setViewMode('LOG');
        alert(`成功导入 ${totalImported} 条话术！`);
      }
    } catch (e) {
      console.error(e);
      if (!silent) alert('导入失败，请检查 CSV 格式。');
    }
  };

  const handleImportText = () => parseAndApplyCSV(csvContent, false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      localStorage.setItem('audi_copilot_csv', text);
      parseAndApplyCSV(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStepClick = (stageIdx: number, item: any, isFeedback: boolean = false) => {
    setCurrentStageIdx(stageIdx);
    if (isFeedback) {
      addLog(`[反馈] ${item.label || item.question}`);
      if (stageIdx < dynamicFlow.length - 1) {
        const nextStage = dynamicFlow[stageIdx + 1];
        if (nextStage.stage === CallStage.DISCOVERY) {
           setActiveScript((nextStage.items[0] as NeedQuestion).scriptHint);
        } else {
           setActiveScript((nextStage.items[0] as ScriptButton).content.replace(/{Name}/g, name || '客户'));
        }
      }
    } else {
      setActiveScript(item.content.replace(/{Name}/g, name || '客户'));
      addLog(`[使用话术] ${item.label}`);
    }
  };

  const handleGenerateAMS = async () => {
    if (!logs.trim()) { alert('当前没有操作轨迹'); return; }
    if (!phone.trim()) { alert('请输入客户电话'); return; }
    setIsGenerating(true);
    try {
      const result = await generateSummaryEnhancement({ phone, name, gender, series, needs, logs, outcome });
      setAmsResult(result);
      setViewMode('AMS');
    } catch (err) { alert('生成失败'); } finally { setIsGenerating(false); }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col p-4 bg-[#F5F4F8] text-[#3F3F46] overflow-hidden">
      
      {/* 1. 顶部巨型提词器 & 异议处理 */}
      <div className="w-full mb-4 flex gap-4 h-[200px] shrink-0">
        {/* 左侧：实时推荐引导话术 (60%) */}
        <div className={`${dynamicQuick.length > 0 ? 'w-[60%]' : 'w-full'} bg-white rounded-2xl p-6 shadow-md border-l-[6px] border-l-purple-600 border-y border-r border-[#E4E4E7] relative overflow-hidden flex flex-col`}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2 text-purple-600 font-black uppercase text-[10px] tracking-[0.3em]">
              <MessageCircle size={14} /> 实时推荐引导话术
            </div>
            <div className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold">
              {dynamicFlow[currentStageIdx]?.title || '准备就绪'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
            <div className="text-2xl md:text-3xl font-bold leading-snug text-[#18181B] italic transition-all duration-300">
              "{activeScript || '等待呼叫开始...'}"
            </div>
          </div>
          <Sparkles className="absolute -right-4 -bottom-4 text-purple-50 size-24 opacity-50 pointer-events-none" />
        </div>

        {/* 右侧：异议处理 (40%) */}
        {dynamicQuick.length > 0 && (
          <div className="w-[40%] bg-white rounded-2xl border border-rose-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-rose-100 flex items-center justify-between bg-rose-50 rounded-t-2xl shrink-0">
              <div className="flex items-center font-bold text-xs text-rose-700">
                <AlertCircle size={16} className="mr-2" />
                异议处理
              </div>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {(() => {
                const quickCategories = Array.from(new Set(dynamicQuick.map((q: any) => q.category).filter(Boolean))) as string[];
                const activeQuickCat = activeCategoryByStage[-1] || quickCategories[0];
                return (
                  <div className="space-y-3">
                    {quickCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-rose-50">
                        {quickCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategoryByStage({...activeCategoryByStage, [-1]: cat})}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${activeQuickCat === cat ? 'bg-rose-500 border-rose-600 text-white shadow-sm' : 'bg-white border-rose-100 text-rose-600 hover:border-rose-300'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {dynamicQuick
                        .filter((q: any) => !quickCategories.length || !q.category || q.category === activeQuickCat)
                        .map((q: any) => (
                        <button 
                          key={q.id} 
                          onClick={() => {
                            setActiveScript(q.answer.replace(/{Name}/g, name || '客户'));
                            addLog(`[异议处理] ${q.question}`);
                          }} 
                          className={`group p-3 rounded-xl text-left transition-all border ${activeScript.includes(q.answer.substring(0,8)) ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-100' : 'bg-white border-rose-100 hover:bg-rose-50'}`}
                        >
                           <div className="font-bold text-rose-700 text-xs mb-1">{q.question}</div>
                           <div className="text-[10px] text-rose-500/80 line-clamp-2 italic">"{q.answer}"</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* 左侧：话术交互 */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E4E4E7] flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 bg-[#F4F4F5] px-3 py-2 rounded-xl flex-1 max-w-[140px]">
              <User size={16} className="text-[#A1A1AA]" />
              <input className="bg-transparent w-full outline-none font-bold text-[#3F3F46]" placeholder="客户姓氏" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex gap-1 p-1 bg-[#F4F4F5] rounded-xl">
               {['先生', '女士'].map((g: any) => (
                 <button key={g} onClick={() => setGender(g)} className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${gender === g ? 'bg-white text-purple-600 shadow-sm' : 'text-[#A1A1AA]'}`}>{g}</button>
               ))}
            </div>
            <div className="flex items-center gap-2 bg-[#F4F4F5] px-3 py-2 rounded-xl flex-1">
              <Phone size={16} className="text-[#A1A1AA]" />
              <input className="bg-transparent w-full outline-none font-mono font-bold text-[#3F3F46]" placeholder="电话号码..." value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <select value={series} onChange={e => setSeries(e.target.value)} className="bg-purple-50 text-purple-700 font-bold px-4 py-2 rounded-xl outline-none border border-purple-100 cursor-pointer">
              <option value="">咨询车型</option>
              {CAR_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-10 custom-scrollbar">
            {dynamicFlow.map((stage: any, sIdx: number) => (
              <div key={stage.stage} className={`rounded-2xl border transition-all ${currentStageIdx === sIdx ? 'border-purple-300 bg-white shadow-md scale-[1.01]' : 'border-[#E4E4E7] bg-white opacity-60'}`}>
                <div className="px-5 py-3 border-b border-[#E4E4E7] flex items-center justify-between">
                  <div className="flex items-center font-bold text-sm text-[#18181B]">
                    {React.createElement(ICON_MAP[stage.icon as string] || HelpCircle, { size: 18, className: `mr-3 ${currentStageIdx === sIdx ? 'text-purple-600' : 'text-[#A1A1AA]'}` })}
                    {stage.title}
                  </div>
                </div>
                <div className="p-5">
                  {(() => {
                    const isDiscoveryWithQuestions = stage.stage === CallStage.DISCOVERY && stage.items.length > 0 && 'options' in stage.items[0];
                    if (isDiscoveryWithQuestions) {
                      return (
                        <div className="space-y-4">
                          {(stage.items as NeedQuestion[]).map(q => (
                            <div key={q.id} className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E4E4E7]/50">
                              <p className="text-xs font-bold text-[#3F3F46] mb-3 flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> 询问反馈：{q.question}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {q.options.map(opt => (
                                  <button 
                                    key={opt.value} 
                                    onClick={() => {
                                      setNeeds({...needs, [q.id]: opt.value});
                                      handleStepClick(sIdx, { label: `${q.question}:${opt.label}` }, true);
                                    }} 
                                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all border ${needs[q.id] === opt.value ? 'bg-purple-600 border-purple-700 text-white shadow-sm' : 'bg-white border-[#E4E4E7] text-[#71717A] hover:border-purple-300'}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    const categories = Array.from(new Set(stage.items.map((item: any) => item.category).filter(Boolean))) as string[];
                    const activeCat = activeCategoryByStage[sIdx] || categories[0];

                    return (
                      <div className="space-y-4">
                        {categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 pb-2 border-b border-[#F4F4F5]">
                            {categories.map(cat => (
                              <button
                                key={cat}
                                onClick={() => setActiveCategoryByStage({...activeCategoryByStage, [sIdx]: cat})}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeCat === cat ? 'bg-purple-500 border-purple-600 text-white shadow-sm' : 'bg-white border-[#E4E4E7] text-[#71717A] hover:border-purple-300'}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          {(stage.items as ScriptButton[])
                            .filter(btn => !categories.length || !btn.category || btn.category === activeCat)
                            .map(btn => (
                            <button 
                              key={btn.id} 
                              onClick={() => handleStepClick(sIdx, btn)} 
                              className={`group p-4 rounded-xl text-left transition-all border ${activeScript.includes(btn.content.substring(0,8)) ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-100' : 'bg-white border-[#E4E4E7] hover:bg-[#F4F4F5]'}`}
                            >
                               <div className="font-bold text-[#3F3F46] text-xs mb-1 truncate">{btn.label}</div>
                               <div className="text-[10px] text-[#A1A1AA] line-clamp-2 italic">"{btn.content}"</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧面板 */}
        <div className="w-[360px] flex flex-col gap-4 overflow-hidden">
          <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-sm flex flex-col overflow-hidden flex-1 min-h-0">
             <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#E4E4E7] flex justify-between items-center shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#71717A] flex items-center gap-1.5">
                  {viewMode === 'AMS' ? <ClipboardCheck size={14} /> : viewMode === 'CONFIG' ? <Settings size={14} /> : <History size={14} />}
                  {viewMode === 'AMS' ? 'AI 智能生成' : viewMode === 'CONFIG' ? '配置话术库' : '实时操作日志'}
                </span>
                <div className="flex gap-2">
                   {viewMode === 'CONFIG' && (
                     <button onClick={() => setViewMode('LOG')} className="p-1.5 text-[#A1A1AA] hover:bg-white rounded transition-all"><X size={14} /></button>
                   )}
                   <button onClick={() => setViewMode('CONFIG')} className={`p-1.5 rounded transition-all ${viewMode === 'CONFIG' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'text-[#A1A1AA] hover:bg-[#F4F4F5]'}`}>
                      <Upload size={14} />
                   </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {viewMode === 'CONFIG' ? (
                  <div className="h-full flex flex-col gap-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-purple-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-purple-50 transition-all group"
                    >
                      <div className="bg-purple-100 text-purple-600 p-3 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                        <FileText size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-[#3F3F46]">上传 CSV 话术文件</p>
                        <p className="text-[10px] text-[#A1A1AA] mt-1">请遵循模板定义的列名规范</p>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                    </div>

                    <button 
                      onClick={handleDownloadTemplate}
                      className="flex items-center justify-center gap-2 py-2 border border-[#E4E4E7] rounded-xl text-[10px] font-bold text-[#71717A] hover:bg-white hover:text-purple-600 transition-all shadow-sm"
                    >
                      <Download size={14} /> 下载话术导入模板
                    </button>

                    <div className="flex gap-2">
                      <button 
                        onClick={loadCurrentToCsv}
                        className="flex-1 flex items-center justify-center gap-2 py-2 border border-[#E4E4E7] rounded-xl text-[10px] font-bold text-[#71717A] hover:bg-white hover:text-purple-600 transition-all shadow-sm"
                      >
                        <Copy size={14} /> 加载当前话术到编辑器
                      </button>
                      <button 
                        onClick={resetToDefault}
                        className="flex-1 flex items-center justify-center gap-2 py-2 border border-[#E4E4E7] rounded-xl text-[10px] font-bold text-[#71717A] hover:bg-white hover:text-rose-600 transition-all shadow-sm"
                      >
                        <RotateCcw size={14} /> 恢复默认配置
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 flex-1 min-h-0">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">手动粘贴或编辑配置文本</p>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717A] cursor-pointer">
                          <input type="checkbox" checked={isLiveEdit} onChange={e => setIsLiveEdit(e.target.checked)} className="accent-purple-600" />
                          实时预览更改
                        </label>
                      </div>
                      <textarea 
                        value={csvContent} 
                        onChange={e => {
                          const val = e.target.value;
                          setCsvContent(val);
                          localStorage.setItem('audi_copilot_csv', val);
                          if (isLiveEdit) {
                            parseAndApplyCSV(val, true);
                          }
                        }}
                        placeholder="类型,分组ID,分类,标题_问题,内容_回答,日志摘要,适用车型..."
                        className="flex-1 w-full p-3 bg-[#F4F4F5] rounded-xl text-[10px] font-mono outline-none border border-[#E4E4E7] focus:border-purple-300 resize-none whitespace-pre"
                      />
                      {!isLiveEdit && (
                        <button onClick={handleImportText} className="w-full py-2.5 bg-[#18181B] text-white rounded-xl text-xs font-bold hover:bg-purple-900 transition-all flex items-center justify-center gap-2 shadow-sm">
                           <Zap size={14} /> 立即应用
                        </button>
                      )}
                    </div>
                  </div>
                ) : viewMode === 'LOG' ? (
                  <pre className="whitespace-pre-wrap font-mono text-[10px] text-[#A1A1AA] leading-loose italic">
                    {logs || '等待通话触发记录...'}
                    <div ref={logEndRef} />
                  </pre>
                ) : (
                  <div className="space-y-4">
                    {amsResult && [
                      { id: 'profile', title: '客户画像', val: amsResult.profile },
                      { id: 'record', title: '通话总结', val: amsResult.record },
                      { id: 'plan', title: '跟进计划', val: amsResult.plan }
                    ].map(card => (
                      <div key={card.id} className="bg-white p-3 rounded-xl border border-[#F4F4F5] relative group hover:border-purple-200 transition-all">
                         <div className="flex justify-between items-center mb-1.5">
                           <h4 className="text-[9px] font-black text-[#A1A1AA] uppercase tracking-wider">{card.title}</h4>
                           <button onClick={() => copyToClipboard(card.val || '', card.id)} className="p-1 text-[#D4D4D8] hover:text-purple-600 transition-all">
                             {copiedId === card.id ? <Check size={12} /> : <Copy size={12} />}
                           </button>
                         </div>
                         <p className="text-xs text-[#52525B] leading-relaxed">{card.val}</p>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             <div className="p-4 bg-white border-t border-[#F4F4F5] space-y-3 shrink-0">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">正常结案</span>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => { setOutcome('APPOINTED'); addLog('[结果] 预约进店'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${outcome === 'APPOINTED' ? 'bg-[#10B981] border-[#059669] text-white shadow-sm' : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7]'}`}>已约进店</button>
                     <button onClick={() => { setOutcome('UNDECIDED'); addLog('[结果] 待跟进'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${outcome === 'UNDECIDED' ? 'bg-[#F59E0B] border-[#D97706] text-white shadow-sm' : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7]'}`}>再看看</button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">异常结案 (秒挂/拒接)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ABNORMAL_SCENARIOS.map(ab => (
                      <button 
                        key={ab.id}
                        onClick={() => { setOutcome('NONE'); addLog(`[异常] ${ab.log}`); }}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border bg-[#F4F4F5] text-[#71717A] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200`}
                      >
                        {ab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleGenerateAMS}
                  disabled={isGenerating}
                  className={`w-full py-3.5 rounded-xl font-black text-xs tracking-widest uppercase shadow-md flex items-center justify-center gap-2 transition-all mt-2 ${
                    isGenerating ? 'bg-[#F4F4F5] text-[#D4D4D8]' : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                  }`}
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-purple-200" />}
                  智能生成 AMS 记录
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Copilot;
