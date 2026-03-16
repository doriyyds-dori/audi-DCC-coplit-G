import { useRef, useEffect } from 'react';
import { Phone, User, Users, MessageSquare, CheckCircle2, Upload } from 'lucide-react';
import { ScriptStep, ScriptOption } from './types';
import { cn } from './utils';

export interface ChatMessage {
  role: 'agent' | 'customer';
  text: string;
}

interface ChatPanelProps {
  isCallActive: boolean;
  history: ChatMessage[];
  currentStep: ScriptStep | undefined;
  globalOptions: ScriptOption[];
  hasScript: boolean;
  onStartCall: () => void;
  onResetCall: () => void;
  onCustomerResponse: (option: ScriptOption) => void;
}

export default function ChatPanel({
  isCallActive,
  history,
  currentStep,
  globalOptions,
  hasScript,
  onStartCall,
  onResetCall,
  onCustomerResponse,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="lg:col-span-8 flex flex-col min-h-[500px] lg:min-h-0 h-[calc(100vh-120px)] lg:h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold text-gray-600">通话模拟中</span>
          </div>
          {isCallActive && (
            <button onClick={onResetCall} className="text-[10px] font-bold text-red-500 hover:underline">重置对话</button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#EDEDED]">
          {!isCallActive ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-light rounded-full flex items-center justify-center mb-4">
                {hasScript ? (
                  <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-brand" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-brand" />
                )}
              </div>
              {hasScript ? (
                <>
                  <h2 className="text-lg sm:text-xl font-bold mb-1">开始您的邀约</h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-6 max-w-[240px] sm:max-w-none">点击下方按钮，可点选客户反馈查看应对话术。</p>
                  <button 
                    onClick={onStartCall}
                    className="bg-brand hover:bg-brand-hover text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold shadow-lg shadow-brand-light transition-all active:scale-95"
                  >
                    开始邀约
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg sm:text-xl font-bold mb-1">暂无话术数据</h2>
                  <p className="text-gray-500 text-xs sm:text-sm max-w-[280px] sm:max-w-none">请先通过顶部「上传流程话术」按钮上传 CSV 话术文件，即可开始模拟通话。</p>
                </>
              )}
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
                      onClick={() => onCustomerResponse(option)}
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
                      onClick={() => onCustomerResponse(option)}
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
            <button onClick={onResetCall} className="mt-2 text-brand text-[10px] sm:text-xs font-bold hover:underline">重新开始</button>
          </div>
        )}
      </div>
    </div>
  );
}
