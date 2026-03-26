import { type ReactNode } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { BarChart3, Users, Store, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  superOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: '今日统计', icon: <BarChart3 className="w-4 h-4" />, end: true },
  { to: '/admin/users', label: '用户管理', icon: <Users className="w-4 h-4" /> },
  { to: '/admin/stores', label: '门店管理', icon: <Store className="w-4 h-4" />, superOnly: true },
];

/**
 * AdminLayout — 管理后台布局框架
 *
 * 提供顶部导航 + 内容区域。
 * 子页面通过 <Outlet /> 渲染。
 */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleNav = NAV_ITEMS.filter(item => !item.superOnly || user?.role === 'super_admin');

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F9]">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* 左侧：标题 + 导航菜单 */}
          <div className="flex items-center gap-4 sm:gap-6">
            <h1 className="text-sm sm:text-base font-bold text-gray-900 shrink-0">管理后台</h1>

            <nav className="flex items-center gap-1">
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                    isActive
                      ? "bg-brand text-white"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* 右侧：话术助手入口 + 用户信息 + 登出 */}
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-hover transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">进入话术助手</span>
            </Link>

            <div className="h-4 w-px bg-gray-200" />

            <span className="text-xs text-gray-500 hidden sm:inline">
              {user?.displayName}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
              title="登出"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">登出</span>
            </button>
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
