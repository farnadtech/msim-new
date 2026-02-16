import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { ActivationRequest } from '../types';
import api from '../services/api-supabase';

const BuyerActivationRequestsPanel: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    
    const [requests, setRequests] = useState<ActivationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activationCodes, setActivationCodes] = useState<{ [key: number]: string }>({});
    const [verifyingId, setVerifyingId] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            loadRequests();
        }
    }, [user]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const allRequests = await api.getActivationRequests({
                buyerId: user?.id
            });
            setRequests(allRequests);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (requestId: number) => {
        const code = activationCodes[requestId];
        if (!code || !code.trim()) {
            showNotification('لطفا کد فعال‌سازی را وارد کنید', 'error');
            return;
        }

        setVerifyingId(requestId);
        try {
            // Get the purchase order ID from the activation request
            const request = requests.find(r => r.id === requestId);
            if (!request) {
                showNotification('درخواست یافت نشد', 'error');
                return;
            }

            // Verify the code
            const success = await api.verifyActivationCode(request.purchase_order_id, code);
            
            if (success) {
                showNotification('✅ کد فعال‌سازی تایید شد!', 'success');
                await loadRequests();
                setActivationCodes(prev => ({ ...prev, [requestId]: '' }));
            } else {
                showNotification('❌ کد فعال‌سازی نادرست است', 'error');
            }
        } catch (error) {
            showNotification(
                error instanceof Error ? error.message : 'خطا در تایید کد',
                'error'
            );
        } finally {
            setVerifyingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">⏳ در انتظار کد</span>;
            case 'approved':
                return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">✓ تایید شد</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">✗ رد شد</span>;
            case 'activated':
                return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">🔄 فعال‌شد</span>;
            default:
                return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">نامعلوم</span>;
        }
    };

    if (loading) {
        return <div className="text-center py-20">در حال بارگذاری...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">📦 درخواست‌های فعال‌سازی</h2>
            
            {requests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    درخواستی برای فعال‌سازی ندارید
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(request => (
                        <div
                            key={request.id}
                            className="border dark:border-gray-700 rounded-lg p-4 space-y-3"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{request.sim_number}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        فروشنده: {request.seller_name}
                                    </p>
                                </div>
                                <div>{getStatusBadge(request.status)}</div>
                            </div>

                            {request.status === 'pending' && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                                        ⏳ در انتظار کد فعال‌سازی از فروشنده...
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                        فروشنده باید کد فعال‌سازی سیمکارت را برای شما ارسال کند.
                                    </p>
                                </div>
                            )}

                            {request.activation_code && request.status === 'pending' && (
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg space-y-3">
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        ✅ کد فعال‌سازی دریافت شد
                                    </p>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                                            کد فعال‌سازی دریافتی از فروشنده:
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={activationCodes[request.id] || ''}
                                                onChange={(e) => setActivationCodes(prev => ({
                                                    ...prev,
                                                    [request.id]: e.target.value
                                                }))}
                                                placeholder="کد فعال‌سازی را وارد کنید"
                                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                                disabled={verifyingId === request.id}
                                            />
                                            <button
                                                onClick={() => handleVerifyCode(request.id)}
                                                disabled={verifyingId === request.id}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-sm"
                                            >
                                                {verifyingId === request.id ? '⏳' : '✓ تایید'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {request.status === 'approved' && (
                                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                                    <p className="text-sm text-green-800 dark:text-green-200">
                                        ✅ فعال‌سازی توسط ادمین تایید شد
                                    </p>
                                </div>
                            )}

                            {request.status === 'rejected' && (
                                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                        ❌ درخواست رد شده است
                                    </p>
                                    {request.admin_notes && (
                                        <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                                            دلیل: {request.admin_notes}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="text-xs text-gray-500">
                                تاریخ: {new Date(request.created_at).toLocaleDateString('fa-IR')}
                                {request.verified_at && ` • تایید شده: ${new Date(request.verified_at).toLocaleDateString('fa-IR')}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BuyerActivationRequestsPanel;
