import React, { useState, useEffect } from 'react';
import api from '../services/api-supabase';
import { PurchaseOrder } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface SellerActiveOrdersPanelProps {
    userId: string;
}

const SellerActiveOrdersPanel: React.FC<SellerActiveOrdersPanelProps> = ({ userId }) => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [verificationCode, setVerificationCode] = useState<{[key: number]: string}>({});
    const [uploadedDoc, setUploadedDoc] = useState<{[key: number]: File | null}>({});
    const { showNotification } = useNotification();

    useEffect(() => {
        loadOrders();
    }, [userId]);

    const loadOrders = async () => {
        try {
            const sellerOrders = await api.getPurchaseOrders(userId, 'seller');
            setOrders(sellerOrders.filter((o: PurchaseOrder) => o.line_type === 'active'));
        } catch (error) {
            showNotification('خطا در بارگذاری سفارشات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendPhoneVerification = async (orderId: number) => {
        try {
            // ارسال SMS به شماره خط
            const phoneNumber = '09121234567'; // بعدا از SIM card گرفته می‌شود
            await api.sendPhoneVerificationCode(orderId, phoneNumber);
            showNotification('کد تایید به شماره ارسال شد', 'success');
            loadOrders();
        } catch (error) {
            showNotification('خطا در ارسال کد', 'error');
        }
    };

    const handleVerifyCode = async (orderId: number) => {
        const code = verificationCode[orderId];
        if (!code || code !== '123456') { // کد تست
            showNotification('کد نامعتبر است', 'error');
            return;
        }

        try {
            // به روزرسانی وضعیت به verified
            await api.updatePurchaseOrderStatus(orderId, 'verified');
            showNotification('احراز هویت با موفقیت انجام شد', 'success');
            setVerificationCode({...verificationCode, [orderId]: ''});
            loadOrders();
        } catch (error) {
            showNotification('خطا در تایید کد', 'error');
        }
    };

    const handleUploadDocument = async (orderId: number, userId: string) => {
        const file = uploadedDoc[orderId];
        if (!file) {
            showNotification('لطفا فایل را انتخاب کنید', 'error');
            return;
        }

        try {
            // آپلود فایل به Supabase Storage
            const documentUrl = await api.uploadSellerDocument(file, userId, orderId);
            
            // ذخیره URL در database
            await api.submitSellerDocument(orderId, documentUrl, 'handwriting');
            
            showNotification('سند با موفقیت آپلود شد', 'success');
            setUploadedDoc({...uploadedDoc, [orderId]: null});
            loadOrders();
        } catch (error) {
            showNotification('خطا در آپلود سند', 'error');
        }
    };

    const getStatusText = (status: string) => {
        switch(status) {
            case 'pending': return '⏳ در انتظار احراز هویت';
            case 'verified': return '📋 در انتظار آپلود سند';
            case 'document_submitted': return '⏳ در انتظار تایید ادمین';
            case 'completed': return '✅ تکمیل شده';
            default: return status;
        }
    };

    if (loading) {
        return <div className="text-center py-8">در حال بارگذاری...</div>;
    }

    if (orders.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">سفارشی وجود ندارد</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">📳 خطوط فعال - سفارشات</h2>
            
            <div className="space-y-6">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold">سفارش #{order.id}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                    📱 شماره خط: <span style={{ direction: 'ltr' }} className="font-bold">{(order as any).sim_number || order.sim_card_id}</span>
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                📳 خط فعال
                            </span>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-3 mb-4">
                            <p className="text-sm font-semibold">{getStatusText(order.status)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">قیمت</p>
                                <p className="font-bold">{order.price.toLocaleString('fa-IR')} تومان</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">شما دریافت خواهید کرد</p>
                                <p className="font-bold text-green-600">{order.seller_received_amount.toLocaleString('fa-IR')} تومان</p>
                            </div>
                        </div>

                        {/* مرحله 1: ارسال SMS احراز هویت */}
                        {order.status === 'pending' && (
                            <button
                                onClick={() => handleSendPhoneVerification(order.id)}
                                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                            >
                                📱 احراز هویت - ارسال کد به شماره
                            </button>
                        )}

                        {/* مرحله 2: وارد کردن کد */}
                        {order.status === 'pending' && (
                            <div className="border-t pt-4 mt-4">
                                <h5 className="font-semibold mb-3">🔐 وارد کردن کد تایید (123456)</h5>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="کد 6 رقمی"
                                        value={verificationCode[order.id] || ''}
                                        onChange={(e) => setVerificationCode({...verificationCode, [order.id]: e.target.value})}
                                        maxLength={6}
                                        className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <button
                                        onClick={() => handleVerifyCode(order.id)}
                                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                                    >
                                        ✅ تایید
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* مرحله 3: آپلود فرم */}
                        {order.status === 'verified' && (
                            <div className="border-t pt-4 mt-4">
                                <h5 className="font-semibold mb-3">📄 آپلود فرم دستنویس</h5>
                                <div className="space-y-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setUploadedDoc({...uploadedDoc, [order.id]: e.target.files?.[0] || null})}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                    <button
                                        onClick={() => handleUploadDocument(order.id, userId)}
                                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold"
                                    >
                                        📤 ارسال سند
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* مرحله 4: انتظار تایید ادمین */}
                        {order.status === 'document_submitted' && (
                            <div className="bg-orange-100 dark:bg-orange-900/30 rounded p-3">
                                <p className="text-sm font-semibold">📞 پشتیبان به زودی با شما تماس خواهد گرفت</p>
                            </div>
                        )}

                        {order.status === 'completed' && (
                            <div className="bg-green-100 dark:bg-green-900/30 rounded p-3">
                                <p className="text-sm font-semibold">✅ سفارش تکمیل شد و پول واریز شد</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SellerActiveOrdersPanel;
