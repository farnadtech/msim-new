import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';

const LoginPage: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    if(user){
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 11);
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await api.requestPhoneOTP(phoneNumber, 'login');
      
      if (result.success) {
        showNotification('کد تایید ارسال شد', 'success');
        setStep('otp');
        setCountdown(120);
        console.log('💡 برای تست، کد 123456 را وارد کنید');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('خطا در ارسال کد تایید.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.loginWithPhone(phoneNumber, otpCode);
      showNotification('با موفقیت وارد شدید', 'success');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('کد تایید اشتباه است.');
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
      const result = await api.requestPhoneOTP(phoneNumber, 'login');
      
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
          <h1 className="text-2xl font-bold">ورود به Msim724</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {step === 'phone' && 'شماره موبایل خود را وارد کنید'}
            {step === 'otp' && 'کد تایید را وارد کنید'}
          </p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block mb-2 text-sm font-medium">شماره موبایل</label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700 text-center tracking-wider"
                placeholder="09123456789"
                required
                disabled={isLoading}
                maxLength={11}
                pattern="09[0-9]{9}"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">کد تایید به این شماره ارسال می‌شود</p>
            </div>
            {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}
            <button 
              type="submit" 
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400" 
              disabled={isLoading || phoneNumber.length !== 11}
            >
              {isLoading ? 'در حال ارسال...' : 'ارسال کد تایید'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="otp" className="text-sm font-medium">کد تایید</label>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ✏️ ویرایش شماره
                </button>
              </div>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                کد ارسال شده به {phoneNumber} را وارد کنید
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
            {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}
            <button 
              type="submit" 
              className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400" 
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? 'در حال بررسی...' : 'تایید و ورود'}
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
          </form>
        )}

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
