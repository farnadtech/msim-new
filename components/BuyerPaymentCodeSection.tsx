import React, { useEffect, useState } from 'react';
import api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';

interface BuyerPaymentCodeSectionProps {
    userId: string;
}

const BuyerPaymentCodeSection: React.FC<BuyerPaymentCodeSectionProps> = ({ userId }) => {
    const { showNotification } = useNotification();
    const [paymentCode, setPaymentCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPaymentCode();
    }, [userId]);

    const loadPaymentCode = async () => {
        try {
            setLoading(true);
            let code = await api.getBuyerPaymentCode(userId);
            
            if (!code) {
                code = await api.generateBuyerPaymentCode(userId);
            }
            
            setPaymentCode(code);
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-6 rounded-lg shadow-md border-l-4 border-blue-600 dark:border-blue-400">
            <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-3">
                🔐 کد پرداخت امن شما
            </h3>
            
            {loading ? (
                <p className="text-blue-600 dark:text-blue-300">در حال بارگذاری...</p>
            ) : paymentCode ? (
                <div className="space-y-2">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        این کد را با فروشندگان به اشتراک بگذارید تا بتوانند برای شما پرداخت امن ایجاد کنند:
                    </p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-600 flex items-center justify-between">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-300 font-mono tracking-wider">
                            {paymentCode}
                        </p>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(paymentCode);
                                showNotification('کد کپی شد ✓', 'success');
                            }}
                            className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
                        >
                            📋 کپی کردن
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-red-600 dark:text-red-300">خطا در بارگذاری کد</p>
            )}
        </div>
    );
};

export default BuyerPaymentCodeSection;
