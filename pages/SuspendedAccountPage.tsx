import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../services/supabase';

const SuspendedAccountPage: React.FC = () => {
    const { user, logout } = useAuth();
    const { showNotification } = useNotification();
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!message.trim()) {
            showNotification('لطفاً پیام خود را وارد کنید', 'error');
            return;
        }

        if (!user) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('suspension_requests')
                .insert({
                    user_id: user.id,
                    message: message.trim(),
                    status: 'pending'
                });

            if (error) throw error;

            showNotification('درخواست شما با موفقیت ارسال شد. پس از بررسی توسط مدیر، نتیجه به شما اطلاع داده می‌شود.', 'success');
            setMessage('');
        } catch (error) {
            showNotification('خطا در ارسال درخواست', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Suspension Notice Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
                        <div className="flex items-center justify-center mb-4">
                            <div className="bg-white/20 rounded-full p-4">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-center">حساب کاربری تعلیق شده</h1>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {/* User Info */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">نام کاربری:</p>
                            <p className="text-lg font-semibold">{user.name}</p>
                            {user.email && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 mt-2">ایمیل:</p>
                                    <p className="text-lg font-semibold">{user.email}</p>
                                </>
                            )}
                        </div>

                        {/* Suspension Info */}
                        <div className="bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 p-4 mb-6">
                            <h2 className="font-bold text-red-800 dark:text-red-300 mb-2 flex items-center">
                                <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                دلیل تعلیق:
                            </h2>
                            <p className="text-red-700 dark:text-red-400">
                                {user.suspension_reason || 'حساب شما به دلیل تخلف از قوانین سایت تعلیق شده است.'}
                            </p>
                            {user.suspended_at && (
                                <p className="text-sm text-red-600 dark:text-red-500 mt-2">
                                    تاریخ تعلیق: {new Date(user.suspended_at).toLocaleDateString('fa-IR')}
                                </p>
                            )}
                        </div>

                        {user.negative_score && user.negative_score > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-r-4 border-yellow-500 p-4 mb-6">
                                <h2 className="font-bold text-yellow-800 dark:text-yellow-300 mb-2">امتیاز منفی:</h2>
                                <p className="text-yellow-700 dark:text-yellow-400">
                                    {user.negative_score} مورد تخلف ثبت شده
                                </p>
                            </div>
                        )}

                        {/* Request Form */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500 p-4 mb-6">
                            <h2 className="font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                درخواست رفع تعلیق
                            </h2>
                            <p className="text-blue-700 dark:text-blue-400 text-sm mb-4">
                                برای درخواست رفع تعلیق حساب خود، لطفاً توضیحات خود را در باکس زیر وارد کنید. درخواست شما توسط مدیریت سایت بررسی خواهد شد.
                            </p>

                            <form onSubmit={handleSubmitRequest}>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-3 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                                    placeholder="توضیحات خود را اینجا بنویسید..."
                                    required
                                    disabled={isSubmitting}
                                />

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !message.trim()}
                                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'در حال ارسال...' : 'ارسال درخواست رفع تعلیق'}
                                </button>
                            </form>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 px-6 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            خروج از حساب کاربری
                        </button>
                    </div>
                </div>

                {/* Support Info */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        در صورت نیاز به کمک، با پشتیبانی تماس بگیرید:
                    </p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-2" dir="ltr">
                        02112345678
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SuspendedAccountPage;
