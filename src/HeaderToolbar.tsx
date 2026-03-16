import React from 'react';
import { Phone, Download, Upload, RotateCcw, HelpCircle, FileText } from 'lucide-react';
import { CustomerType } from './types';
import { cn } from './utils';

interface HeaderToolbarProps {
  customerType: CustomerType;
  onCustomerTypeChange: (type: CustomerType) => void;
  onHelpOpen: () => void;
  onReset: () => void;
  onDownloadOffline: () => void;
  onDownloadTemplate: () => void;
  onUploadCommon: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadScript: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function HeaderToolbar({
  customerType,
  onCustomerTypeChange,
  onHelpOpen,
  onReset,
  onDownloadOffline,
  onDownloadTemplate,
  onUploadCommon,
  onUploadScript,
}: HeaderToolbarProps) {
  return (
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
              onClick={() => onCustomerTypeChange('existing')}
              className={cn(
                "px-2 sm:px-4 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all",
                customerType === 'existing' ? "bg-white shadow-sm text-brand" : "text-gray-500 hover:text-gray-700"
              )}
            >
              保有潜客
            </button>
            <button 
              onClick={() => onCustomerTypeChange('new')}
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
            <button onClick={onHelpOpen} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-blue-600 hover:text-blue-700" title="使用说明">
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">使用说明</span>
            </button>

            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

            <button onClick={onReset} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-red-500 hover:text-red-600" title="重置系统">
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">重置系统</span>
            </button>
            
            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

            <button onClick={onDownloadOffline} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-emerald-600 hover:text-emerald-700" title="下载离线版">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">下载离线版</span>
            </button>

            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

            <button onClick={onDownloadTemplate} className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-gray-500 hover:text-brand" title="下载模板">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">下载模板</span>
            </button>
            
            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

            <label className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-brand hover:text-brand-hover cursor-pointer" title="上传常见话术">
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">上传常见话术</span>
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { onUploadCommon(e); e.target.value = ''; }} />
            </label>

            <label className="p-1.5 sm:p-0 sm:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-gray-500 hover:text-brand cursor-pointer" title="上传流程话术">
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">上传流程话术</span>
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { onUploadScript(e); e.target.value = ''; }} />
            </label>
          </div>
        </div>
      </div>
    </header>
  );
}
