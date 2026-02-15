import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';

const ZibalCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const [processing, setProcessing] = useState(true);
    const [message, setMessage] = useState('در حال پردازش پرداخت...');
    const [hasRun, setHasRun] = useState(false); // جلوگیری از اجرای چندباره

    useEffect(() => {
        // جلوگیری از اجرای چندباره
        if (hasRun) {
            console.log('⏭️ Verification already running, skipping...');
            return;
        }

        const verifyPayment = async () => {
            try {
                setHasRun(true); // علامت‌گذاری که شروع شده

                // دریافت پارامترهای callback از زیبال
                const trackId = searchParams.get('trackId');
                const success = searchParams.get('success');
                const status = searchParams.get('status');

                console.log('🔍 Zibal callback params:', { trackId, success, status });

                if (!trackId) {
                    throw new Error('اطلاعات پرداخت ناقص است');
                }

                // بررسی موفقیت اولیه
                if (success !== '1' || status !== '2') {
                    setMessage('پرداخت ناموفق بود');
                    showNotification('پرداخت لغو شد یا ناموفق بود', 'error');
                    setProcessing(false);
                    // تشخیص نوع کاربر و redirect مناسب
                    const redirectPath = user?.role === 'seller' ? '/seller/wallet' : '/buyer/wallet';
                    setTimeout(() => navigate(redirectPath), 3000);
                    return;
                }

                console.log('✅ Initial validation passed, verifying with server...');

                // تایید پرداخت با سرور
                const result = await api.verifyZibalPayment(
                    parseInt(trackId),
                    parseInt(success),
                    parseInt(status)
                );

                console.log('✅ Server verification result:', result);

                if (result.success) {
                    setMessage('پرداخت با موفقیت انجام شد!');
                    // مبلغ از زیبال به ریال برمی‌گردد، باید به تومان تبدیل شود
                    const amountInTomans = result.amount ? Math.floor(result.amount / 10) : 0;
                    showNotification(
                        `پرداخت با موفقیت انجام شد. مبلغ ${amountInTomans.toLocaleString('fa-IR')} تومان به کیف پول شما اضافه شد.`,
                        'success'
                    );
                    // تشخیص نوع کاربر و redirect مناسب
                    const redirectPath = user?.role === 'seller' ? '/seller/wallet' : '/buyer/wallet';
                    setTimeout(() => navigate(redirectPath), 2000);
                } else {
                    throw new Error('تایید پرداخت ناموفق بود');
                }
            } catch (error) {
                console.error('❌ Payment verification error:', error);
                const errorMessage = error instanceof Error ? error.message : 'خطا در تایید پرداخت';
                setMessage(errorMessage);
                showNotification(errorMessage, 'error');
                // تشخیص نوع کاربر و redirect مناسب
                const redirectPath = user?.role === 'seller' ? '/seller/wallet' : '/buyer/wallet';
                setTimeout(() => navigate(redirectPath), 3000);
            } finally {
                setProcessing(false);
            }
        };

        verifyPayment();
    }, [searchParams, navigate, showNotification, user, hasRun]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                {processing ? (
                    <>
                        <div className="mb-6">
                            <div className="inline-block">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            {message}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            لطفاً صبر کنید...
                        </p>
                    </>
                ) : (
                    <>
                        <div className="mb-6">
                            {message.includes('موفقیت') ? (
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900">
                                    <svg className="w-10 h-10 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900">
                                    <svg className="w-10 h-10 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            {message}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            در حال انتقال به صفحه کیف پول...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ZibalCallbackPage;
