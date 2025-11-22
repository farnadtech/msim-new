import React, { useEffect, useState } from 'react';
import api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';
import { SecurePayment } from '../types';
import { supabase } from '../services/supabase';

interface SecurePaymentsDisplayProps {
    userId: string;
    role: 'buyer' | 'seller';
}

const SecurePaymentsDisplay: React.FC<SecurePaymentsDisplayProps> = ({ userId, role }) => {
    const { showNotification } = useNotification();
    const [payments, setPayments] = useState<SecurePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [releasingId, setReleasingId] = useState<number | null>(null);
    const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<SecurePayment | null>(null);

    useEffect(() => {
        loadPayments();
    }, [userId]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const data = await api.getSecurePayments(userId, role);
            
            // For buyer role, check if purchase orders are completed and sync with secure payments
            if (role === 'buyer') {
                for (const payment of data) {
                    if (payment.status !== 'completed') {
                        // Check if associated purchase order is completed
                        const { data: purchaseOrder, error: orderError } = await supabase
                            .from('purchase_orders')
                            .select('status')
                            .eq('sim_card_id', payment.sim_card_id)
                            .eq('buyer_id', userId)
                            .single();
                        
                        // If purchase order is completed, complete the secure payment automatically
                        if (purchaseOrder && purchaseOrder.status === 'completed') {
                            await api.completeSecurePaymentAfterDelivery(payment.id, userId);
                        }
                    }
                }
            }
            
            // Reload payments after sync
            const updatedData = await api.getSecurePayments(userId, role);
            setPayments(updatedData);
        } catch (error) {
            showNotification(`خطا در بارگذاری پرداخت‌ها: ${(error as any).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getSimLineType = async (simCardId: number): Promise<'active' | 'inactive' | null> => {
        try {
            const { data: simCard } = await supabase
                .from('sim_cards')
                .select('is_active')
                .eq('id', simCardId)
                .single();
            return simCard?.is_active ? 'active' : 'inactive';
        } catch (error) {
            console.error('Error fetching SIM card info:', error);
            return null;
        }
    };

    const handleWithdrawFunds = async (payment: SecurePayment) => {
        try {
            // Check if SIM is zero-line
            const lineType = await getSimLineType(payment.sim_card_id);
            
            if (lineType === 'inactive') {
                // Show delivery method modal for zero-line SIMs
                setSelectedPayment(payment);
                setDeliveryModalOpen(true);
            } else {
                // For active lines, directly withdraw funds
                await performWithdraw(payment.id);
                
                // Show notification that funds are blocked and waiting for delivery
                showNotification(
                    'مبلغ برداشت شد و بلوک شد. لطفاً به قسمت "پیگیری خریدها" بروید تا مراحل تحویل خط را دنبال کنید.',
                    'info'
                );
            }
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
        }
    };

    const performWithdraw = async (paymentId: number) => {
        try {
            setReleasingId(paymentId);
            await api.withdrawSecurePaymentFunds(paymentId, userId);
            showNotification('مبلغ با موفقیت برداشت و بلوک شد', 'success');
            setDeliveryModalOpen(false);
            setSelectedPayment(null);
            loadPayments();
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
        } finally {
            setReleasingId(null);
        }
    };

    const handleDeliveryMethodSelect = async (method: 'activation_code' | 'physical_card') => {
        if (!selectedPayment) return;
        
        try {
            // Withdraw the funds first
            await performWithdraw(selectedPayment.id);
            
            // Show appropriate message based on delivery method
            if (method === 'activation_code') {
                showNotification(
                    'مبلغ برداشت شد و بلوک شد. لطفاً برای دریافت کد فعالسازی منتظر بمانید.',
                    'info'
                );
            } else {
                showNotification(
                    'مبلغ برداشت شد و بلوک شد. فروشنده باید مدارک را ارسال کند.',
                    'info'
                );
            }
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
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
                                            {payment.status === 'pending' && !(payment as any).withdrawn_at && (
                                                <>
                                                    <button
                                                        onClick={() => handleWithdrawFunds(payment)}
                                                        disabled={releasingId === payment.id}
                                                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                                                        title="برداشت مبلغ و بلوک کردن"
                                                    >
                                                        {releasingId === payment.id ? 'در حال...' : '💵 برداشت'}
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
                                            {(payment as any).withdrawn_at && payment.status !== 'completed' && (
                                                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                    ⏳ در انتظار تحویل خط
                                                </span>
                                            )}
                                            {payment.status === 'completed' && (
                                                <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                                    ✅ تکمیل شد
                                                </span>
                                            )}
                                        </td>
                                    )}
                                    {role === 'seller' && payment.status === 'pending' && (
                                        <td className="p-3">
                                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                {!(payment as any).withdrawn_at ? 'منتظر برداشت خریدار' : 'منتظر تحویل خط'}
                                            </span>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delivery Method Modal for Zero-Line SIMs */}
            {deliveryModalOpen && selectedPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h4 className="text-lg font-bold mb-4">🔐 انتخاب نوع دریافت کد فعالسازی</h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            برای سیمکارت {selectedPayment.sim_number}، چگونه می‌خواهید کد فعالسازی را دریافت کنید؟
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleDeliveryMethodSelect('activation_code')}
                                disabled={releasingId === selectedPayment.id}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-semibold text-sm"
                            >
                                {releasingId === selectedPayment.id ? 'در حال...' : '📱 کد فعالسازی (کدی از فروشنده)'}
                            </button>
                            <button
                                onClick={() => handleDeliveryMethodSelect('physical_card')}
                                disabled={releasingId === selectedPayment.id}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-semibold text-sm"
                            >
                                {releasingId === selectedPayment.id ? 'در حال...' : '📮 ارسال فیزیکی (مدارک)'}
                            </button>
                            <button
                                onClick={() => {
                                    setDeliveryModalOpen(false);
                                    setSelectedPayment(null);
                                }}
                                className="w-full bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold text-sm"
                            >
                                ❌ لغو
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurePaymentsDisplay;
