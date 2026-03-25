import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HelpModal from '../HelpModal';
import FaqPanel from '../FaqPanel';
import ChatPanel from '../ChatPanel';
import CurrentStepInfo from '../CurrentStepInfo';
import HeaderToolbar from '../HeaderToolbar';
import CallStatusModal, { type CallStatus } from '../CallStatusModal';
import { useCallSimulation } from '../useCallSimulation';
import { useScriptManager } from '../useScriptManager';
import { useAuth } from '../auth/AuthContext';

export default function AppPage() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const {
    currentStep,
    history,
    isCallActive,
    globalOptions,
    startCall,
    resetCall,
    handleCustomerResponse,
    appendMessages,
  } = useCallSimulation(script);

  const handleCustomerTypeChange = (type: typeof customerType) => {
    setCustomerType(type);
    resetCall();
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 任务包 6：点击"结束并记录通话"→ 打开弹窗（不立刻重置）
  const handleEndAndRecord = () => {
    setSubmitError('');
    setIsStatusModalOpen(true);
  };

  // 真实写入：用户选择状态后 → POST /api/call-records → 成功才重置
  const handleStatusSelect = async (status: CallStatus) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/call-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId ?? '',
          storeId: user?.storeId ?? '',
          status,
          scenarioType: customerType,
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
        adminHref={user?.role === 'super_admin' ? '/admin' : undefined}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:overflow-hidden">
        <ChatPanel
          isCallActive={isCallActive}
          history={history}
          currentStep={currentStep}
          globalOptions={globalOptions}
          hasScript={script.length > 0}
          onStartCall={startCall}
          onResetCall={resetCall}
          onCustomerResponse={handleCustomerResponse}
          onEndAndRecord={handleEndAndRecord}
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

