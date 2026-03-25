import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ============================================================
// 类型定义
// ============================================================

export type UserRole = 'super_admin' | 'user';

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
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

// ============================================================
// 硬编码测试账号（任务包 3 阶段，后续接后端 API 替换）
// ============================================================

interface TestAccount {
  username: string;
  password: string;
  user: AuthUser;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    username: 'admin',
    password: 'admin123',
    user: {
      userId: 'u_admin_001',
      username: 'admin',
      displayName: '系统管理员',
      role: 'super_admin',
      storeId: '',
    },
  },
  {
    username: 'user1',
    password: 'user123',
    user: {
      userId: 'u_user_001',
      username: 'user1',
      displayName: '张三',
      role: 'user',
      storeId: 'store_001',
    },
  },
  {
    username: 'user2',
    password: 'user123',
    user: {
      userId: 'u_user_002',
      username: 'user2',
      displayName: '李四',
      role: 'user',
      storeId: 'store_001',
    },
  },
];

// ============================================================
// localStorage 键名（使用明确前缀，避免与话术数据冲突）
// ============================================================

const AUTH_STORAGE_KEY = 'auth_user';

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 启动时从 localStorage 恢复登录态
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        if (parsed && parsed.userId && parsed.role) {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const account = TEST_ACCOUNTS.find(
      (a) => a.username === username && a.password === password
    );

    if (!account) {
      return { success: false, error: '用户名或密码错误' };
    }

    setUser(account.user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account.user));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
