import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ============================================================
// 类型定义
// ============================================================

export type UserRole = 'super_admin' | 'store_admin' | 'user';

export interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  storeId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  /** 获取当前 session token（供 API 请求用） */
  getToken: () => string | null;
}

// ============================================================
// localStorage 键名
// ============================================================

const TOKEN_STORAGE_KEY = 'auth_token';

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 启动时通过 token 调用 /api/auth/me 恢复登录态
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user as AuthUser);
            return;
          }
        }
        // token 无效或会话失效 → 清除
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token && data.user) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        setUser(data.user as AuthUser);
        return { success: true };
      }

      return { success: false, error: data.error || '登录失败' };
    } catch {
      return { success: false, error: '网络异常，请重试' };
    }
  };

  const logout = () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      // 通知后端删除 session（不阻塞 UI）
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  };

  const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return ctx;
}
