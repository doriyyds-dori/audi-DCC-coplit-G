import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AppPage from './pages/AppPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import AdminStats from './pages/AdminStats';
import AdminUsers from './pages/AdminUsers';
import AdminStores from './pages/AdminStores';

/**
 * App — 路由分发入口
 *
 * 路由口径：
 * - /login         → 登录页（已登录则按角色重定向）
 * - /app           → 话术助手页面（需登录）
 * - /admin         → 管理后台 - 今日统计（需登录 + super_admin）
 * - /admin/users   → 管理后台 - 用户管理（需登录 + super_admin）
 * - /admin/stores  → 管理后台 - 门店管理（需登录 + super_admin）
 * - /              → 按登录态和角色重定向
 * - 未知路径        → 按登录态重定向
 */
function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin' || user.role === 'store_admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'store_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminStats />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="stores" element={<AdminStores />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
