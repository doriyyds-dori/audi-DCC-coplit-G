import { FileText } from 'lucide-react';
import { ScriptStep } from './types';

interface CurrentStepInfoProps {
  currentStep: ScriptStep | undefined;
}

export default function CurrentStepInfo({ currentStep }: CurrentStepInfoProps) {
  return (
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
  );
}
