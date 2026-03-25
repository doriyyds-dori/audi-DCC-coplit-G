import { type ReactNode } from 'react';
import { PhoneOff, UserX, ThumbsUp } from 'lucide-react';

/**
 * 通话状态枚举
 * 与 DATA_MODEL_MVP.md 中 call_records.status 定义一致
 */
export type CallStatus = 'not_connected' | 'no_intent' | 'has_intent';

interface StatusOption {
  value: CallStatus;
  label: string;
  description: string;
  icon: ReactNode;
  colorClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'not_connected',
    label: '未接通',
    description: '电话未接通或无人应答',
    icon: <PhoneOff className="w-5 h-5" />,
    colorClass: 'border-gray-300 text-gray-600 hover:border-gray-500 hover:bg-gray-50',
  },
  {
    value: 'no_intent',
    label: '明确无意向',
    description: '客户明确表示不感兴趣',
    icon: <UserX className="w-5 h-5" />,
    colorClass: 'border-orange-300 text-orange-600 hover:border-orange-500 hover:bg-orange-50',
  },
  {
    value: 'has_intent',
    label: '有意向',
    description: '客户表示愿意了解或到店',
    icon: <ThumbsUp className="w-5 h-5" />,
    colorClass: 'border-green-300 text-green-600 hover:border-green-500 hover:bg-green-50',
  },
];

interface CallStatusModalProps {
  isOpen: boolean;
  onSelect: (status: CallStatus) => void;
  /** 错误提示信息（可选） */
  errorMessage?: string;
  /** 是否禁用按钮（提交中） */
  disabled?: boolean;
}

/**
 * CallStatusModal — 通话状态选择弹窗
 *
 * 规则：
 * - 没有关闭按钮，点击遮罩不关闭
 * - 必须选择一个状态才能关闭
 * - 选择后触发 onSelect 回调
 */
export default function CallStatusModal({ isOpen, onSelect, errorMessage, disabled }: CallStatusModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩（不可点击关闭） */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-900 text-center mb-1">请选择通话结果</h2>
        <p className="text-xs text-gray-400 text-center mb-5">选择后将记录本次通话</p>

        <div className="space-y-3">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all active:scale-[0.98] ${option.colorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.icon}
              <div className="text-left">
                <div>{option.label}</div>
                <div className="text-xs font-normal text-gray-400">{option.description}</div>
              </div>
            </button>
          ))}
        </div>

        {errorMessage && (
          <p className="text-xs text-red-500 text-center mt-4">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
