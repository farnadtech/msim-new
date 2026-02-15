import React, { useState, useEffect } from 'react';
import api from '../services/api-supabase';
import { supabase } from '../services/supabase';
import { PurchaseOrder } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';

const AdminVerificationPanel: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [documentUrl, setDocumentUrl] = useState<{[key: number]: string}>({});
    const [rejectDocReason, setRejectDocReason] = useState<{[key: number]: string}>({});
    const [rejectFinalReason, setRejectFinalReason] = useState<{[key: number]: string}>({});
    const [showRejectDocForm, setShowRejectDocForm] = useState<{[key: number]: boolean}>({});
    const [showRejectFinalForm, setShowRejectFinalForm] = useState<{[key: number]: boolean}>({});
    const [buyerInfo, setBuyerInfo] = useState<{[key: string]: {name: string, phone: string}}>({});
    const { showNotification } = useNotification();

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const allOrders = await api.getPurchaseOrders('', 'admin');
            
            // نمایش دو دسته سفارش:
            // 1. سفارشات در مرحله تایید مدارک (document_submitted)
            // 2. سفارشات در مرحله تایید نهایی (verified)
            const pendingOrders = allOrders.filter((o: PurchaseOrder) => 
                o.line_type === 'active' && ['document_submitted', 'verified'].includes(o.status)
            );
            setOrders(pendingOrders);
            
            // بارگذاری اطلاعات خریداران
            const buyerIds = [...new Set(pendingOrders.map((o: PurchaseOrder) => o.buyer_id))];
            for (const buyerId of buyerIds) {
                try {
                    const { data: buyerData } = await supabase
                        .from('users')
                        .select('name, phone_number')
                        .eq('id', buyerId)
                        .single();
                    
                    if (buyerData) {
                        setBuyerInfo(prev => ({
                            ...prev,
                            [buyerId]: {
                                name: buyerData.name,
                                phone: buyerData.phone_number || 'ثبت نشده'
                            }
                        }));
                    }
                } catch (err) {
                    console.error('Error loading buyer info:', err);
                }
            }
            
            // بارگذاری مدارک برای سفارشات document_submitted
            pendingOrders.forEach((order) => {
                if (order.status === 'document_submitted') {
                    console.log('Loading document for order:', order.id);
                    api.getSellerDocument(order.id)
                        .then(docUrl => {
                            console.log('Document URL for order', order.id, ':', docUrl);
                            if (docUrl) {
                                setDocumentUrl(prev => ({
                                    ...prev,
                                    [order.id]: docUrl
                                }));
                            } else {
                                console.log('No document found for order:', order.id);
                            }
                        })
                        .catch(err => console.error('Error loading document for order', order.id, ':', err));
                }
            });
        } catch (error) {
            console.error('Error loading orders:', error);
            showNotification('خطا در بارگذاری سفارشات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDocument = async (order: PurchaseOrder) => {
        try {
            // تغییر وضعیت به verified (منتظر تایید نهایی ادمین)
            await api.updatePurchaseOrderStatus(order.id, 'verified');
            
            // اطلاع به فروشنده و خریدار که مدارک تایید شد
            if (user) {
                await api.sendSupportMessage(
                    order.id,
                    user.id,
                    order.seller_id,
                    '✅ مدارک شما تایید شد و منتظر تماس کارشناس هستید',
                    'response'
                );
            }
            
            showNotification('✅ مدارک تایید شد', 'success');
            loadOrders();
        } catch (error: any) {
            console.error('Approve document error:', error);
            showNotification(`خطا: ${error.message || 'خطای نامشخص'}`, 'error');
        }
    };

    const handleRejectDocument = async (orderId: number) => {
        const reason = rejectDocReason[orderId];
        if (!reason.trim()) {
            showNotification('لطفا دلیل رد را وارد کنید', 'error');
            return;
        }
        
        try {
            // تغییر وضعیت به document_rejected
            await api.updatePurchaseOrderStatus(orderId, 'document_rejected');
            
            // ارسال پیام به فروشنده
            const order = orders.find(o => o.id === orderId);
            if (order && user) {
                await api.sendSupportMessage(
                    orderId,
                    user.id,
                    order.seller_id,
                    `⚠️ مدارک شما رد شده است. دلیل: ${reason}`,
                    'response'
                );
            }
            
            showNotification('⚠️ مدارک رد شدند', 'success');
            loadOrders();
        } catch (error: any) {
            console.error('Reject document error:', error);
            showNotification(`خطا: ${error.message || 'خطای نامشخص'}`, 'error');
        }
    };

    const handleApproveFinal = async (order: PurchaseOrder) => {
        try {
            console.log('Final approving order:', order.id);
            
            // تغییر وضعیت به completed و واریز پول
            await api.updatePurchaseOrderStatus(order.id, 'completed');
            
            if (user) {
                console.log('Calling approvePurchase with:', { orderId: order.id, adminId: user.id });
                await api.approvePurchase(order.id, user.id);
            }
            
            // اطلاع به هر دو طرف
            if (user) {
                await api.sendSupportMessage(
                    order.id,
                    user.id,
                    order.buyer_id,
                    '✅ معامله شما تکمیل شد و پول به فروشنده منتقل شد',
                    'response'
                );
                
                await api.sendSupportMessage(
                    order.id,
                    user.id,
                    order.seller_id,
                    '💰 معامله تکمیل شد و پول به حساب شما واریز شد',
                    'response'
                );
            }
            
            showNotification('✅ معامله تکمیل شد و پول واریز شد', 'success');
            loadOrders();
        } catch (error: any) {
            console.error('Approve final error:', error);
            showNotification(`خطا: ${error.message || 'خطای نامشخص'}`, 'error');
        }
    };

    const handleRejectFinal = async (orderId: number) => {
        const reason = rejectFinalReason[orderId];
        if (!reason.trim()) {
            showNotification('لطفا دلیل را وارد کنید', 'error');
            return;
        }
        
        try {
            // Update purchase order status
            await api.updatePurchaseOrderStatus(orderId, 'cancelled');
            
            // بازگرداندن پول خریدار
            const order = orders.find(o => o.id === orderId);
            if (order && user) {
                console.log('Refunding buyer for order:', orderId);
                
                const { data: buyerData, error: buyerError } = await supabase
                    .from('users')
                    .select('blocked_balance, wallet_balance')
                    .eq('id', order.buyer_id)
                    .single();
                
                if (buyerError) {
                    console.error('Error fetching buyer:', buyerError);
                    throw new Error(buyerError.message);
                }
                
                console.log('Buyer data:', buyerData);
                
                if (buyerData) {
                    const refundAmount = order.buyer_blocked_amount;
                    const newBlocked = (buyerData.blocked_balance || 0) - refundAmount;
                    const newWallet = (buyerData.wallet_balance || 0) + refundAmount;
                    
                    console.log('Updating buyer balance:', { 
                        blocked: newBlocked, 
                        wallet: newWallet,
                        refund: refundAmount
                    });
                    
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ 
                            wallet_balance: newWallet,
                            blocked_balance: newBlocked
                        })
                        .eq('id', order.buyer_id);
                    
                    if (updateError) {
                        console.error('Error updating buyer balance:', updateError);
                        throw new Error(updateError.message);
                    }
                }
                
                // Update SIM card status to available (refund)
                const { error: simError } = await supabase
                    .from('sim_cards')
                    .update({ 
                        status: 'available',
                        sold_date: null
                    })
                    .eq('id', order.sim_card_id);
                
                if (simError) {
                    console.error('❌ Error updating SIM card status:', simError);
                    throw new Error(simError.message);
                }
                
                await api.sendSupportMessage(
                    orderId,
                    user.id,
                    order.seller_id,
                    `❌ معامله لغو شد. دلیل: ${reason}`,
                    'response'
                );
            }
            
            showNotification('❌ معامله لغو شد و پول بازگردانده شد', 'success');
            loadOrders();
        } catch (error: any) {
            console.error('Reject final error:', error);
            showNotification(`خطا: ${error.message || 'خطای نامشخص'}`, 'error');
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
                                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                                            {order.status === 'document_submitted' && '📋 مرحله 1: تایید مدارک'}
                                            {order.status === 'verified' && '☎️ مرحله 2: تایید نهایی و انتقال پول'}
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

                                {/* اطلاعات تماس خریدار */}
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-4">
                                    <h5 className="font-semibold mb-2 text-blue-800 dark:text-blue-300">📞 اطلاعات تماس خریدار:</h5>
                                    {buyerInfo[order.buyer_id] ? (
                                        <div className="space-y-1">
                                            <p className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">نام: </span>
                                                <span className="font-bold">{buyerInfo[order.buyer_id].name}</span>
                                            </p>
                                            <p className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">شماره تماس: </span>
                                                <span className="font-bold" style={{ direction: 'ltr' }}>{buyerInfo[order.buyer_id].phone}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">در حال بارگذاری...</p>
                                    )}
                                </div>

                                {/* مرحله 1: تایید مدارک */}
                                {order.status === 'document_submitted' && (
                                    <div className="border-t pt-4 mt-4">
                                        <h5 className="font-semibold mb-3">📄 مدرک دستنویس:</h5>
                                        {documentUrl[order.id] ? (
                                            <div className="space-y-4">
                                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                                                    <img 
                                                        src={documentUrl[order.id]} 
                                                        alt="Document" 
                                                        className="w-full max-h-96 object-contain rounded-lg"
                                                        onError={(e) => {
                                                            console.error('Image load error for order', order.id, ':', e);
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Document+Not+Found';
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <a 
                                                        href={documentUrl[order.id]} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                                                    >
                                                        🔗 مشاهده در پنجره جدید
                                                    </a>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(documentUrl[order.id]);
                                                            showNotification('آدرس فایل کپی شد', 'success');
                                                        }}
                                                        className="inline-flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                                                    >
                                                        📋 کپی لینک
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                                <p className="text-sm text-gray-500 mt-3">در حال بارگذاری مدرک...</p>
                                            </div>
                                        )}

                                        {/* دکمه‌های تایید مدارک */}
                                        <div className="border-t pt-4 mt-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleApproveDocument(order)}
                                                    className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold transition"
                                                >
                                                    ✅ تایید مدارک
                                                </button>
                                                <button
                                                    onClick={() => setShowRejectDocForm(prev => ({...prev, [order.id]: !prev[order.id]}))}
                                                    className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-semibold transition"
                                                >
                                                    ❌ رد مدارک
                                                </button>
                                            </div>

                                            {/* فرم رد مدارک */}
                                            {showRejectDocForm[order.id] && (
                                                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg space-y-3">
                                                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                                        دلیل رد را وارد کنید:
                                                    </p>
                                                    <textarea
                                                        placeholder="مثال: مدرک نامشخص است، امضا ندارد، تاریخ گذشته است..."
                                                        value={rejectDocReason[order.id] || ''}
                                                        onChange={(e) => setRejectDocReason(prev => ({...prev, [order.id]: e.target.value}))}
                                                        className="w-full px-3 py-2 border border-red-300 rounded-lg dark:bg-gray-700 dark:border-red-600"
                                                        rows={3}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                handleRejectDocument(order.id);
                                                                setShowRejectDocForm(prev => ({...prev, [order.id]: false}));
                                                            }}
                                                            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
                                                        >
                                                            ✓ تایید رد
                                                        </button>
                                                        <button
                                                            onClick={() => setShowRejectDocForm(prev => ({...prev, [order.id]: false}))}
                                                            className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 font-semibold"
                                                        >
                                                            انصراف
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* مرحله 2: تایید نهایی و انتقال پول */}
                                {order.status === 'verified' && (
                                    <div className="border-t pt-4 mt-4 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg space-y-3">
                                        <h5 className="font-semibold">☎️ تایید نهایی - انتقال پول</h5>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            مدارک تایید شد. اکنون می‌توانید معامله را نهایی کنید و پول را به فروشنده منتقل کنید.
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleApproveFinal(order)}
                                                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold transition"
                                            >
                                                ✅ تایید نهایی و واریز
                                            </button>
                                            <button
                                                onClick={() => setShowRejectFinalForm(prev => ({...prev, [order.id]: !prev[order.id]}))}
                                                className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-semibold transition"
                                            >
                                                ❌ لغو معامله
                                            </button>
                                        </div>

                                        {/* فرم لغو معامله */}
                                        {showRejectFinalForm[order.id] && (
                                            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg space-y-3">
                                                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                                    دلیل لغو معامله:
                                                </p>
                                                <textarea
                                                    placeholder="دلیل لغو معامله را وارد کنید..."
                                                    value={rejectFinalReason[order.id] || ''}
                                                    onChange={(e) => setRejectFinalReason(prev => ({...prev, [order.id]: e.target.value}))}
                                                    className="w-full px-3 py-2 border border-red-300 rounded-lg dark:bg-gray-700 dark:border-red-600"
                                                    rows={3}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            handleRejectFinal(order.id);
                                                            setShowRejectFinalForm(prev => ({...prev, [order.id]: false}));
                                                        }}
                                                        className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
                                                    >
                                                        ✓ لغو معامله
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRejectFinalForm(prev => ({...prev, [order.id]: false}))}
                                                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 font-semibold"
                                                    >
                                                        انصراف
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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

export default AdminVerificationPanel;
