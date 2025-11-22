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
    phoneNumber: '',
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

      if (!formData.phoneNumber || formData.phoneNumber.length !== 11) {
        setError('شماره تلفن باید 11 رقم باشد.');
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

      // OTP verified, create account
      // Use phone as both email (with domain) and password
      const formattedPhone = formData.phoneNumber;
      const email = `${formattedPhone}@msim724.phone`;
      const password = formattedPhone;

      // Create Supabase auth user
      const userCredential = await api.signup(email, password);
      
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userCredential.user.id,
          name: formData.name,
          email,
          phone_number: formattedPhone,
          role: formData.role,
          wallet_balance: 0,
          blocked_balance: 0
        });

      if (profileError) {
        throw new Error('خطا در ایجاد پروفایل کاربری.');
      }

      showNotification('ثبت نام شما با موفقیت تکمیل شد', 'success');
      
      // Wait a moment for localStorage to be updated, then navigate
      setTimeout(() => {
        navigate(`/${formData.role}`);
      }, 500);
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                placeholder="علی محمدی"
                required 
                disabled={isLoading} 
              />
            </div>

            <div>
              <label htmlFor="phone" className="block mb-2 text-sm font-medium">شماره موبایل</label>
              <input
                type="tel"
                id="phone"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700 text-center tracking-wider"
                placeholder="09123456789"
                required
                disabled={isLoading}
                maxLength={11}
                pattern="09[0-9]{9}"
                dir="ltr"
              />
            </div>

            <div>
              <label htmlFor="role" className="block mb-2 text-sm font-medium">نقش شما</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleDetailsChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                disabled={isLoading}
              >
                <option value="buyer">خریدار</option>
                <option value="seller">فروشنده</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}
            <button 
              type="submit" 
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400" 
              disabled={isLoading || formData.phoneNumber.length !== 11 || !formData.name.trim()}
            >
              {isLoading ? 'در حال ارسال...' : 'ارسال کد تایید'}
            </button>
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
            {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}
            <button 
              type="submit" 
              className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400" 
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? 'در حال پردازش...' : 'تایید و ثبت نام'}
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
                حساب کاربری دارید؟ <Link to="/login" className="font-medium text-blue-600 hover:underline">وارد شوید</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
