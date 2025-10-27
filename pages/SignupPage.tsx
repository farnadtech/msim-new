
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signup, createUserProfile } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { UserRole } from '../types';

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer' as UserRole,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (user) {
        navigate(`/${user.role}`);
    }
  }, [user, navigate]);


  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const userCredential = await signup(formData.email, formData.password);
        await createUserProfile(userCredential.user.uid, {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            wallet_balance: 0,
            blocked_balance: 0,
            package_id: ''
        });
        showNotification('ثبت نام شما با موفقیت تکمیل شد. در حال انتقال...', 'success');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در ثبت نام.');
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-16 sm:py-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">ایجاد حساب کاربری جدید</h1>
        
        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-medium">نام و نام خانوادگی</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleDetailsChange} required disabled={isLoading} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"/>
          </div>
           <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium">ایمیل</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleDetailsChange} required disabled={isLoading} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" placeholder="user@example.com" />
          </div>
          <div>
            <label htmlFor="password" class="block mb-2 text-sm font-medium">رمز عبور</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleDetailsChange} required disabled={isLoading} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
          </div>
           <div>
            <label className="block mb-2 text-sm font-medium">قصد... را دارم</label>
            <div className="flex space-x-4 space-x-reverse">
                <label className="flex items-center"><input type="radio" name="role" value="buyer" checked={formData.role === 'buyer'} onChange={handleDetailsChange} className="ml-2" /> خرید سیمکارت</label>
                <label className="flex items-center"><input type="radio" name="role" value="seller" checked={formData.role === 'seller'} onChange={handleDetailsChange} className="ml-2" /> فروش سیمکارت</label>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400" disabled={isLoading}>
            {isLoading ? 'در حال ثبت نام...' : 'ثبت نام'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            قبلا ثبت نام کرده اید؟ <Link to="/login" className="font-medium text-blue-600 hover:underline">وارد شوید</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
