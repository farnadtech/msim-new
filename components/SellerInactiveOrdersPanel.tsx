import React, { useState, useEffect } from 'react';
import api from '../services/api-supabase';
import { PurchaseOrder, SupportMessage } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import CountdownTimer from './CountdownTimer';

interface SellerInactiveOrdersPanelProps {
    userId: string;
}

const SellerInactiveOrdersPanel: React.FC<SellerInactiveOrdersPanelProps> = ({ userId }) => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [codeInput, setCodeInput] = useState<{[key: number]: string}>({});
    const [messages, setMessages] = useState<{[key: number]: SupportMessage[]}>({});
    const [showMessages, setShowMessages] = useState<{[key: number]: boolean}>({});
    const [replyMessage, setReplyMessage] = useState<{[key: number]: string}>({});
    const { showNotification } = useNotification();

    useEffect(() => {
        loadOrders();
    }, [userId]);

    const loadOrders = async () => {
        try {
            console.log('🔍 Loading orders for seller:', userId);
            const sellerOrders = await api.getPurchaseOrders(userId, 'seller');
            console.log('📦 All seller orders:', sellerOrders);
            const inactiveOrders = sellerOrders.filter((o: PurchaseOrder) => o.line_type === 'inactive');
            console.log('📱 Inactive orders:', inactiveOrders);
            setOrders(inactiveOrders);
            
            // بارگذاری پیام‌ها برای سفارشات pending (که ممکن است گزارش مشکل داشته باشند)
            for (const order of inactiveOrders) {
                if (order.status === 'pending') {
                    await loadMessages(order.id);
                }
            }
        } catch (error) {
            console.error('❌ Error loading orders:', error);
            showNotification('خطا در بارگذاری سفارشات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendCode = async (orderId: number) => {
        const code = codeInput[orderId];
        if (!code || code.length !== 6) {
            showNotification('لطفا کد 6 رقمی وارد کنید', 'error');
            return;
        }

        try {
            console.log('📄 Looking for activation request for order:', orderId);
            // Get the activation request for this order (seller's orders only)
            const activationRequests = await api.getActivationRequests({ sellerId: userId });
            console.log('📄 Seller activation requests:', activationRequests);
            const request = activationRequests.find(r => r.purchase_order_id === orderId);
            
            if (!request) {
                console.error('❌ No activation request found for order:', orderId);
                showNotification('درخواست فعال‌سازی يافت نشد', 'error');
                return;
            }
            
            console.log('📄 Found activation request:', request);
            await api.sendActivationCodeForZeroLine(request.id, code);
            showNotification('کد فعالسازی برای خریدار ارسال شد', 'success');
            setCodeInput({...codeInput, [orderId]: ''});
            loadOrders();
        } catch (error) {
            console.error('❌ Error sending code:', error);
            showNotification(
                error instanceof Error ? error.message : 'خطا در ارسال کد',
                'error'
            );
        }
    };

    const loadMessages = async (orderId: number) => {
        try {
            const msgs = await api.getSupportMessages(orderId);
            setMessages({...messages, [orderId]: msgs});
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const toggleMessages = async (orderId: number) => {
        const isShowing = showMessages[orderId];
        if (!isShowing) {
            await loadMessages(orderId);
        }
        setShowMessages({...showMessages, [orderId]: !isShowing});
    };

    const handleReply = async (orderId: number, buyerId: string) => {
        const message = replyMessage[orderId];
        if (!message) {
            showNotification('لطفا پیام را وارد کنید', 'error');
            return;
        }

        try {
            await api.sendSupportMessage(orderId, userId, buyerId, message, 'response');
            showNotification('پاسخ ارسال شد', 'success');
            setReplyMessage({...replyMessage, [orderId]: ''});
            await loadMessages(orderId);
        } catch (error) {
            showNotification('خطا در ارسال پاسخ', 'error');
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
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">📱 خطوط صفر - سفارشات</h2>
            
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
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                📱 خط صفر
                            </span>
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

                        {/* مهلت 48 ساعته فعال‌سازی */}
                        {order.activation_deadline && !order.is_cancelled && (order.status === 'pending' || order.status === 'code_sent') && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 border-r-4 border-orange-500 p-4 mb-4 rounded">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-orange-800 dark:text-orange-300">⚠️ مهلت فعال‌سازی خط:</p>
                                        <p className="text-sm text-orange-700 dark:text-orange-400">باید ظرف 48 ساعت خط را فعال کنید</p>
                                    </div>
                                    <div className="text-left">
                                        <CountdownTimer 
                                            targetDate={order.activation_deadline}
                                            onExpire={() => {
                                                loadOrders();
                                            }}
                                            className="text-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* فروشنده کد را وارد می‌کند */}
                        {order.status === 'pending' && (
                            <>
                                {/* نمایش گزارش مشکل اگر وجود دارد */}
                                {messages[order.id] && messages[order.id].some(m => m.message_type === 'problem_report') && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 p-4 mb-4 rounded">
                                        <p className="font-semibold text-red-800 dark:text-red-300 mb-2">⚠️ خریدار گزارش مشکل داده است:</p>
                                        {messages[order.id]
                                            .filter(m => m.message_type === 'problem_report')
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // مرتب‌سازی از جدید به قدیم
                                            .slice(0, 1) // فقط آخرین (جدیدترین) گزارش
                                            .map((msg) => (
                                                <div key={msg.id} className="bg-red-100 dark:bg-red-900/30 p-3 rounded">
                                                    <p className="text-sm text-red-900 dark:text-red-200">{msg.message}</p>
                                                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                                                        {new Date(msg.created_at).toLocaleString('fa-IR')}
                                                    </p>
                                                </div>
                                            ))}
                                        <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                                            کد قبلی پاک شده است. لطفاً کد جدید ارسال کنید.
                                        </p>
                                    </div>
                                )}
                                
                                <div className="border-t pt-4 mt-4">
                                    <h5 className="font-semibold mb-3">🔐 وارد کردن کد فعالسازی برای خریدار</h5>
                                    <p className="text-sm text-gray-600 mb-2">کد 6 رقمی را وارد کنید تا برای خریدار نمایش داده شود</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="کد 6 رقمی"
                                            value={codeInput[order.id] || ''}
                                            onChange={(e) => setCodeInput({...codeInput, [order.id]: e.target.value})}
                                            maxLength={6}
                                            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <button
                                            onClick={() => handleSendCode(order.id)}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                                        >
                                            📤 ارسال کد
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {order.status === 'code_sent' && (
                            <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-3">
                                <p className="text-sm font-semibold">⏳ در انتظار تایید کد توسط خریدار</p>
                            </div>
                        )}

                        {order.status === 'completed' && (
                            <div className="bg-green-100 dark:bg-green-900/30 rounded p-3">
                                <p className="text-sm font-semibold">✅ سفارش تکمیل شد و پول واریز شد</p>
                            </div>
                        )}

                        {/* دکمه مشاهده پیام‌ها - برای همه وضعیت‌ها */}
                        {['pending', 'code_sent', 'completed'].includes(order.status) && (
                            <div className="border-t pt-4 mt-4">
                                <button
                                    onClick={() => toggleMessages(order.id)}
                                    className="w-full bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
                                >
                                    💬 {showMessages[order.id] ? 'بستن' : 'مشاهده'} پیام‌های خریدار
                                </button>

                                {showMessages[order.id] && (
                                    <div className="mt-4 space-y-3">
                                        <div className="max-h-60 overflow-y-auto space-y-2">
                                            {messages[order.id] && messages[order.id].length > 0 ? (
                                                messages[order.id].map((msg) => (
                                                    <div key={msg.id} className={`p-3 rounded-lg ${
                                                        msg.sender_id === userId 
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 mr-8' 
                                                            : msg.message_type === 'problem_report'
                                                            ? 'bg-red-100 dark:bg-red-900/30 ml-8'
                                                            : 'bg-gray-100 dark:bg-gray-700 ml-8'
                                                    }`}>
                                                        <p className="text-sm">{msg.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(msg.created_at).toLocaleString('fa-IR')}
                                                            {msg.message_type === 'problem_report' && ' - گزارش مشکل'}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500 text-center py-4">هنوز پیامی وجود ندارد</p>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="پاسخ خود را بنویسید..."
                                                value={replyMessage[order.id] || ''}
                                                onChange={(e) => setReplyMessage({...replyMessage, [order.id]: e.target.value})}
                                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
                                            />
                                            <button
                                                onClick={() => handleReply(order.id, order.buyer_id)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                            >
                                                📤 ارسال
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SellerInactiveOrdersPanel;
