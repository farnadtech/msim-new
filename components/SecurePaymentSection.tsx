import React, { useState, useEffect } from 'react';
import api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';

interface SecurePaymentSectionProps {
    sellerSimCards: any[];
    sellerRole: 'seller' | 'buyer';
}

const SecurePaymentSection: React.FC<SecurePaymentSectionProps> = ({ sellerSimCards, sellerRole }) => {
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const [buyerCode, setBuyerCode] = useState('');
    const [selectedSimId, setSelectedSimId] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [buyerPaymentCode, setBuyerPaymentCode] = useState<string | null>(null);
    const [loadingCode, setLoadingCode] = useState(false);

    // Filter only inquiry type SIM cards for secure payments
    const inquirySimCards = sellerSimCards.filter(sim => sim.type === 'inquiry' && sim.status === 'available');

    useEffect(() => {
        if (sellerRole === 'buyer' && user) {
            loadBuyerCode();
        }
    }, [user, sellerRole]);

    const loadBuyerCode = async () => {
        if (!user) return;
        try {
            setLoadingCode(true);
            let code = await api.getBuyerPaymentCode(user.id);
            
            if (!code) {
                code = await api.generateBuyerPaymentCode(user.id);
            }
            
            setBuyerPaymentCode(code);
        } catch (error) {
            showNotification(`خطا در بارگذاری کد: ${(error as any).message}`, 'error');
        } finally {
            setLoadingCode(false);
        }
    };

    const handleCreateSecurePayment = async () => {
        const trimmedCode = buyerCode.trim();
        
        if (!trimmedCode) {
            showNotification('لطفاً کد خریدار را وارد کنید', 'error');
            return;
        }

        if (!selectedSimId) {
            showNotification('لطفاً یک شماره سیمکارت انتخاب کنید', 'error');
            return;
        }

        if (!customAmount || isNaN(Number(customAmount)) || Number(customAmount) <= 0) {
            showNotification('لطفاً مبلغ معتبری وارد کنید', 'error');
            return;
        }

        try {
            setLoading(true);
            if (!user) throw new Error('کاربر یافت نشد');
            
            await api.createSecurePayment(trimmedCode, selectedSimId, user.id, Number(customAmount));
            showNotification('پرداخت امن با موفقیت ایجاد شد', 'success');
            setBuyerCode('');
            setSelectedSimId(null);
            setCustomAmount('');
            setShowForm(false);
        } catch (error) {
            showNotification(`خطا: ${(error as any).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
            <h3 className="text-xl font-bold mb-4">🔒 ایجاد پرداخت امن</h3>

            {sellerRole === 'seller' && (
                <div>
                    {inquirySimCards.length === 0 ? (
                        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 p-4 rounded-lg text-orange-800 dark:text-orange-200">
                            <p className="font-semibold mb-2">⚠️ هیچ شماره استعلامی موجود نیست</p>
                            <p className="text-sm">
                                برای ایجاد پرداخت امن، باید حداقل یک شماره به صورت "استعلام با تماس" ثبت کرده باشید.
                            </p>
                            <p className="text-sm mt-2">
                                لطفاً به بخش "ثبت سیمکارت جدید" رفته و یک شماره به صورت استعلامی ثبت کنید.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                برای ایجاد پرداخت امن، کد خریدار را وارد کنید، یک شماره انتخاب کنید و مبلغ مورد نظر را تعیین کنید.
                            </p>

                            {!showForm ? (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                                >
                                    + ایجاد پرداخت امن
                                </button>
                            ) : (
                                <div className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">کد خریدار</label>
                                        <input
                                            type="text"
                                            value={buyerCode}
                                            onChange={(e) => setBuyerCode(e.target.value)}
                                            placeholder="مثال: BUYER-ABC12345"
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">انتخاب شماره سیمکارت</label>
                                        <select
                                            value={selectedSimId || ''}
                                            onChange={(e) => setSelectedSimId(Number(e.target.value))}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="">-- انتخاب کنید --</option>
                                            {inquirySimCards.map((sim) => (
                                                <option key={sim.id} value={sim.id}>
                                                    {sim.number} (استعلام با تماس)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">مبلغ (تومان)</label>
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            placeholder="مبلغ مورد نظر را وارد کنید"
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                                            min="0"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateSecurePayment}
                                            disabled={loading || !buyerCode || !selectedSimId || !customAmount}
                                            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                                        >
                                            {loading ? 'در حال پردازش...' : 'ایجاد پرداخت امن'}
                                        </button>
                                        <button
                                            onClick={() => setShowForm(false)}
                                            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                                        >
                                            لغو
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {sellerRole === 'buyer' && (
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-200">
                        کد یکتا شما برای دریافت پرداخت‌های امن:
                    </p>
                    {loadingCode ? (
                        <p className="text-center text-blue-600 dark:text-blue-300 mt-2">در حال بارگذاری...</p>
                    ) : buyerPaymentCode ? (
                        <>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-300 mt-2 text-center font-mono">
                                {buyerPaymentCode}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                                این کد را با فروشندگان به اشتراک بگذارید تا پرداخت‌های امن برای شما ایجاد کنند
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(buyerPaymentCode);
                                    showNotification('کد کپی شد', 'success');
                                }}
                                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                            >
                                📋 کپی کردن کد
                            </button>
                        </>
                    ) : (
                        <p className="text-red-600 dark:text-red-300 mt-2">خطا در بارگذاری کد</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SecurePaymentSection;
