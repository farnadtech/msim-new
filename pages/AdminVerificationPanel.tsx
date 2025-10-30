import React, { useState, useEffect } from 'react';
import api from '../services/api-supabase';
import { PurchaseOrder } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import DashboardLayout from '../components/DashboardLayout';

const AdminVerificationPanel: React.FC = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);;
    const [loading, setLoading] = useState(true);
    const [documentUrl, setDocumentUrl] = useState<{[key: number]: string}>({});
    const [rejectReason, setRejectReason] = useState<{[key: number]: string}>({});
    const [showRejectForm, setShowRejectForm] = useState<{[key: number]: boolean}>({});
    const { showNotification } = useNotification();

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const allOrders = await api.getPurchaseOrders('', 'admin');
            const pendingOrders = allOrders.filter((o: PurchaseOrder) => 
                o.line_type === 'active' && o.status === 'document_submitted'
            );
            setOrders(pendingOrders);
            
            // بارگذاری مدارک از database
            for (const order of pendingOrders) {
                const docUrl = await api.getSellerDocument(order.id);
                if (docUrl) {
                    setDocumentUrl(prev => ({
                        ...prev,
                        [order.id]: docUrl
                    }));
                }
            }
        } catch (error) {
            showNotification('خطا در بارگذاری سفارشات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (order: PurchaseOrder) => {
        try {
            // تغییر وضعیت به completed و واریز پول
            await api.updatePurchaseOrderStatus(order.id, 'completed');
            await api.approvePurchase(order.id, 'admin_user_id');
            
            showNotification('✅ سفارش تایید شد و پول واریز شد', 'success');
            loadOrders();
        } catch (error) {
            showNotification('خطا در تایید سفارش', 'error');
        }
    };

    const handleReject = async (orderId: number) => {
        const reason = rejectReason[orderId];
        if (!reason.trim()) {
            showNotification('لطفا دلیل رد را وارد کنید', 'error');
            return;
        }
        
        try {
            // تغییر وضعیت به document_rejected
            await api.updatePurchaseOrderStatus(orderId, 'document_rejected');
            
            // ارسال پیام به فروشنده
            const order = orders.find(o => o.id === orderId);
            if (order) {
                await api.sendSupportMessage(
                    orderId,
                    'admin_id',
                    order.seller_id,
                    `مدرک شما رد شده است. دلیل: ${reason}`,
                    'response'
                );
            }
            
            showNotification('⚠️ سند رد شد', 'success');
            loadOrders();
        } catch (error) {
            showNotification('خطا در رد سند', 'error');
        }
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
            <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">📄 تایید اسناد فروشندگان</h2>
                
                {orders.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                        <p className="text-gray-500">سندی برای تایید وجود ندارد</p>
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
                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                                        ⏳ در انتظار تایید
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">قیمت</p>
                                        <p className="font-bold">{order.price.toLocaleString('fa-IR')} تومان</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">فروشنده دریافت خواهد کرد</p>
                                        <p className="font-bold text-green-600">{order.seller_received_amount.toLocaleString('fa-IR')} تومان</p>
                                    </div>
                                </div>

                                {/* نمایش مدرک */}
                                <div className="border-t pt-4 mt-4">
                                    <h5 className="font-semibold mb-3">📄 مدرک دستنویس:</h5>
                                    {documentUrl[order.id] ? (
                                        <div className="space-y-3">
                                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                                                <img 
                                                    src={documentUrl[order.id]} 
                                                    alt="Document" 
                                                    className="w-full max-h-96 object-cover rounded-lg"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Document+Not+Found';
                                                    }}
                                                />
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 break-all"style={{ direction: 'ltr' }}>
                                                {documentUrl[order.id]}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">مدرکی یافت نشد</p>
                                    )}
                                </div>

                                {/* دکمه‌های تایید و رد */}
                                <div className="border-t pt-4 mt-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleApprove(order)}
                                            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold transition"
                                        >
                                            ✅ تایید و واریز پول
                                        </button>
                                        <button
                                            onClick={() => setShowRejectForm(prev => ({...prev, [order.id]: !prev[order.id]}))}
                                            className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-semibold transition"
                                        >
                                            ❌ رد کردن
                                        </button>
                                    </div>

                                    {/* فرم رد کردن */}
                                    {showRejectForm[order.id] && (
                                        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg space-y-3">
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                                دلیل رد را وارد کنید:
                                            </p>
                                            <textarea
                                                placeholder="مثال: مدرک نامشخص است، امضا ندارد، تاریخ گذشته است..."
                                                value={rejectReason[order.id] || ''}
                                                onChange={(e) => setRejectReason(prev => ({...prev, [order.id]: e.target.value}))}
                                                className="w-full px-3 py-2 border border-red-300 rounded-lg dark:bg-gray-700 dark:border-red-600"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReject(order.id)}
                                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
                                                >
                                                    ✓ تایید رد
                                                </button>
                                                <button
                                                    onClick={() => setShowRejectForm(prev => ({...prev, [order.id]: false}))}
                                                    className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 font-semibold"
                                                >
                                                    انصراف
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminVerificationPanel;
