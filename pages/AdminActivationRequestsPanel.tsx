import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { ActivationRequest } from '../types';
import api from '../services/api-supabase';

const AdminActivationRequestsPanel: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    
    const [requests, setRequests] = useState<ActivationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<ActivationRequest | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const allRequests = await api.getActivationRequests({
                status: filter !== 'all' ? filter : undefined
            });
            setRequests(allRequests);
        } catch (error) {
            showNotification('خطا در بارگذاری درخواست‌های فعال‌سازی', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (request: ActivationRequest) => {
        setSelectedRequest(request);
        setAdminNotes(request.admin_notes || '');
        setDetailModalOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedRequest || !user) return;
        
        setIsProcessing(true);
        try {
            await api.approveActivationRequest(selectedRequest.id, user.id, adminNotes);
            showNotification('درخواست تایید شد', 'success');
            setDetailModalOpen(false);
            setSelectedRequest(null);
            setAdminNotes('');
            await loadRequests();
        } catch (error) {
            showNotification(
                error instanceof Error ? error.message : 'خطا در تایید درخواست',
                'error'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !user) return;
        
        setIsProcessing(true);
        try {
            await api.rejectActivationRequest(selectedRequest.id, user.id, adminNotes);
            showNotification('درخواست رد شد', 'success');
            setDetailModalOpen(false);
            setSelectedRequest(null);
            setAdminNotes('');
            await loadRequests();
        } catch (error) {
            showNotification(
                error instanceof Error ? error.message : 'خطا در رد درخواست',
                'error'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">⏳ در انتظار</span>;
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
            <h2 className="text-2xl font-bold mb-4">درخواست‌های فعال‌سازی سیم صفر</h2>
            
            <div className="mb-4 flex gap-2">
                {['all', 'pending', 'approved', 'rejected'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status as any)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                        {status === 'all' ? 'همه' : status === 'pending' ? 'در انتظار' : status === 'approved' ? 'تایید شده' : 'رد شده'}
                    </button>
                ))}
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    درخواستی برای این فیلتر یافت نشد
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-3">شماره سیم</th>
                                <th className="p-3">خریدار</th>
                                <th className="p-3">فروشنده</th>
                                <th className="p-3">وضعیت</th>
                                <th className="p-3">کد فعال‌سازی</th>
                                <th className="p-3">تاریخ</th>
                                <th className="p-3">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(request => (
                                <tr key={request.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 font-mono">{request.sim_number}</td>
                                    <td className="p-3">{request.buyer_name}</td>
                                    <td className="p-3">{request.seller_name}</td>
                                    <td className="p-3">{getStatusBadge(request.status)}</td>
                                    <td className="p-3">
                                        {request.activation_code ? (
                                            <span className="font-mono bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded">
                                                {request.activation_code}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">هنوز ارسال نشده</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {new Date(request.created_at).toLocaleDateString('fa-IR')}
                                    </td>
                                    <td className="p-3">
                                        {request.status === 'pending' && (
                                            <button
                                                onClick={() => handleViewDetails(request)}
                                                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-xs"
                                            >
                                                مشاهده و تصمیم
                                            </button>
                                        )}
                                        {request.status !== 'pending' && (
                                            <button
                                                onClick={() => handleViewDetails(request)}
                                                className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-xs"
                                            >
                                                مشاهده
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-6">جزئیات درخواست فعال‌سازی</h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">شماره سیم</p>
                                <p className="font-bold text-lg">{selectedRequest.sim_number}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">وضعیت</p>
                                <p className="font-bold">{getStatusBadge(selectedRequest.status)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">خریدار</p>
                                <p className="font-bold">{selectedRequest.buyer_name}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">فروشنده</p>
                                <p className="font-bold">{selectedRequest.seller_name}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">کد فعال‌سازی</p>
                                <p className="font-mono bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded inline-block">
                                    {selectedRequest.activation_code || 'هنوز ارسال نشده'}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">تاریخ درخواست</p>
                                <p className="font-bold">{new Date(selectedRequest.created_at).toLocaleDateString('fa-IR')}</p>
                            </div>
                        </div>

                        {selectedRequest.admin_notes && (
                            <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">یادداشت‌های ادمین</p>
                                <p className="text-gray-800 dark:text-gray-200">{selectedRequest.admin_notes}</p>
                            </div>
                        )}

                        {selectedRequest.status === 'pending' && (
                            <>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium mb-2">یادداشت برای تصمیم</label>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        rows={4}
                                        placeholder="دلایل تایید یا رد را بنویسید..."
                                    />
                                </div>

                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={() => setDetailModalOpen(false)}
                                        disabled={isProcessing}
                                        className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50"
                                    >
                                        بستن
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={isProcessing}
                                        className="px-6 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {isProcessing ? 'در حال پردازش...' : 'رد کردن'}
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={isProcessing}
                                        className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {isProcessing ? 'در حال پردازش...' : 'تایید کردن'}
                                    </button>
                                </div>
                            </>
                        )}

                        {selectedRequest.status !== 'pending' && (
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={() => setDetailModalOpen(false)}
                                    className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                    بستن
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminActivationRequestsPanel;
