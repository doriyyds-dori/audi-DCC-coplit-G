import { useState, useEffect } from 'react';
import { Store, Loader2 } from 'lucide-react';

// ============================================================
// 类型
// ============================================================

interface StoreItem {
  storeId: string;
  name: string;
}

// ============================================================
// 组件
// ============================================================

export default function AdminStores() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    fetch('/api/admin/stores')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          setStores(json.stores);
        } else {
          setError(json.error || '门店列表加载失败');
        }
      })
      .catch(() => setError('网络异常，门店列表加载失败'))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Store className="w-5 h-5 text-brand" />
        <h2 className="text-lg font-bold text-gray-900">门店管理</h2>
        <span className="text-sm text-gray-400 ml-auto">共 {stores.length} 家门店</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">门店 ID</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">门店名称</th>
            </tr>
          </thead>
          <tbody>
            {stores.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-300 text-xs">
                  暂无门店数据
                </td>
              </tr>
            ) : (
              stores.map((s) => (
                <tr key={s.storeId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.storeId}</td>
                  <td className="px-4 py-3 text-gray-800 font-bold text-xs">{s.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
