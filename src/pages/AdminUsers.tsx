import { Users } from 'lucide-react';

/**
 * AdminUsers — 用户管理页（占位）
 *
 * 任务包 7 阶段：静态占位表格，结构清晰便于后续挂真实 CRUD。
 */

const MOCK_USERS = [
  { id: 'u_user_001', name: '张三', username: 'user1', store: '北京朝阳店', role: '普通用户', enabled: true },
  { id: 'u_user_002', name: '李四', username: 'user2', store: '北京朝阳店', role: '普通用户', enabled: true },
  { id: 'u_admin_001', name: '系统管理员', username: 'admin', store: '—', role: '超级管理员', enabled: true },
];

export default function AdminUsers() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-gray-900">用户管理</h2>
        </div>
        <button
          disabled
          className="bg-gray-200 text-gray-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed"
        >
          新增用户（即将开放）
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">姓名</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">用户名</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">门店</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">角色</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">状态</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3 font-bold text-gray-800">{u.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3 text-gray-500">{u.store}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    u.role === '超级管理员' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-bold ${u.enabled ? 'text-green-600' : 'text-red-500'}`}>
                    {u.enabled ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-gray-300">—</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-300 text-center mt-4">以上为静态占位数据，用户管理功能将在后端接入后开放</p>
    </div>
  );
}
