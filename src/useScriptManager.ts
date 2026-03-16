import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { ScriptStep, CustomerType, ScriptOption, CsvRow } from './types';
import { DEFAULT_EXISTING_SCRIPT, CSV_TEMPLATE } from './constants';
import { DEFAULT_COMMON_FAQ } from './defaultFaqData';
import { safeParse, safeStringify, clearAll } from './storage';

/**
 * useScriptManager — 话术数据管理
 *
 * 管理：三套话术数据（保有潜客/首次邀约/FAQ）的加载、持久化、CSV 上传/下载
 * 不关心：UI 渲染、通话模拟流程
 */
export function useScriptManager() {
  const [customerType, setCustomerType] = useState<CustomerType>('existing');
  const [existingScript, setExistingScript] = useState<ScriptStep[]>(() =>
    safeParse('existingScript', DEFAULT_EXISTING_SCRIPT)
  );
  const [newScript, setNewScript] = useState<ScriptStep[]>(() =>
    safeParse('newScript', [] as ScriptStep[])
  );
  const [commonFaqScript, setCommonFaqScript] = useState<ScriptStep[]>(() =>
    safeParse('commonFaqScript', DEFAULT_COMMON_FAQ)
  );

  // 持久化
  useEffect(() => { safeStringify('existingScript', existingScript); }, [existingScript]);
  useEffect(() => { safeStringify('newScript', newScript); }, [newScript]);
  useEffect(() => { safeStringify('commonFaqScript', commonFaqScript); }, [commonFaqScript]);

  /** 当前活跃话术（根据客户类型切换） */
  const script = customerType === 'existing' ? existingScript : newScript;

  /** FAQ 搜索：精确匹配 → 模糊匹配 */
  const handleFaqClick = (
    question: string,
    level1Label: string,
    level2Label?: string,
  ) => {
    const exactKeyWithL2 = level2Label ? `${level1Label}_${level2Label}_${question}` : null;
    const exactKeyL1 = `${level1Label}_${question}`;
    
    let foundOption: ScriptOption | undefined;
    const searchPools = [commonFaqScript, script];
    
    for (const pool of searchPools) {
      for (const step of pool) {
        if (exactKeyWithL2) {
          const exactL2 = step.customerOptions.find(opt => opt.label === exactKeyWithL2);
          if (exactL2) { foundOption = exactL2; break; }
        }
        const exactL1 = step.customerOptions.find(opt => opt.label === exactKeyL1);
        if (exactL1) { foundOption = exactL1; break; }
      }
      if (foundOption) break;
    }

    if (!foundOption) {
      for (const pool of searchPools) {
        for (const step of pool) {
          const fuzzy = step.customerOptions.find(opt => opt.label.includes(question));
          if (fuzzy) { foundOption = fuzzy; break; }
        }
        if (foundOption) break;
      }
    }

    return foundOption;
  };

  /** CSV 上传解析 */
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'existing' | 'new' | 'common' = 'existing'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadTarget = target === 'existing'
      ? (customerType === 'existing' ? 'existing' : 'new')
      : target;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CsvRow[];
        const requiredColumns = ['Phase', 'StepId', 'CustomerOption', 'AgentResponse'];
        const actualColumns = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));
        if (missingColumns.length > 0) {
          alert(`CSV 格式错误！缺少必填列：${missingColumns.join('、')}\n\n请确保 CSV 包含以下列：Phase, StepId, CoreLogic, AgentScript, CustomerOption, AgentResponse, NextStepId\n\n提示：可点击"下载模板"获取正确格式。`);
          return;
        }

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

  /** CSV 模板下载 */
  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'script_template.csv';
    link.click();
  };

  /** 离线版下载 */
  const downloadOfflineHtml = () => {
    if (window.location.protocol === 'file:') {
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
      window.location.href = '/api/download-offline';
    }
  };

  /** 重置系统 */
  const handleReset = () => {
    if (confirm('确定要重置所有话术吗？这将清除您上传的所有自定义内容并恢复到初始版本。')) {
      clearAll();
      window.location.reload();
    }
  };

  return {
    customerType,
    setCustomerType,
    script,
    handleFaqClick,
    handleFileUpload,
    downloadTemplate,
    downloadOfflineHtml,
    handleReset,
  };
}
