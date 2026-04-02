import Papa from 'papaparse';

const REQUIRED_COLUMNS = ['Phase', 'StepId', 'CustomerOption', 'AgentResponse'];

export interface CsvValidationResult {
  valid: boolean;
  stepCount: number;
  firstOpening: string;
  errors: string[];
  phases: string[];
}

/** 列名中文说明映射 */
const COLUMN_LABEL: Record<string, string> = {
  Phase: '步骤阶段名（Phase）',
  StepId: '步骤编号（StepId）',
  CustomerOption: '客户可能的回答（CustomerOption）',
  AgentResponse: '顾问应对话术（AgentResponse）',
};

/**
 * 校验 CSV 话术内容并返回解析预览信息。
 * 复用与 parseCsvToSteps 相同的解析逻辑。
 */
export function validateScriptCsv(csvText: string): CsvValidationResult {
  const empty: CsvValidationResult = { valid: false, stepCount: 0, firstOpening: '', errors: [], phases: [] };

  if (!csvText || !csvText.trim()) {
    return { ...empty, errors: ['话术内容不能为空，请粘贴 CSV 格式的话术数据'] };
  }

  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });

  // 检查解析错误
  if (result.errors.length > 0) {
    const errs = result.errors.slice(0, 3).map(e => {
      const row = (e.row ?? 0) + 2;
      return `第 ${row} 行格式有误：${e.message}（请检查该行的逗号分隔是否正确）`;
    });
    return { ...empty, errors: ['CSV 格式解析失败，请检查是否为标准逗号分隔格式', ...errs] };
  }

  // 检查必填列
  const actualColumns = result.meta.fields || [];
  const missingColumns = REQUIRED_COLUMNS.filter(col => !actualColumns.includes(col));
  if (missingColumns.length > 0) {
    const readable = missingColumns.map(c => COLUMN_LABEL[c] || c);
    return { ...empty, errors: [
      `缺少必填列：${readable.join('、')}`,
      '请确保 CSV 第一行包含以下表头：Phase, StepId, CustomerOption, AgentResponse',
      '提示：可参考下方"标准示例"获取正确格式',
    ]};
  }

  const data = result.data;
  if (data.length === 0) {
    return { ...empty, errors: ['CSV 只有表头没有数据行，请在表头下方添加话术内容'] };
  }

  // 解析步骤
  const phases = Array.from(new Set(data.map(d => d.Phase).filter(Boolean)));
  if (phases.length === 0) {
    return { ...empty, errors: ['Phase（步骤阶段名）列全部为空，无法识别话术步骤', '请在 Phase 列填写步骤名称，例如"开场白"、"了解需求"等'] };
  }

  // 提取第一条开场白
  const firstRow = data[0];
  const firstOpening = firstRow?.AgentResponse || firstRow?.CustomerOption || '（未识别到开场白）';

  return {
    valid: true,
    stepCount: phases.length,
    firstOpening: firstOpening.length > 80 ? firstOpening.slice(0, 80) + '…' : firstOpening,
    errors: [],
    phases,
  };
}

/**
 * CSV 标准示例（最小可用）
 */
export const CSV_EXAMPLE = `Phase,StepId,CoreLogic,AgentScript,CustomerOption,AgentResponse,NextStepId
开场白,step_open,礼貌开场,您好请问是XX先生/女士吗？我是XX品牌的邀约顾问,客户说是的,太好了！我们本周末有一场新车品鉴会想邀请您参加,了解需求
开场白,step_open,,,客户说不方便,好的打扰了祝您生活愉快,结束
了解需求,step_need,了解购车计划,请问您最近有换车或增购的计划吗？,有计划,那太好了活动当天可以享受优先试驾和专属优惠,邀约确认
了解需求,step_need,,,暂时没有,没关系活动也有精美礼品您可以过来了解一下最新车型,邀约确认
邀约确认,step_confirm,确认到店意向,活动时间是本周六上午10点您看方便过来吗？,方便,好的我帮您预约好位置届时恭候您的光临,结束
邀约确认,step_confirm,,,需要考虑,没问题我把活动信息发到您手机上您有空再看看,结束`;

/** 复制标准模板到剪贴板 */
export async function copyTemplate(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(CSV_EXAMPLE);
    return true;
  } catch {
    // fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = CSV_EXAMPLE;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}

/** 下载标准模板为 CSV 文件（UTF-8 BOM） */
export function downloadTemplate(): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + CSV_EXAMPLE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '话术标准模板.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** 读取本地 CSV 文件为文本，返回 Promise<string> */
export function readCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let text = reader.result as string;
      // 去除 BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      resolve(text);
    };
    reader.onerror = () => reject(new Error('文件读取失败，请检查文件是否可正常打开'));
    reader.readAsText(file, 'UTF-8');
  });
}
