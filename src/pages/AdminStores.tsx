import { Store } from 'lucide-react';

/**
 * AdminStores — 门店管理页（占位）
 *
 * 任务包 7 阶段：静态占位表格，结构清晰便于后续挂真实 CRUD。
 */

const MOCK_STORES = [
  { id: 'store_001', name: '北京朝阳店', userCount: 2, createdAt: '2026-03-01' },
  { id: 'store_002', name: '上海浦东店', userCount: 1, createdAt: '2026-03-05' },
  { id: 'store_003', name: '广州天河店', userCount: 0, createdAt: '2026-03-10' },
];

export default function AdminStores() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-gray-900">门店管理</h2>
        </div>
        <button
          disabled
          className="bg-gray-200 text-gray-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed"
        >
          新增门店（即将开放）
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">门店名称</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">用户数</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">创建时间</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_STORES.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3 font-bold text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-center">{s.userCount}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{s.createdAt}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-gray-300">—</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-300 text-center mt-4">以上为静态占位数据，门店管理功能将在后端接入后开放</p>
    </div>
  );
}
