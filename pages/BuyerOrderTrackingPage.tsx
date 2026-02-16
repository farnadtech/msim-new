import React, { useState, useEffect } from 'react';
import api from '../services/api-supabase';
import { PurchaseOrder, SupportMessage } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import DashboardLayout from '../components/DashboardLayout';

const BuyerOrderTrackingPage: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activationCodes, setActivationCodes] = useState<{[key: number]: string}>({});
    const [deliveryMethods, setDeliveryMethods] = useState<{[key: number]: string}>({});
    const [codeUnderReview, setCodeUnderReview] = useState<{[key: number]: boolean}>({});
    const [messages, setMessages] = useState<{[key: number]: SupportMessage[]}>({});
    const [showMessages, setShowMessages] = useState<{[key: number]: boolean}>({});
    const [replyMessage, setReplyMessage] = useState<{[key: number]: string}>({});
    const [problemMessage, setProblemMessage] = useState('');
    const [showProblemForm, setShowProblemForm] = useState<{[key: number]: boolean}>({});
    const { showNotification } = useNotification();

    useEffect(() => {
        if (user) loadOrders();
    }, [user]);

    const loadOrders = async () => {
        if (!user) return;
        try {
            const buyerOrders = await api.getPurchaseOrders(user.id, 'buyer');
            setOrders(buyerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            
            // بارگذاری اطلاعات activation request برای خطوط صفر
            for (const order of buyerOrders) {
                if (order.line_type === 'inactive') {
                    // Load activation request to get delivery method
                    loadActivationRequestInfo(order.id);
                    
                    // Only load activation code if status is code_sent
                    if (order.status === 'code_sent') {
                        loadActivationCode(order.id);
                    }
                }
            }
        } catch (error) {
            showNotification('خطا در بارگذاری سفارشات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadActivationRequestInfo = async (orderId: number) => {
        try {
            const { data } = await api.supabase
                .from('activation_requests')
                .select('delivery_method, activation_code')
                .eq('purchase_order_id', orderId)
                .single();
            
            if (data) {
                setDeliveryMethods(prev => ({...prev, [orderId]: data.delivery_method}));
                // If physical delivery and code exists, it's under admin review
                if (data.delivery_method === 'physical_card' && data.activation_code) {
                    setCodeUnderReview(prev => ({...prev, [orderId]: true}));
                }
            }
        } catch (error) {
            // Ignore error
        }
    };

    const loadActivationCode = async (orderId: number) => {
        try {
            const code = await api.getActivationCode(orderId);
            if (code) {
                setActivationCodes(prev => ({...prev, [orderId]: code}));
            } else {
                // If code is not found, try again after a short delay
                setTimeout(async () => {
                    const retryCode = await api.getActivationCode(orderId);
                    if (retryCode) {
                        setActivationCodes(prev => ({...prev, [orderId]: retryCode}));
                    } else {
                    }
                }, 2000); // افزایش تاخیر به 2 ثانیه
            }
        } catch (error) {
            // تلاش مجدد بعد از 3 ثانیه
            setTimeout(async () => {
                try {
                    const retryCode = await api.getActivationCode(orderId);
                    if (retryCode) {
                        setActivationCodes(prev => ({...prev, [orderId]: retryCode}));
                    }
                } catch (retryError) {
                }
            }, 3000);
        }
    };

    const loadMessages = async (orderId: number) => {
        try {
            const msgs = await api.getSupportMessages(orderId);
            setMessages(prev => ({...prev, [orderId]: msgs}));
        } catch (error) {
        }
    };

    const toggleMessages = async (orderId: number) => {
        const isShowing = showMessages[orderId];
        if (!isShowing) {
            await loadMessages(orderId);
        }
        setShowMessages(prev => ({...prev, [orderId]: !isShowing}));
    };

    const handleReply = async (orderId: number, sellerId: string) => {
        const message = replyMessage[orderId];
        if (!message || !user) {
            showNotification('لطفا پیام را وارد کنید', 'error');
            return;
        }

        try {
            await api.sendSupportMessage(orderId, user.id, sellerId, message, 'response');
            showNotification('پاسخ ارسال شد', 'success');
            setReplyMessage(prev => ({...prev, [orderId]: ''}));
            await loadMessages(orderId);
        } catch (error) {
            showNotification('خطا در ارسال پاسخ', 'error');
        }
    };

    const handleConfirmCode = async (order: PurchaseOrder) => {
        // Get the actual activation code for this order
        const actualCode = activationCodes[order.id];
        if (!actualCode) {
            showNotification('کد فعالسازی یافت نشد', 'error');
            return;
        }
        
        try {
            const verified = await api.verifyActivationCode(order.id, actualCode);
            if (verified) {
                showNotification('✅ کد تایید شد و پول به فروشنده واریز شد', 'success');
                loadOrders();
            } else {
                showNotification('کد وارد شده اشتباه است', 'error');
            }
        } catch (error) {
            showNotification('خطا در تایید کد', 'error');
        }
    };

    const handleReportProblem = async (order: PurchaseOrder) => {
        if (!problemMessage || !user) {
            showNotification('پیام را وارد کنید', 'error');
            return;
        }
        
        try {
            await api.sendSupportMessage(
                order.id,
                user.id,
                order.seller_id,
                problemMessage,
                'problem_report'
            );
            showNotification('گزارش مشکل ارسال شد. کد قبلی پاک شد و فروشنده باید کد جدید ارسال کند.', 'success');
            setProblemMessage('');
            setShowProblemForm(prev => ({...prev, [order.id]: false}));
            // پاک کردن کد از state
            setActivationCodes(prev => {
                const newCodes = {...prev};
                delete newCodes[order.id];
                return newCodes;
            });
            // بارگذاری مجدد پیام‌ها
            await loadMessages(order.id);
            // بارگذاری مجدد سفارشات
            await loadOrders();
        } catch (error) {
            showNotification('خطا در ارسال گزارش', 'error');
        }
    };

    const getStatusText = (order: PurchaseOrder) => {
        if (order.line_type === 'inactive') {
            if (order.status === 'pending') return '⏳ در انتظار ارسال کد از فروشنده';
            if (order.status === 'code_sent') return '📥 کد دریافت شد - لطفا تایید کنید';
            if (order.status === 'completed') return '✅ تکمیل شده';
        } else {
            if (order.status === 'pending') return '⏳ در انتظار آپلود مدارک فروشنده';
            if (order.status === 'document_submitted') return '⏳ در انتظار تایید ادمین';
            if (order.status === 'document_rejected') return '⚠️ مدارک فروشنده رد شده - در حال بررسی مجدد';
            if (order.status === 'verified') return '✅ مدارک تایید شد - منتظر تماس کارشناس';
            if (order.status === 'completed') return '✅ تکمیل شده';
        }
        return order.status;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="text-center py-8">در حال بارگذاری...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">📦 پیگیری سفارشات</h2>
                
                {orders.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                        <p className="text-gray-500">سفارشی وجود ندارد</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold">سفارش #{order.id}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                            📱 شماره خط: <span style={{ direction: 'ltr' }} className="font-bold">{(order as any).sim_number || order.sim_card_id}</span>
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        order.line_type === 'inactive' 
                                            ? 'bg-yellow-100 text-yellow-800' 
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {order.line_type === 'inactive' ? '📱 خط صفر' : '📳 خط فعال'}
                                    </span>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-3 mb-4">
                                    <p className="text-sm font-semibold">{getStatusText(order)}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">قیمت</p>
                                        <p className="font-bold">{order.price.toLocaleString('fa-IR')} تومان</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">تاریخ سفارش</p>
                                        <p className="font-bold">{new Date(order.created_at).toLocaleDateString('fa-IR')}</p>
                                    </div>
                                </div>

                                {/* پیام برای تحویل فیزیکی */}
                                {order.line_type === 'inactive' && 
                                 deliveryMethods[order.id] === 'physical_card' && (
                                    <div className="border-t pt-4 mt-4">
                                        {codeUnderReview[order.id] ? (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                                                <p className="text-lg font-semibold mb-2">⏳ کد در حال بررسی توسط ادمین</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    فروشنده کد فعال‌سازی را ارسال کرده و در حال بررسی توسط ادمین است. پس از تایید، سیمکارت به آدرس شما ارسال خواهد شد.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                                                <p className="text-lg font-semibold mb-2">📦 تحویل فیزیکی سیمکارت</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    سیمکارت به آدرس شما ارسال خواهد شد. لطفاً منتظر تماس پشتیبانی بمانید.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* نمایش کد فقط برای تحویل با کد فعال‌سازی */}
                                {order.line_type === 'inactive' && 
                                 order.status === 'code_sent' && 
                                 deliveryMethods[order.id] === 'activation_code' && (
                                    <div className="border-t pt-4 mt-4">
                                        {activationCodes[order.id] ? (
                                            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 mb-4">
                                                <p className="text-sm font-semibold mb-2">🔐 کد فعالسازی دریافتی:</p>
                                                <p className="text-3xl font-bold text-center text-green-700 dark:text-green-300 tracking-wider">
                                                    {activationCodes[order.id]}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 mb-4">
                                                <p className="text-sm font-semibold mb-2">⏳ در حال بارگذاری کد فعالسازی...</p>
                                                <button
                                                    onClick={() => loadActivationCode(order.id)}
                                                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                                                >
                                                    🔄 تلاش مجدد
                                                </button>
                                            </div>
                                        )}

                                        {activationCodes[order.id] && (
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <button
                                                    onClick={() => handleConfirmCode(order)}
                                                    className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold"
                                                >
                                                    ✅ تایید کد و تکمیل
                                                </button>
                                                <button
                                                    onClick={() => setShowProblemForm(prev => ({...prev, [order.id]: !prev[order.id]}))}
                                                    className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-semibold"
                                                >
                                                    ⚠️ گزارش مشکل
                                                </button>
                                            </div>
                                        )}

                                        {showProblemForm[order.id] && (
                                            <div className="mt-4 space-y-2 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                                                <textarea
                                                    placeholder="مشکل خود را توضیح دهید..."
                                                    value={problemMessage}
                                                    onChange={(e) => setProblemMessage(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-600"
                                                    rows={3}
                                                />
                                                <button
                                                    onClick={() => handleReportProblem(order)}
                                                    className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 font-semibold"
                                                >
                                                    📤 ارسال گزارش
                                                </button>
                                            </div>
                                        )}

                                        {/* نمایش پیام‌های فروشنده */}
                                        <button
                                            onClick={() => toggleMessages(order.id)}
                                            className="w-full mt-4 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
                                        >
                                            💬 {showMessages[order.id] ? 'بستن' : 'مشاهده'} پیام‌های فروشنده
                                        </button>

                                        {showMessages[order.id] && (
                                            <div className="mt-4 space-y-3">
                                                <div className="max-h-60 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                                    {messages[order.id]?.length === 0 ? (
                                                        <p className="text-sm text-gray-500">پیامی وجود ندارد</p>
                                                    ) : (
                                                        messages[order.id]?.map((msg) => (
                                                            <div key={msg.id} className={`p-3 rounded-lg ${
                                                                msg.sender_id === user?.id 
                                                                    ? 'bg-blue-100 dark:bg-blue-900/30 mr-8' 
                                                                    : 'bg-gray-100 dark:bg-gray-600 ml-8'
                                                            }`}>
                                                                <p className="text-sm">{msg.message}</p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {new Date(msg.created_at).toLocaleString('fa-IR')}
                                                                </p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="پاسخ خود را بنویسید..."
                                                        value={replyMessage[order.id] || ''}
                                                        onChange={(e) => setReplyMessage(prev => ({...prev, [order.id]: e.target.value}))}
                                                        className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-600"
                                                    />
                                                    <button
                                                        onClick={() => handleReply(order.id, order.seller_id)}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                                    >
                                                        📤 ارسال
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* وضعیت خطوط فعال */}
                                {order.line_type === 'active' && ['verified', 'document_submitted'].includes(order.status) && (
                                    <div className="border-t pt-4 mt-4 bg-orange-50 dark:bg-orange-900/30 rounded p-3">
                                        <p className="text-sm font-semibold">📞 پشتیبان به زودی با شما تماس خواهد گرفت</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            لطفا منتظر بمانید تا کارشناسان مراحل نهایی را تکمیل کنند
                                        </p>
                                    </div>
                                )}

                                {order.status === 'completed' && (
                                    <div className="bg-green-100 dark:bg-green-900/30 rounded p-3">
                                        <p className="text-sm font-semibold">✅ خرید شما با موفقیت تکمیل شد!</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default BuyerOrderTrackingPage;
