
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    if(user){
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      showNotification('با موفقیت وارد شدید. در حال انتقال...', 'success');
      // The useEffect listening to `user` will now handle navigation
    } catch (err) {
      // Handle Firebase authentication errors
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/invalid-email') || err.message.includes('auth/wrong-password')) {
          setError('اطلاعات ورود اشتباه است.');
        } else if (err.message.includes('auth/user-not-found')) {
          setError('کاربری با این اطلاعات یافت نشد.');
        } else if (err.message.includes('auth/too-many-requests')) {
          setError('تعداد تلاش های ناموفق زیاد است. لطفاً بعداً تلاش کنید.');
        } else {
          setError('خطا در ورود. لطفاً دوباره تلاش کنید.');
        }
      } else {
        setError('اطلاعات ورود اشتباه است.');
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-16 sm:py-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">ورود به Msim724</h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium">ایمیل</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
              placeholder="user@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" class="block mb-2 text-sm font-medium">رمز عبور</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
              required
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="text-sm text-center">
            <Link to="/forgot-password" className="font-medium text-blue-600 hover:underline">
              رمز عبور خود را فراموش کرده اید؟
            </Link>
          </div>
          <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400" disabled={isLoading}>
            {isLoading ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>

        <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                حساب کاربری ندارید؟ <Link to="/signup" className="font-medium text-blue-600 hover:underline">ثبت نام کنید</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
