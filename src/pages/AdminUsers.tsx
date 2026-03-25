import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';

// ============================================================
// 类型与映射
// ============================================================

interface UserItem {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  storeId: string;
  enabled: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: '超级管理员',
  user: '普通用户',
};

// ============================================================
// 组件
// ============================================================

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    fetch('/api/admin/users')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          setUsers(json.users);
        } else {
          setError(json.error || '用户列表加载失败');
        }
      })
      .catch(() => setError('网络异常，用户列表加载失败'))
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
        <Users className="w-5 h-5 text-brand" />
        <h2 className="text-lg font-bold text-gray-900">用户管理</h2>
        <span className="text-sm text-gray-400 ml-auto">共 {users.length} 位用户</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">姓名</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">用户名</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">角色</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">门店 ID</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">状态</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-300 text-xs">
                  暂无用户数据
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.userId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-800 font-bold text-xs">{u.displayName}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      u.role === 'super_admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.storeId || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      u.enabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {u.enabled ? '启用' : '禁用'}
                    </span>
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
