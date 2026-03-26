import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HelpModal from '../HelpModal';
import FaqPanel from '../FaqPanel';
import ChatPanel from '../ChatPanel';
import CurrentStepInfo from '../CurrentStepInfo';
import HeaderToolbar from '../HeaderToolbar';
import CallStatusModal, { type CallStatus } from '../CallStatusModal';
import { useCallSimulation } from '../useCallSimulation';
import { useScriptManager, parseCsvToSteps } from '../useScriptManager';
import { useAuth } from '../auth/AuthContext';
import { Loader2 } from 'lucide-react';

// ============================================================
// 类型
// ============================================================

interface AvailableScript {
  scriptId: string;
  name: string;
  scenarioType: string;
  scope: 'global' | 'store';
}

// ============================================================
// 组件
// ============================================================

export default function AppPage() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();

  // ---- 话术来源选择 ----
  const [availableScripts, setAvailableScripts] = useState<AvailableScript[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [scriptsError, setScriptsError] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [scriptContentLoading, setScriptContentLoading] = useState(false);
  const [scriptContentError, setScriptContentError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const {
    customerType,
    setCustomerType,
    script,
    handleFaqClick,
    handleFileUpload,
    downloadTemplate,
    downloadOfflineHtml,
    handleReset,
  } = useScriptManager();

  // API 加载的脚本覆盖本地脚本
  const [apiScript, setApiScript] = useState<ReturnType<typeof parseCsvToSteps>>(null);
  const [apiScriptScope, setApiScriptScope] = useState<'global' | 'store'>('global');

  // 最终使用的话术：如果有 API 加载的脚本则优先使用，否则用本地
  const activeScript = apiScript || script;

  const {
    currentStep,
    history,
    isCallActive,
    globalOptions,
    conversationId,
    startCall,
    resetCall,
    handleCustomerResponse,
    appendMessages,
  } = useCallSimulation(activeScript);

  // ---- 话术反馈状态 ----
  const [feedbackMap, setFeedbackMap] = useState<Map<number, 'like' | 'dislike'>>(new Map());

  // conversationId 变化时重置反馈状态
  useEffect(() => {
    setFeedbackMap(new Map());
  }, [conversationId]);

  const handleFeedback = useCallback(async (messageIndex: number, feedbackType: 'like' | 'dislike', messageText: string) => {
    if (!conversationId || !selectedScriptId) return;
    // 乐观更新 UI
    setFeedbackMap(prev => {
      const next = new Map(prev);
      next.set(messageIndex, feedbackType);
      return next;
    });
    // 即时 POST
    try {
      const token = getToken();
      await fetch('/api/script-feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId,
          scriptId: selectedScriptId,
          feedbackType,
          messageIndex,
          messageText,
        }),
      });
    } catch {
      // 静默失败，不影响主流程
    }
  }, [conversationId, selectedScriptId, getToken]);

  // ---- 加载可用话术列表 ----
  useEffect(() => {
    const token = getToken();
    setScriptsLoading(true);
    setScriptsError('');

    fetch('/api/scripts/available', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          setAvailableScripts(json.scripts || []);
        } else {
          setScriptsError(json.error || '加载话术列表失败');
        }
      })
      .catch(() => setScriptsError('网络异常，话术列表加载失败'))
      .finally(() => setScriptsLoading(false));
  }, [getToken]);

  // 是否有多套同类型话术可选（需要显示选择器）
  const hasStoreScripts = availableScripts.some(s => s.scope === 'store');

  // 按当前 customerType 筛选可选话术
  const filteredScripts = availableScripts.filter(s => s.scenarioType === customerType);


  // ---- 加载选中话术的内容 ----
  const loadScriptContent = useCallback(async (scriptId: string) => {
    const token = getToken();
    setScriptContentLoading(true);
    setScriptContentError('');

    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setScriptContentError(json.error || '话术内容加载失败');
        return;
      }

      const steps = parseCsvToSteps(json.script.content);
      if (!steps) {
        setScriptContentError('话术内容格式异常，无法解析');
        return;
      }

      // 注入到 useScriptManager：根据 scenarioType 设置 existing 或 new
      const target = json.script.scenarioType === 'existing' ? 'existing' : 'new';
      // 创建一个模拟的 file upload event 来注入数据 — 但更直接的方式是
      // 使用 setCustomerType + 手动 setScript。由于 useScriptManager 不暴露
      // 直接 set，我们利用全局事件或重新构造。
      // 
      // 更简单的方案：直接通过 localStorage + reload 太重；
      // 最小方案：我们用一个 state 存 API 加载的脚本，覆盖 useScriptManager 的 script
      setApiScript(steps);
      setApiScriptScope(json.script.scope);
    } catch {
      setScriptContentError('网络异常，话术内容加载失败');
    } finally {
      setScriptContentLoading(false);
    }
  }, [getToken]);

  // 自动选中默认话术：加载完成后自动选中当前 scenarioType 的第一个 global 脚本
  useEffect(() => {
    if (availableScripts.length === 0 || selectedScriptId) return;
    const defaultGlobal = availableScripts.find(s => s.scope === 'global' && s.scenarioType === customerType);
    if (defaultGlobal) {
      setSelectedScriptId(defaultGlobal.scriptId);
      loadScriptContent(defaultGlobal.scriptId);
    }
  }, [availableScripts, customerType, selectedScriptId, loadScriptContent]);


  // 选择话术来源
  const handleScriptSelect = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    setApiScript(null); // 清除上一次加载
    resetCall();
    loadScriptContent(scriptId);
  };

  const handleCustomerTypeChange = (type: typeof customerType) => {
    setCustomerType(type);
    setSelectedScriptId('');
    setApiScript(null);
    resetCall();
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleEndAndRecord = () => {
    setSubmitError('');
    setIsStatusModalOpen(true);
  };

  const handleStatusSelect = async (status: CallStatus) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const token = getToken();
      const res = await fetch('/api/call-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status,
          scenarioType: customerType,
          ...(selectedScriptId ? { scriptId: selectedScriptId } : {}),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        resetCall();
        setIsStatusModalOpen(false);
      } else {
        setSubmitError(data.error || '记录保存失败，请重试');
      }
    } catch {
      setSubmitError('网络异常，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFaqClick = (question: string, level1Label: string, level2Label?: string) => {
    const foundOption = handleFaqClick(question, level1Label, level2Label);
    appendMessages(
      { role: 'customer', text: question },
      { role: 'agent', text: foundOption?.agentResponse || '抱歉，该问题暂无录入话术' }
    );
  };

  // ---- 话术来源选择器渲染 ----
  const renderScriptSelector = () => {
    // 加载中
    if (scriptsLoading) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100">
          <Loader2 className="w-4 h-4 text-brand animate-spin" />
          <span className="text-xs text-gray-400">加载话术列表…</span>
        </div>
      );
    }

    // 加载失败
    if (scriptsError) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100">
          <span className="text-xs text-red-500">{scriptsError}</span>
          <button onClick={() => window.location.reload()} className="text-xs text-brand font-bold hover:underline ml-2">
            重试
          </button>
        </div>
      );
    }

    // 没有门店自定义话术，不显示选择器
    if (!hasStoreScripts) return null;

    // 当前场景下的可选话术
    if (filteredScripts.length === 0) return null;

    // 按 scope 分组：当前 scenarioType 下的 global 和 store 话术
    const globalScript = filteredScripts.find(s => s.scope === 'global');
    const storeScript = filteredScripts.find(s => s.scope === 'store');

    // 当前选中的来源类型
    const selectedScope = selectedScriptId
      ? availableScripts.find(s => s.scriptId === selectedScriptId)?.scope || 'global'
      : 'global';

    const handleScopeSelect = (scope: 'global' | 'store') => {
      const target = scope === 'global' ? globalScript : storeScript;
      if (target) handleScriptSelect(target.scriptId);
    };

    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100">
        <span className="text-xs text-gray-500 shrink-0">话术来源：</span>
        <div className="flex gap-2">
          {globalScript && (
            <button
              onClick={() => handleScopeSelect('global')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedScope === 'global'
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              统一话术
            </button>
          )}
          {storeScript && (
            <button
              onClick={() => handleScopeSelect('store')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedScope === 'store'
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              自定义话术
            </button>
          )}
        </div>
        {scriptContentLoading && (
          <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
            <Loader2 className="w-3 h-3 animate-spin" /> 加载中…
          </span>
        )}
        {scriptContentError && (
          <span className="text-xs text-red-500 ml-2">{scriptContentError}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F5F7F9] text-[#1A1A1A] font-sans overflow-x-hidden lg:overflow-hidden">
      <HeaderToolbar
        customerType={customerType}
        onCustomerTypeChange={handleCustomerTypeChange}
        onHelpOpen={() => setIsHelpOpen(true)}
        onReset={handleReset}
        onDownloadOffline={downloadOfflineHtml}
        onDownloadTemplate={downloadTemplate}
        onUploadCommon={(e) => handleFileUpload(e, 'common')}
        onUploadScript={(e) => handleFileUpload(e, 'existing')}
        displayName={user?.displayName}
        onLogout={handleLogout}
        adminHref={user?.role === 'super_admin' || user?.role === 'store_admin' ? '/admin' : undefined}
      />

      {renderScriptSelector()}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:overflow-hidden">
        <ChatPanel
          isCallActive={isCallActive}
          history={history}
          currentStep={currentStep}
          globalOptions={globalOptions}
          hasScript={activeScript.length > 0}
          onStartCall={startCall}
          onResetCall={resetCall}
          onCustomerResponse={handleCustomerResponse}
          onEndAndRecord={handleEndAndRecord}
          onFeedback={handleFeedback}
          feedbackMap={feedbackMap}
        />

        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 h-[calc(100vh-120px)] lg:h-full">
          <FaqPanel onFaqClick={onFaqClick} />
          <CurrentStepInfo currentStep={currentStep} />
        </div>
      </main>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <CallStatusModal isOpen={isStatusModalOpen} onSelect={handleStatusSelect} errorMessage={submitError} disabled={isSubmitting} />
    </div>
  );
}
