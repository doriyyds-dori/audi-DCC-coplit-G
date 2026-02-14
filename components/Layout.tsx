import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, MessageSquareText, ShieldCheck, Cpu } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Premium Dark Header */}
      <header className="bg-zinc-950 text-white h-14 px-6 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="font-black text-xl tracking-[0.2em] border-r border-zinc-700 pr-6">
            AUDI
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold tracking-widest uppercase">
            <Cpu size={14} className="text-zinc-500" />
            E5 Launch Copilot <span className="text-zinc-700">|</span> v2.0
          </div>
        </div>

        <nav className="flex bg-zinc-900 p-1 rounded-lg gap-1 border border-zinc-800">
          <button
            onClick={() => onChangeView(ViewState.COPILOT)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-black transition-all ${
              currentView === ViewState.COPILOT 
                ? 'bg-zinc-700 text-white shadow-inner' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquareText size={14} />
            销售辅助
          </button>
          <button
            onClick={() => onChangeView(ViewState.DOJO)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-black transition-all ${
              currentView === ViewState.DOJO 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ShieldCheck size={14} />
            AI 陪练
          </button>
          <button
            onClick={() => onChangeView(ViewState.DASHBOARD)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-black transition-all ${
              currentView === ViewState.DASHBOARD 
                ? 'bg-zinc-100 text-zinc-900' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutDashboard size={14} />
            数据看板
          </button>
        </nav>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded text-[10px] font-mono text-zinc-400 border border-zinc-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE_SYSTEM_SYNC
           </div>
        </div>
      </header>

      {/* Main Content Area with optimized padding */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;