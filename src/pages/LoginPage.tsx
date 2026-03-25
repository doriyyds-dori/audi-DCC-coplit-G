import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

/**
 * LoginPage — 登录页
 *
 * 调用后端 POST /api/auth/login 进行真实登录校验。
 * 登录成功后按角色跳转到 /app 或 /admin。
 */
export default function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 已登录用户访问 /login → 按角色重定向
  if (user) {
    return <Navigate to={user.role === 'super_admin' ? '/admin' : '/app'} replace />;
  }

  const validate = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = '请输入用户名';
    }
    if (!password) {
      newErrors.password = '请输入密码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!validate()) return;

    setIsSubmitting(true);
    const result = await login(username.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setLoginError(result.error || '登录失败');
    }
    // 登录成功后 user 状态更新，组件重渲染时会被顶部 Navigate 重定向
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F9] px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-sm">
        {/* 标题区 */}
        <div className="text-center mb-6">
          <div className="bg-brand p-3 rounded-xl inline-flex mb-3">
            <Phone className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">智慧外呼助手</h1>
          <p className="text-sm text-gray-500 mt-1">请登录后使用</p>
        </div>

        {/* 全局登录错误提示 */}
        {loginError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4 text-center">
            {loginError}
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 mb-6">
            {/* 用户名 */}
            <div>
              <label htmlFor="login-username" className="block text-xs font-bold text-gray-600 mb-1">
                用户名
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrors(prev => ({ ...prev, username: undefined })); setLoginError(''); }}
                placeholder="请输入用户名"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-colors ${
                  errors.username ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-brand'
                }`}
                autoComplete="username"
              />
              {errors.username && (
                <p className="text-xs text-red-500 mt-1">{errors.username}</p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-gray-600 mb-1">
                密码
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); setLoginError(''); }}
                placeholder="请输入密码"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-colors ${
                  errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-brand'
                }`}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>
          </div>

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-brand hover:bg-brand-hover text-white py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-[0.98] ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? '登录中…' : '登录'}
          </button>
        </form>

        {/* 测试账号提示 */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center mb-2">测试账号</p>
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>管理员：admin / admin123</p>
            <p>普通用户：user1 / user123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
