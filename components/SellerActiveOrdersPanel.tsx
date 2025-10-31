import React, { useState, useEffect } from 'react';
import api from '../services/api-supabase';
import { PurchaseOrder, SupportMessage } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface SellerActiveOrdersPanelProps {
    userId: string;
}

const SellerActiveOrdersPanel: React.FC<SellerActiveOrdersPanelProps> = ({ userId }) => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [verificationCode, setVerificationCode] = useState<{[key: number]: string}>({});
    const [uploadedDoc, setUploadedDoc] = useState<{[key: number]: File | null}>({});
    const [messages, setMessages] = useState<{[key: number]: SupportMessage[]}>({});
    const [showMessages, setShowMessages] = useState<{[key: number]: boolean}>({});
    const [uploadingProgress, setUploadingProgress] = useState<{[key: number]: boolean}>({});
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

    const loadMessages = async (orderId: number) => {
        try {
            const msgs = await api.getSupportMessages(orderId);
            setMessages(prev => ({...prev, [orderId]: msgs}));
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const toggleMessages = async (orderId: number) => {
        const isShowing = showMessages[orderId];
        if (!isShowing) {
            // بارگذاری پیام‌ها با تأخیر کوچک برای اطمینان از ذخیره
            setTimeout(() => {
                loadMessages(orderId);
            }, 300);
        }
        setShowMessages(prev => ({...prev, [orderId]: !isShowing}));
    };

    const handleSendPhoneVerification = async (orderId: number) => {
        try {
            const phoneNumber = '09121234567';
            await api.sendPhoneVerificationCode(orderId, phoneNumber);
            showNotification('کد تایید به شماره ارسال شد', 'success');
            loadOrders();
        } catch (error) {
            showNotification('خطا در ارسال کد', 'error');
        }
    };

    const handleVerifyCode = async (orderId: number) => {
        const code = verificationCode[orderId];
        if (!code || code !== '123456') {
            showNotification('کد نامعتبر است', 'error');
            return;
        }

        try {
            await api.updatePurchaseOrderStatus(orderId, 'verified');
            showNotification('احراز هویت با موفقیت انجام شد', 'success');
            setVerificationCode(prev => ({...prev, [orderId]: ''}));
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
            // شروع progress
            setUploadingProgress(prev => ({...prev, [orderId]: true}));
            
            console.log('Uploading document for order:', orderId);
            
            // آپلود فایل به Supabase Storage
            const documentUrl = await api.uploadSellerDocument(file, userId, orderId);
            console.log('Document uploaded, URL:', documentUrl);
            
            // ذخیره URL در database
            const docId = await api.submitSellerDocument(orderId, documentUrl, 'handwriting');
            console.log('Document submitted to database, ID:', docId);
            
            showNotification('سند با موفقیت آپلود شد', 'success');
            setUploadedDoc(prev => ({...prev, [orderId]: null}));
            setUploadingProgress(prev => ({...prev, [orderId]: false}));
            loadOrders();
        } catch (error: any) {
            console.error('Upload error for order', orderId, ':', error);
            setUploadingProgress(prev => ({...prev, [orderId]: false}));
            showNotification(`خطا در آپلود سند: ${error.message || 'خطای نامشخص'}`, 'error');
        }
    };

    const getStatusText = (status: string) => {
        switch(status) {
            case 'pending': return '⏳ در انتظار احراز هویت';
            case 'verified': return '📋 در انتظار آپلود سند';
            case 'document_submitted': return '⏳ در انتظار تایید ادمین';
            case 'document_rejected': return '⚠️ سند رد شده - می‌توانید مدرک جدید ارسال کنید';
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
                            <div className="border-t pt-4 mt-4 space-y-3">
                                <button
                                    onClick={() => handleSendPhoneVerification(order.id)}
                                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                                >
                                    📱 احراز هویت - ارسال کد به شماره
                                </button>

                                {/* مرحله 2: وارد کردن کد */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                                    <h5 className="font-semibold mb-3">🔐 وارد کردن کد تایید (123456)</h5>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="کد 6 رقمی"
                                            value={verificationCode[order.id] || ''}
                                            onChange={(e) => setVerificationCode(prev => ({...prev, [order.id]: e.target.value}))}
                                            maxLength={6}
                                            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-600"
                                        />
                                        <button
                                            onClick={() => handleVerifyCode(order.id)}
                                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                                        >
                                            ✅ تایید
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* مرحله 3: آپلود فرم */}
                        {(order.status === 'verified' || order.status === 'document_rejected') && (
                            <div className="border-t pt-4 mt-4">
                                <h5 className="font-semibold mb-3">📄 آپلود فرم دستنویس</h5>
                                <div className="space-y-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setUploadedDoc(prev => ({...prev, [order.id]: e.target.files?.[0] || null}))}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                                        disabled={uploadingProgress[order.id]}
                                    />
                                    
                                    {/* Progress bar */}
                                    {uploadingProgress[order.id] && (
                                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center max-w-sm">
                                                <div className="mb-4">
                                                    <div className="inline-block">
                                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">در حال آپلود...</h3>
                                                <p className="text-gray-600 dark:text-gray-400">لطفا صبر کنید، فایل شما آپلود می‌شود</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={() => handleUploadDocument(order.id, userId)}
                                        disabled={uploadingProgress[order.id]}
                                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {uploadingProgress[order.id] ? '⏳ در حال آپلود...' : '📤 ارسال سند'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* نمایش دلیل رد و امکان ارسال مجدد */}
                        {order.status === 'document_rejected' && (
                            <div className="border-t pt-4 mt-4">
                                <button
                                    onClick={() => toggleMessages(order.id)}
                                    className="w-full bg-red-200 dark:bg-red-900/30 px-4 py-2 rounded-lg hover:bg-red-300 dark:hover:bg-red-800 font-semibold"
                                >
                                    💬 {showMessages[order.id] ? 'بستن' : 'مشاهده'} دلیل رد توسط ادمین
                                </button>

                                {showMessages[order.id] && (
                                    <div className="mt-4 space-y-3">
                                        <div className="max-h-60 overflow-y-auto space-y-2 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                            {messages[order.id] && messages[order.id].length > 0 ? (
                                                messages[order.id].filter(msg => msg.message_type === 'response').map((msg) => (
                                                    <div key={msg.id} className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                                                        <p className="text-sm">{msg.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(msg.created_at).toLocaleString('fa-IR')}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500 text-center py-2">هنوز دلیل دریافت نشده</p>
                                            )}
                                        </div>
                                    </div>
                                )}
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
