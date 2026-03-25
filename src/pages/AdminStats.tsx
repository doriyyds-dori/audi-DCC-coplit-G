import { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';

// ============================================================
// 类型与映射
// ============================================================

interface CallRecord {
  id: string;
  userId: string;
  storeId: string;
  status: string;
  scenarioType: string;
  callDate: string;
  createdAt: string;
}

interface StatsResponse {
  success: boolean;
  summary: {
    totalCalls: number;
    notConnected: number;
    noIntent: number;
    hasIntent: number;
  };
  records: CallRecord[];
}

const STATUS_LABEL: Record<string, string> = {
  not_connected: '未接通',
  no_intent: '明确无意向',
  has_intent: '有意向',
};

const SCENARIO_LABEL: Record<string, string> = {
  existing: '保有潜客',
  new: '首次邀约',
};

// ============================================================
// 组件
// ============================================================

export default function AdminStats() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    fetch('/api/admin/stats/today')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json);
        } else {
          setError(json.error || '今日统计加载失败');
        }
      })
      .catch(() => setError('网络异常，今日统计加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
        <span className="ml-2 text-sm text-gray-400">加载中…</span>
      </div>
    );
  }

  // 加载失败
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-bold text-brand hover:underline"
        >
          刷新重试
        </button>
      </div>
    );
  }

  const summary = data?.summary ?? { totalCalls: 0, notConnected: 0, noIntent: 0, hasIntent: 0 };
  const records = data?.records ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-gray-900">今日统计</h2>
        </div>
        <span className="text-sm text-gray-400">{today}</span>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="总通话数" value={summary.totalCalls} />
        <SummaryCard label="未接通" value={summary.notConnected} color="text-gray-500" />
        <SummaryCard label="无意向" value={summary.noIntent} color="text-orange-500" />
        <SummaryCard label="有意向" value={summary.hasIntent} color="text-green-600" />
      </div>

      {/* 明细表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">用户 ID</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">门店 ID</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">通话结果</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">场景</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">日期</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">时间</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-300 text-xs">
                  今日暂无通话记录
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-800 font-mono text-xs">{row.userId}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.storeId}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {SCENARIO_LABEL[row.scenarioType] ?? row.scenarioType}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.callDate}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(row.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color = 'text-gray-900' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const cls =
    status === 'has_intent'
      ? 'bg-green-50 text-green-600'
      : status === 'no_intent'
        ? 'bg-orange-50 text-orange-600'
        : 'bg-gray-100 text-gray-500';

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
