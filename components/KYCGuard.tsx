import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKYCStatus } from '../hooks/useKYCStatus';
import { useAuth } from '../hooks/useAuth';

interface KYCGuardProps {
    children: React.ReactNode;
    requireVerification?: boolean;
}

const KYCGuard: React.FC<KYCGuardProps> = ({ children, requireVerification = true }) => {
    const { user } = useAuth();
    const { isVerified, isPending, isRejected, needsKYC, kycRequired, loading } = useKYCStatus();
    const navigate = useNavigate();

    // Don't block admins
    if (user?.role === 'admin') {
        return <>{children}</>;
    }

    // If KYC is not required, show content
    if (!kycRequired || !requireVerification) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // If verified, show content
    if (isVerified) {
        return <>{children}</>;
    }

    // If pending, show waiting message
    if (isPending) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <h2 className="text-2xl font-bold mb-4">درخواست شما در حال بررسی است</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        لطفا منتظر بمانید تا ادمین درخواست احراز هویت شما را بررسی کند.
                        این فرآیند معمولا کمتر از 24 ساعت طول می‌کشد.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        بازگشت به صفحه اصلی
                    </button>
                </div>
            </div>
        );
    }

    // If rejected or needs KYC, show verification form
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
                <div className="text-6xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold mb-4">احراز هویت الزامی است</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    برای استفاده از این بخش، ابتدا باید احراز هویت خود را تکمیل کنید.
                </p>
                {isRejected && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
                        <p className="text-red-700 dark:text-red-300 text-sm">
                            درخواست قبلی شما رد شده است. لطفا اطلاعات خود را اصلاح کرده و مجددا ارسال کنید.
                        </p>
                    </div>
                )}
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/kyc-verification')}
                        className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        احراز هویت
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 bg-gray-300 dark:bg-gray-600 px-6 py-2 rounded-lg hover:bg-gray-400"
                    >
                        بازگشت
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KYCGuard;
