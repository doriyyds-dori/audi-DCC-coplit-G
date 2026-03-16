import { useState } from 'react';
import HelpModal from './HelpModal';
import FaqPanel from './FaqPanel';
import ChatPanel from './ChatPanel';
import CurrentStepInfo from './CurrentStepInfo';
import HeaderToolbar from './HeaderToolbar';
import { useCallSimulation } from './useCallSimulation';
import { useScriptManager } from './useScriptManager';

export default function App() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
        />

        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 h-[calc(100vh-120px)] lg:h-full">
          <FaqPanel onFaqClick={onFaqClick} />
          <CurrentStepInfo currentStep={currentStep} />
        </div>
      </main>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
