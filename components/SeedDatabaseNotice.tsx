import React, { useState } from 'react';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface SeedDatabaseNoticeProps {
    onSeeded: () => void;
}

export const SeedDatabaseNotice: React.FC<SeedDatabaseNoticeProps> = ({ onSeeded }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    const handleSeed = async () => {
        setIsLoading(true);
        try {
            await api.seedDatabase();
            showNotification('پایگاه داده با موفقیت با داده های نمونه پر شد. برنامه مجددا بارگذاری می شود.', 'success');
            setTimeout(() => onSeeded(), 2000); // Give time for notification to be read
        } catch (err) {
            const message = err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.';
            showNotification(`خطا در مقداردهی اولیه پایگاه داده: ${message}`, 'error');
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7l8 5 8-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12l8 5" />
                </svg>
                <h1 className="mt-4 text-2xl font-bold">خوش آمدید!</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    به نظر می رسد پایگاه داده شما خالی است. برای شروع، می توانید آن را با داده های نمونه پر کنید.
                </p>
                <button
                    onClick={handleSeed}
                    disabled={isLoading}
                    className="mt-6 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                    {isLoading ? 'در حال مقداردهی...' : 'مقداردهی اولیه با داده های نمونه'}
                </button>
                 <p className="mt-4 text-xs text-gray-500">
                    این کار جداول کاربران، سیمکارت ها، پکیج ها و تراکنش ها را با داده های آزمایشی پر می کند.
                </p>
            </div>
        </div>
    );
};
