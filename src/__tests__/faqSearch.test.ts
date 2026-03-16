import { describe, it, expect } from 'vitest';

/**
 * 测试 FAQ 搜索逻辑（从 useScriptManager 中提取的纯函数版本）
 * 
 * 搜索优先级：
 * 1. L1_L2_Question 精确匹配
 * 2. L1_Question 精确匹配
 * 3. Question 模糊匹配（includes）
 */

import { ScriptStep, ScriptOption } from '../types';

// 提取纯函数用于测试（与 useScriptManager 中的逻辑一致）
function findFaqOption(
  question: string,
  level1Label: string,
  searchPools: ScriptStep[][],
  level2Label?: string,
): ScriptOption | undefined {
  const exactKeyWithL2 = level2Label ? `${level1Label}_${level2Label}_${question}` : null;
  const exactKeyL1 = `${level1Label}_${question}`;
  
  let foundOption: ScriptOption | undefined;
  
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
}

const mockScript: ScriptStep[] = [
  {
    id: 'faq',
    phase: 'FAQ',
    agentScript: '',
    customerOptions: [
      { label: '保险_车险_保费多少', agentResponse: '保费根据车型不同', nextStepId: '' },
      { label: '保险_保费多少', agentResponse: '请联系保险部门', nextStepId: '' },
      { label: '常见问题_保费多少', agentResponse: '一般在5000到8000元之间', nextStepId: '' },
    ],
  },
];

const mockCommon: ScriptStep[] = [
  {
    id: 'common',
    phase: '通用',
    agentScript: '',
    customerOptions: [
      { label: '通用_发票', agentResponse: '发票可以在提车时开具', nextStepId: '' },
    ],
  },
];

describe('FAQ 搜索逻辑', () => {
  it('L1_L2_Q 精确匹配优先', () => {
    const result = findFaqOption('保费多少', '保险', [mockScript], '车险');
    expect(result?.agentResponse).toBe('保费根据车型不同');
  });

  it('L1_Q 精确匹配次优先', () => {
    const result = findFaqOption('保费多少', '保险', [mockScript]);
    expect(result?.agentResponse).toBe('请联系保险部门');
  });

  it('模糊匹配兜底', () => {
    const result = findFaqOption('发票', '不存在的分类', [mockCommon]);
    expect(result?.agentResponse).toBe('发票可以在提车时开具');
  });

  it('两个 pool 按顺序搜索（commonFaq 优先）', () => {
    // common 没有保费相关，script 有
    const result = findFaqOption('保费多少', '常见问题', [mockCommon, mockScript]);
    expect(result?.agentResponse).toBe('一般在5000到8000元之间');
  });

  it('无匹配返回 undefined', () => {
    const result = findFaqOption('不存在的问题xyz', '不存在', [mockScript, mockCommon]);
    expect(result).toBeUndefined();
  });
});
