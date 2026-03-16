import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, RotateCcw } from 'lucide-react';
import { FAQ_MENU } from './faqData';
import { cn } from './utils';

interface FaqPanelProps {
  onFaqClick: (question: string, level1Label: string, level2Label?: string) => void;
}

export default function FaqPanel({ onFaqClick }: FaqPanelProps) {
  const [expandedLevel1, setExpandedLevel1] = useState<string | null>(null);
  const [expandedLevel2, setExpandedLevel2] = useState<string | null>(null);

  return (
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
                                    onClick={() => onFaqClick(btn, item.label, child.label)}
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
                        onClick={() => onFaqClick(btn, item.label)}
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
  );
}
