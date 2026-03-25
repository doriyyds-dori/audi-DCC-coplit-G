import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from './AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  /** 允许访问此路由的角色列表。不传则所有已登录用户均可访问。 */
  allowedRoles?: UserRole[];
}

/**
 * ProtectedRoute — 路由守卫
 *
 * - 未登录 → 跳转 /login
 * - 已登录但角色不在 allowedRoles 中 → 跳转 /app
 * - isLoading 期间显示空白，避免闪烁
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // 恢复登录态期间，不渲染任何内容，避免闪跳
  if (isLoading) {
    return null;
  }

  // 未登录 → /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 已登录但角色不允许 → /app
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
