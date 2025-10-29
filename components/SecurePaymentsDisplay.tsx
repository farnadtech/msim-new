import React, { useEffect, useState } from 'react';
import api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';
import { SecurePayment } from '../types';

interface SecurePaymentsDisplayProps {
    userId: string;
    role: 'buyer' | 'seller';
}

const SecurePaymentsDisplay: React.FC<SecurePaymentsDisplayProps> = ({ userId, role }) => {
    const { showNotification } = useNotification();
    const [payments, setPayments] = useState<SecurePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [releasingId, setReleasingId] = useState<number | null>(null);

    useEffect(() => {
        loadPayments();
    }, [userId]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const data = await api.getSecurePayments(userId, role);
            setPayments(data);
        } catch (error) {
            showNotification(`خطا در بارگذاری پرداخت‌ها: ${(error as any).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawFunds = async (paymentId: number) => {
        try {
            setReleasingId(paymentId);
            await api.withdrawSecurePaymentFunds(paymentId, userId);
            showNotification('مبلغ با موفقیت برداشت شد', 'success');
            loadPayments();
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
        } finally {
            setReleasingId(null);
        }
    };

    const handleReleasePayment = async (paymentId: number) => {
        try {
            setReleasingId(paymentId);
            await api.releaseSecurePayment(paymentId, userId);
            showNotification('پول با موفقیت آزاد شد', 'success');
            loadPayments();
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
        } finally {
            setReleasingId(null);
        }
    };

    const handleCancelPayment = async (paymentId: number) => {
        if (!confirm('آیا مطمئنید که این پرداخت را لغو کنید\nپول به کیف پول ام بازگردانده خواهد شد')) return;
        
        try {
            setReleasingId(paymentId);
            await api.cancelSecurePayment(paymentId, userId);
            showNotification('پرداخت با موفقیت لغو شد', 'success');
            loadPayments();
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
        } finally {
            setReleasingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">منتظر تایید</span>;
            case 'released':
                return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">آزاد شده</span>;
            case 'cancelled':
                return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">لغو شده</span>;
            case 'completed':
                return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">تكمیل شده</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
                <p className="text-center">در حال بارگذاری...</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
            <h3 className="text-xl font-bold mb-4">
                {role === 'buyer' ? '💰 پرداخت‌های امن من' : '🔒 پرداخت‌های امن ایجاد شده'}
            </h3>

            {payments.length === 0 ? (
                <p className="text-gray-500">هیچ پرداخت امنی یافت نشد</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                {role === 'buyer' ? (
                                    <>
                                        <th className="p-3">فروشنده</th>
                                        <th className="p-3">شماره</th>
                                        <th className="p-3">مبلغ</th>
                                        <th className="p-3">وضعیت</th>
                                        <th className="p-3">عملیات</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-3">خریدار</th>
                                        <th className="p-3">شماره</th>
                                        <th className="p-3">مبلغ</th>
                                        <th className="p-3">وضعیت</th>
                                        <th className="p-3">ملاحظات</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment) => (
                                <tr key={payment.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="p-3">
                                        {role === 'buyer' ? payment.seller_name : payment.buyer_name}
                                    </td>
                                    <td className="p-3 font-mono">{payment.sim_number}</td>
                                    <td className="p-3 font-semibold">
                                        {payment.amount.toLocaleString('fa-IR')} تومان
                                    </td>
                                    <td className="p-3">{getStatusBadge(payment.status)}</td>
                                    {role === 'buyer' && (
                                        <td className="p-3 space-x-2">
                                            {payment.status === 'pending' && (
                                                <>
                                                    {!payment.withdrawn_at ? (
                                                        <button
                                                            onClick={() => handleWithdrawFunds(payment.id)}
                                                            disabled={releasingId === payment.id}
                                                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                                                            title="برداشت مبلغ از کیف پول"
                                                        >
                                                            {releasingId === payment.id ? 'در حال...' : '💵 برداشت'}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleReleasePayment(payment.id)}
                                                                disabled={releasingId === payment.id}
                                                                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                                                                title="رها کردن مبلغ برای فروشنده"
                                                            >
                                                                {releasingId === payment.id ? 'در حال...' : '✔️ تایید'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelPayment(payment.id)}
                                                                disabled={releasingId === payment.id}
                                                                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs"
                                                                title="لغو کردن پرداخت"
                                                            >
                                                                لغو
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    )}
                                    {role === 'seller' && payment.status === 'pending' && (
                                        <td className="p-3">
                                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                انتظار تأیید خریدار
                                            </span>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SecurePaymentsDisplay;
