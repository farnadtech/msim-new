import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { SuspensionRequest } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface SuspensionRequestWithUser extends SuspensionRequest {
    user?: {
        id: string;
        name: string;
        email?: string;
        phone_number?: string;
        negative_score?: number;
    };
}

const AdminSuspensionRequestsPanel: React.FC = () => {
    const [requests, setRequests] = useState<SuspensionRequestWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const { showNotification } = useNotification();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // First, let's check if we can access the table at all
            const { data: test, error: testError } = await supabase
                .from('suspension_requests')
                .select('id, user:users!suspension_requests_user_id_fkey (id, name)')
                .limit(1);
                
            if (testError) {
                throw new Error(`خطا در دسترسی به جدول: ${testError.message}`);
            }
            let query = supabase
                .from('suspension_requests')
                .select(`
                    *,
                    user:users!suspension_requests_user_id_fkey (id, name, email, phone_number, negative_score)
                `)
                .order('created_at', { ascending: false });

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }
            // Log the first few requests for debugging
            if (data && data.length > 0) {
                console.log('📋 Sample requests:', data.slice(0, 3));
            }

            setRequests(data || []);
        } catch (error: any) {
            const errorMessage = error.message || error.toString();
            showNotification(`خطا در دریافت درخواست‌ها: ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Refresh data when component mounts
    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (request: SuspensionRequestWithUser) => {
        const adminResponse = prompt('پاسخ خود را وارد کنید (اختیاری):');

        try {
            // 1. Update request status
            const { error: requestError } = await supabase
                .from('suspension_requests')
                .update({
                    status: 'approved',
                    admin_response: adminResponse || 'درخواست شما تایید شد',
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', request.id);

            if (requestError) throw requestError;

            // 2. Unsuspend user
            const { error: userError } = await supabase
                .from('users')
                .update({
                    is_suspended: false,
                    suspended_at: null,
                    suspension_reason: null
                })
                .eq('id', request.user_id);

            if (userError) throw userError;

            // 3. Send notification to user
            await supabase.from('notifications').insert({
                user_id: request.user_id,
                title: '✅ درخواست رفع تعلیق تایید شد',
                message: `درخواست رفع تعلیق شما بررسی و تایید شد. ${adminResponse ? `پاسخ مدیر: ${adminResponse}` : ''}`,
                type: 'success'
            });

            showNotification('درخواست تایید شد و کاربر از تعلیق خارج شد', 'success');
            fetchRequests();
        } catch (error) {
            showNotification('خطا در تایید درخواست', 'error');
        }
    };

    const handleReject = async (request: SuspensionRequestWithUser) => {
        const adminResponse = prompt('دلیل رد درخواست را وارد کنید:');
        if (!adminResponse) return;

        try {
            // 1. Update request status
            const { error: requestError } = await supabase
                .from('suspension_requests')
                .update({
                    status: 'rejected',
                    admin_response: adminResponse,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', request.id);

            if (requestError) throw requestError;

            // 2. Send notification to user
            await supabase.from('notifications').insert({
                user_id: request.user_id,
                title: '❌ درخواست رفع تعلیق رد شد',
                message: `درخواست رفع تعلیق شما رد شد. دلیل: ${adminResponse}`,
                type: 'error'
            });

            showNotification('درخواست رد شد', 'success');
            fetchRequests();
        } catch (error) {
            showNotification('خطا در رد درخواست', 'error');
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'در انتظار بررسی';
            case 'approved': return 'تایید شده';
            case 'rejected': return 'رد شده';
            default: return status;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">در انتظار</span>;
            case 'approved':
                return <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">تایید شده</span>;
            case 'rejected':
                return <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">رد شده</span>;
            default:
                return <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm font-bold">{status}</span>;
        }
    };

    // Refresh data when component mounts
    useEffect(() => {
        fetchRequests();
    }, []);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">مدیریت درخواست‌های رفع تعلیق</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            fetchRequests();
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
                    >
                        <span>🔄</span>
                        <span>بروزرسانی</span>
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">فیلتر وضعیت</label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full md:w-64 px-4 py-2 border rounded-lg dark:bg-gray-700"
                >
                    <option value="all">همه درخواست‌ها</option>
                    <option value="pending">در انتظار بررسی</option>
                    <option value="approved">تایید شده</option>
                    <option value="rejected">رد شده</option>
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                    <div className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">در انتظار</div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {requests.filter(r => r.status === 'pending').length}
                    </div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4">
                    <div className="text-green-800 dark:text-green-300 text-sm font-medium">تایید شده</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {requests.filter(r => r.status === 'approved').length}
                    </div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                    <div className="text-red-800 dark:text-red-300 text-sm font-medium">رد شده</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {requests.filter(r => r.status === 'rejected').length}
                    </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                    <div className="text-blue-800 dark:text-blue-300 text-sm font-medium">کل درخواست‌ها</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {requests.length}
                    </div>
                </div>
            </div>

            {/* Requests List */}
            {loading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    {filterStatus === 'all' ? 'درخواستی یافت نشد' : `درخواستی با وضعیت "${getStatusText(filterStatus)}" یافت نشد`}
                    <p className="text-sm mt-2">اگر این پیام غیرمنتظره است، دکمه بروزرسانی را بزنید</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(request => (
                        <div key={request.id} className="bg-white dark:bg-gray-800 border rounded-lg p-6 shadow-sm">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{request.user?.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {request.user?.email || request.user?.phone_number}
                                    </p>
                                    {request.user?.negative_score && request.user.negative_score > 0 && (
                                        <p className="text-sm text-red-600 mt-1">
                                            امتیاز منفی: {request.user.negative_score}
                                        </p>
                                    )}
                                </div>
                                <div className="text-left">
                                    {getStatusBadge(request.status)}
                                    <p className="text-sm text-gray-500 mt-2">
                                        {new Date(request.created_at).toLocaleDateString('fa-IR')}
                                    </p>
                                </div>
                            </div>

                            {/* Request Message */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                                <h4 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-300">پیام کاربر:</h4>
                                <p className="text-gray-800 dark:text-gray-200">{request.message}</p>
                            </div>

                            {/* Admin Response */}
                            {request.admin_response && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500 rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold mb-2 text-sm text-blue-700 dark:text-blue-300">پاسخ مدیر:</h4>
                                    <p className="text-blue-800 dark:text-blue-200">{request.admin_response}</p>
                                    {request.reviewed_at && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                            تاریخ بررسی: {new Date(request.reviewed_at).toLocaleDateString('fa-IR')}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            {request.status === 'pending' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleApprove(request)}
                                        className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-green-600 transition-colors"
                                    >
                                        ✅ تایید و رفع تعلیق
                                    </button>
                                    <button
                                        onClick={() => handleReject(request)}
                                        className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-red-600 transition-colors"
                                    >
                                        ❌ رد درخواست
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminSuspensionRequestsPanel;
