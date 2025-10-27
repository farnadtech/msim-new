
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { requestPasswordReset } from '../services/api';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      showNotification('ایمیل بازنشانی رمز عبور ارسال شد.', 'success');
    } catch (error) {
      showNotification('خطا در ارسال ایمیل بازنشانی رمز عبور.', 'error');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center py-16 sm:py-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">بازنشانی رمز عبور</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
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
          <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400" disabled={isLoading}>
            {isLoading ? 'در حال ارسال ایمیل...' : 'ارسال ایمیل بازنشانی'}
          </button>
        </form>
        <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                بازگشت به <Link to="/login" className="font-medium text-blue-600 hover:underline">صفحه ورود</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
