import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api-supabase';
import { supabase } from '../services/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { UserRole } from '../types';

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'buyer' as UserRole,
  });
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (user) {
        navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 11);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phoneNumber: formatted }));
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name.trim()) {
        setError('لطفاً نام و نام خانوادگی خود را وارد کنید.');
        setIsLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        setError('لطفاً ایمیل خود را وارد کنید.');
        setIsLoading(false);
        return;
      }

      if (!formData.phoneNumber || formData.phoneNumber.length !== 11) {
        setError('شماره تلفن باید 11 رقم باشد.');
        setIsLoading(false);
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        setError('رمز عبور باید حداقل 6 کاراکتر باشد.');
        setIsLoading(false);
        return;
      }

      // Request OTP
      const result = await api.requestPhoneOTP(formData.phoneNumber, 'signup');
      
      if (result.success) {
        showNotification('کد تایید به شماره شما ارسال شد', 'success');
        setStep('otp');
        setCountdown(120);
        console.log('💡 برای تست، کد 123456 را وارد کنید');
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Error requesting OTP:', err);
      setError('خطا در ارسال کد تایید.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // First verify OTP
      const verifyResult = await api.verifyPhoneOTP(formData.phoneNumber, otpCode, 'signup');
      
      if (!verifyResult.success) {
        setError(verifyResult.message);
        setIsLoading(false);
        return;
      }

      // OTP verified, now create account with email + password + phone
      const userCredential = await api.signup(formData.email, formData.password);
      
      // Create user profile with correct field name
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userCredential.user.id,
          name: formData.name,
          email: formData.email,
          phone_number: formData.phoneNumber,
          role: formData.role,
          wallet_balance: 0,
          blocked_balance: 0
        });

      if (profileError) {
        throw new Error('خطا در ایجاد پروفایل کاربری.');
      }

      showNotification('ثبت نام شما با موفقیت تکمیل شد', 'success');
      // Navigation will happen via useEffect
    } catch (err) {
      console.error('Signup error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('خطا در ثبت نام.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setError('');
    setIsLoading(true);

    try {
      const result = await api.requestPhoneOTP(formData.phoneNumber, 'signup');
      
      if (result.success) {
        showNotification('کد تایید مجدداً ارسال شد', 'success');
        setCountdown(120);
        console.log('💡 برای تست، کد 123456 را وارد کنید');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('خطا در ارسال مجدد کد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-16 sm:py-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ایجاد حساب کاربری جدید</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {step === 'details' && 'اطلاعات خود را وارد کنید'}
            {step === 'otp' && 'کد تایید را وارد کنید'}
          </p>
        </div>
        
        {step === 'details' ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label htmlFor="name" className="block mb-2 text-sm font-medium">نام و نام خانوادگی</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleDetailsChange} 
                required 
                disabled={isLoading} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                placeholder="علی احمدی"
              />
            </div>

            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium">ایمیل</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email} 
                onChange={handleDetailsChange} 
                required 
                disabled={isLoading} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700" 
                placeholder="user@example.com" 
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block mb-2 text-sm font-medium">شماره موبایل</label>
              <input 
                type="tel" 
                id="phoneNumber" 
                name="phoneNumber" 
                value={formData.phoneNumber} 
                onChange={handlePhoneChange} 
                required 
                disabled={isLoading} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700 text-center tracking-wider" 
                placeholder="09123456789"
                maxLength={11}
                pattern="09[0-9]{9}"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">مثال: 09123456789</p>
            </div>

            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium">رمز عبور</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                value={formData.password} 
                onChange={handleDetailsChange} 
                required 
                disabled={isLoading} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">حداقل 6 کاراکتر</p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">قصد... را دارم</label>
              <div className="flex space-x-4 space-x-reverse">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="role" 
                    value="buyer" 
                    checked={formData.role === 'buyer'} 
                    onChange={handleDetailsChange} 
                    className="ml-2" 
                  /> 
                  خرید سیمکارت
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="role" 
                    value="seller" 
                    checked={formData.role === 'seller'} 
                    onChange={handleDetailsChange} 
                    className="ml-2" 
                  /> 
                  فروش سیمکارت
                </label>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button 
              type="submit" 
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400" 
              disabled={isLoading || formData.phoneNumber.length !== 11}
            >
              {isLoading ? 'در حال ارسال کد...' : 'ارسال کد تایید'}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                قبلاً ثبت نام کرده اید؟ <Link to="/login" className="font-medium text-blue-600 hover:underline">وارد شوید</Link>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndSignup} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="otp" className="text-sm font-medium">کد تایید</label>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-xs text-blue-600 hover:underline"
                  disabled={isLoading}
                >
                  ✏️ ویرایش اطلاعات
                </button>
              </div>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                کد ارسال شده به {formData.phoneNumber} را وارد کنید
              </p>
              <input
                type="text"
                id="otp"
                value={otpCode}
                onChange={(e) => setOtpCode(formatPhoneNumber(e.target.value))}
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700 text-center tracking-[0.5em] text-2xl font-mono"
                placeholder="- - - - - -"
                required
                disabled={isLoading}
                maxLength={6}
                pattern="[0-9]{6}"
                dir="ltr"
                autoFocus
              />
              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                💡 تست: کد <span className="font-mono font-bold">123456</span> را وارد کنید
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? 'در حال ثبت نام...' : 'تایید و ثبت نام'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                disabled={countdown > 0 || isLoading}
              >
                {countdown > 0 ? `ارسال مجدد (${countdown}s)` : 'ارسال مجدد کد'}
              </button>
            </div>

            <div className="text-center">
              <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                بازگشت به ورود
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignupPage;
