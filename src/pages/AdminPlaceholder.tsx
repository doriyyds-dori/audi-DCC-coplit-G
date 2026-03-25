import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

/**
 * AdminPlaceholder — 管理后台占位页面
 *
 * 任务包 3 阶段：最小占位，仅显示管理员已登录，不实现后台功能。
 * 任务包 7 将替换为正式管理后台框架。
 */
export default function AdminPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F9] px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
        <div className="bg-gray-900 p-3 rounded-xl inline-flex mb-4">
          <Settings className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">管理后台</h1>
        <p className="text-sm text-gray-500 mb-1">
          欢迎，{user?.displayName}（{user?.role === 'super_admin' ? '超级管理员' : '用户'}）
        </p>
        <p className="text-xs text-gray-400 mb-6">管理后台功能将在后续任务包中实现</p>

        <div className="flex gap-3 justify-center">
          <Link
            to="/app"
            className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            进入话术助手
          </Link>
          <button
            onClick={logout}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            登出
          </button>
        </div>
      </div>
    </div>
  );
}
