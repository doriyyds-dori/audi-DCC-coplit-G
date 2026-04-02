import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { BarChart3, Loader2, ThumbsUp, ThumbsDown, Download, GitCompareArrows } from 'lucide-react';

// ============================================================
// 类型与映射
// ============================================================

interface CallRecord {
  id: string;
  userId: string;
  storeId: string;
  displayName?: string;
  storeName?: string;
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
    globalCalls: number;
    storeCalls: number;
    globalHasIntent: number;
    storeHasIntent: number;
  };
  records: CallRecord[];
}

interface FeedbackSummary {
  totalLikes: number;
  totalDislikes: number;
  globalLikes: number;
  globalDislikes: number;
  storeLikes: number;
  storeDislikes: number;
}

interface FeedbackTopItem {
  messageText: string;
  count: number;
}

interface FeedbackResponse {
  success: boolean;
  summary: FeedbackSummary;
  topLiked: FeedbackTopItem[];
  topDisliked: FeedbackTopItem[];
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

  const [feedbackData, setFeedbackData] = useState<FeedbackResponse | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState('');

  const { getToken } = useAuth();

  useEffect(() => {
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    setLoading(true);
    setError('');
    fetch('/api/admin/stats/today', { headers })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) { setData(json); } else { setError(json.error || '今日统计加载失败'); }
      })
      .catch(() => setError('网络异常，今日统计加载失败'))
      .finally(() => setLoading(false));

    setFeedbackLoading(true);
    setFeedbackError('');
    fetch('/api/admin/stats/feedback-today', { headers })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) { setFeedbackData(json); } else { setFeedbackError(json.error || '反馈统计加载失败'); }
      })
      .catch(() => setFeedbackError('网络异常，反馈统计加载失败'))
      .finally(() => setFeedbackLoading(false));
  }, [getToken]);

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

  const downloadCsv = (rows: CallRecord[]) => {
    const header = '用户姓名,门店名称,通话结果,场景,日期,时间';
    const lines = rows.map(r => {
      const name = (r.displayName || r.userId).replace(/,/g, '，');
      const store = (r.storeName || r.storeId).replace(/,/g, '，');
      const status = STATUS_LABEL[r.status] ?? r.status;
      const scenario = SCENARIO_LABEL[r.scenarioType] ?? r.scenarioType;
      const time = new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${name},${store},${status},${scenario},${r.callDate},${time}`;
    });
    const csv = '\uFEFF' + [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `通话明细_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* ========== 话术来源对比 ========== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <GitCompareArrows className="w-4 h-4 text-brand" />
          <h3 className="text-base font-bold text-gray-900">话术来源对比</h3>
        </div>
        {(() => {
          const s = summary;
          const fb = feedbackData?.summary ?? { totalLikes: 0, totalDislikes: 0, globalLikes: 0, globalDislikes: 0, storeLikes: 0, storeDislikes: 0 };
          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">指标</th>
                    <th className="text-center px-4 py-3 font-bold text-blue-600 text-xs">统一话术</th>
                    <th className="text-center px-4 py-3 font-bold text-green-600 text-xs">自定义话术</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-600 font-bold">通话次数</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-blue-600">{s.globalCalls}</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-green-600">{s.storeCalls}</td>
                  </tr>
                  <tr className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-600 font-bold">有意向数</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-blue-600">{s.globalHasIntent}</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-green-600">{s.storeHasIntent}</td>
                  </tr>
                  <tr className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-600 font-bold">点赞数</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-blue-600">{fb.globalLikes}</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-green-600">{fb.storeLikes}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-xs text-gray-600 font-bold">点踩数</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-blue-600">{fb.globalDislikes}</td>
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-green-600">{fb.storeDislikes}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* 明细表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-bold text-gray-600">明细记录（{records.length} 条）</span>
          {records.length > 0 && (
            <button
              onClick={() => downloadCsv(records)}
              className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
            >
              <Download className="w-3 h-3" />下载明细
            </button>
          )}
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">用户姓名</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">门店名称</th>
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
                    <td className="px-4 py-3 text-gray-800 text-xs">{row.displayName || row.userId}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.storeName || row.storeId}</td>
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

      {/* ========== 话术反馈概览 ========== */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <ThumbsUp className="w-4 h-4 text-brand" />
          <h3 className="text-base font-bold text-gray-900">话术反馈概览</h3>
        </div>

        {feedbackLoading && (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader2 className="w-4 h-4 text-brand animate-spin" />
            <span className="text-xs text-gray-400">加载中…</span>
          </div>
        )}

        {feedbackError && (
          <div className="text-center py-6">
            <p className="text-xs text-red-500 mb-2">{feedbackError}</p>
            <button onClick={() => window.location.reload()} className="text-xs font-bold text-brand hover:underline">刷新重试</button>
          </div>
        )}

        {!feedbackLoading && !feedbackError && (() => {
          const fb = feedbackData?.summary ?? { totalLikes: 0, totalDislikes: 0, globalLikes: 0, globalDislikes: 0, storeLikes: 0, storeDislikes: 0 };
          const topLiked = feedbackData?.topLiked ?? [];
          const topDisliked = feedbackData?.topDisliked ?? [];
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <SummaryCard label="今日点赞" value={fb.totalLikes} color="text-brand" />
                <SummaryCard label="今日点踩" value={fb.totalDislikes} color="text-red-500" />
                <SummaryCard label="统一话术赞" value={fb.globalLikes} color="text-blue-600" />
                <SummaryCard label="统一话术踩" value={fb.globalDislikes} color="text-orange-500" />
                <SummaryCard label="自定义话术赞" value={fb.storeLikes} color="text-green-600" />
                <SummaryCard label="自定义话术踩" value={fb.storeDislikes} color="text-yellow-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TopTable title="👍 被点赞最多的话术 Top 5" items={topLiked} emptyText="今日暂无点赞" />
                <TopTable title="👎 被点踩最多的话术 Top 5" items={topDisliked} emptyText="今日暂无点踩" />
              </div>
            </>
          );
        })()}
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

function TopTable({ title, items, emptyText }: { title: string; items: Array<{ messageText: string; count: number }>; emptyText: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-bold text-gray-700">{title}</h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-2 text-xs font-bold text-gray-500 w-12">#</th>
            <th className="text-left px-4 py-2 text-xs font-bold text-gray-500">话术内容</th>
            <th className="text-right px-4 py-2 text-xs font-bold text-gray-500 w-16">次数</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-gray-300 text-xs">{emptyText}</td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-2 text-xs text-gray-400 font-bold">{idx + 1}</td>
                <td className="px-4 py-2 text-xs text-gray-700 line-clamp-2">{item.messageText}</td>
                <td className="px-4 py-2 text-right text-xs font-bold text-gray-800">{item.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
