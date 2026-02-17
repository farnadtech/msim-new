import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../services/supabase';
import { KYCVerification } from '../types';

// تابع تبدیل تاریخ میلادی به شمسی
const formatPersianDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    } catch {
        return dateString;
    }
};

const AdminKYCManagement: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [verifications, setVerifications] = useState<KYCVerification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [selectedVerification, setSelectedVerification] = useState<KYCVerification | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [adminNotes, setAdminNotes] = useState('');

    console.log('🎯 AdminKYCManagement rendered', { 
        user: user?.id, 
        verificationsCount: verifications.length,
        loading,
        filter 
    });

    useEffect(() => {
        console.log('🔄 Filter changed to:', filter);
        loadVerifications();
    }, [filter]);

    const loadVerifications = async () => {
        try {
            setLoading(true);
            console.log('🔍 Loading KYC verifications with filter:', filter);
            console.log('👤 Current user:', user?.id);
            
            // ابتدا بررسی کنیم که کاربر لاگین است
            if (!user) {
                console.error('❌ No user logged in');
                showNotification('لطفا ابتدا وارد شوید', 'error');
                return;
            }

            // بررسی نقش کاربر
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (userError) {
                console.error('❌ Error fetching user role:', userError);
                throw userError;
            }

            console.log('👤 User role:', userData?.role);

            if (userData?.role !== 'admin') {
                console.error('❌ User is not admin');
                showNotification('شما دسترسی ادمین ندارید', 'error');
                return;
            }

            // حالا درخواست‌های KYC را بگیریم
            let query = supabase
                .from('kyc_verifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            console.log('📡 Executing query...');
            const { data, error } = await query;

            console.log('📊 KYC Query Result:', { 
                data, 
                error, 
                count: data?.length,
                filter 
            });

            if (error) {
                console.error('❌ KYC Load Error:', error);
                throw error;
            }

            if (!data) {
                console.warn('⚠️ No data returned');
                setVerifications([]);
                return;
            }

            setVerifications(data);
            console.log('✅ Verifications set:', data.length, 'records');
            
            if (data.length === 0) {
                console.log('💡 No KYC requests found with filter:', filter);
            }
        } catch (error: any) {
            // تبدیل خطاهای دیتابیس به فارسی
            let errorMessage = 'خطا در بارگذاری';
            
            if (error.message) {
                const msg = error.message.toLowerCase();
                
                if (msg.includes('permission') || msg.includes('policy')) {
                    errorMessage = 'خطای دسترسی. لطفاً دوباره وارد شوید.';
                } else if (msg.includes('network') || msg.includes('fetch')) {
                    errorMessage = 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
                } else if (msg.includes('timeout')) {
                    errorMessage = 'زمان درخواست تمام شد. لطفاً دوباره تلاش کنید.';
                } else {
                    errorMessage = `خطا در بارگذاری: ${error.message}`;
                }
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (verification: KYCVerification) => {
        if (!user) return;

        try {
            // Update KYC status
            const { error: kycError } = await supabase
                .from('kyc_verifications')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    admin_notes: adminNotes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', verification.id);

            if (kycError) throw kycError;

            // Update user's is_verified flag
            const { error: userError } = await supabase
                .from('users')
                .update({ is_verified: true })
                .eq('id', verification.user_id);

            if (userError) throw userError;

            showNotification('احراز هویت تایید شد', 'success');
            setSelectedVerification(null);
            setAdminNotes('');
            loadVerifications();
        } catch (error: any) {
            // تبدیل خطاهای تایید به فارسی
            let errorMessage = 'خطا در تایید احراز هویت';
            
            if (error.message) {
                const msg = error.message.toLowerCase();
                
                if (msg.includes('permission') || msg.includes('policy')) {
                    errorMessage = 'خطای دسترسی. لطفاً دوباره وارد شوید.';
                } else if (msg.includes('not found')) {
                    errorMessage = 'درخواست احراز هویت یافت نشد.';
                } else if (msg.includes('network') || msg.includes('fetch')) {
                    errorMessage = 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
                } else {
                    errorMessage = `خطا در تایید: ${error.message}`;
                }
            }
            
            showNotification(errorMessage, 'error');
        }
    };

    const handleReject = async (verification: KYCVerification) => {
        if (!user || !rejectionReason.trim()) {
            showNotification('لطفا دلیل رد را وارد کنید', 'error');
            return;
        }

        try {
            // Update KYC status
            const { error: kycError } = await supabase
                .from('kyc_verifications')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: rejectionReason,
                    admin_notes: adminNotes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', verification.id);

            if (kycError) throw kycError;

            // Update user's is_verified flag
            const { error: userError } = await supabase
                .from('users')
                .update({ is_verified: false })
                .eq('id', verification.user_id);

            if (userError) throw userError;

            showNotification('احراز هویت رد شد', 'success');
            setSelectedVerification(null);
            setRejectionReason('');
            setAdminNotes('');
            loadVerifications();
        } catch (error: any) {
            // تبدیل خطاهای رد به فارسی
            let errorMessage = 'خطا در رد احراز هویت';
            
            if (error.message) {
                const msg = error.message.toLowerCase();
                
                if (msg.includes('permission') || msg.includes('policy')) {
                    errorMessage = 'خطای دسترسی. لطفاً دوباره وارد شوید.';
                } else if (msg.includes('not found')) {
                    errorMessage = 'درخواست احراز هویت یافت نشد.';
                } else if (msg.includes('network') || msg.includes('fetch')) {
                    errorMessage = 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
                } else {
                    errorMessage = `خطا در رد: ${error.message}`;
                }
            }
            
            showNotification(errorMessage, 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">در انتظار بررسی</span>;
            case 'approved':
                return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">تایید شده</span>;
            case 'rejected':
                return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">رد شده</span>;
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">🔐 مدیریت احراز هویت</h1>
                    <p className="text-gray-600 dark:text-gray-400">بررسی و تایید درخواست‌های احراز هویت کاربران</p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            همه ({verifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            در انتظار
                        </button>
                        <button
                            onClick={() => setFilter('approved')}
                            className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            تایید شده
                        </button>
                        <button
                            onClick={() => setFilter('rejected')}
                            className={`px-4 py-2 rounded-lg ${filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            رد شده
                        </button>
                    </div>
                </div>

                {/* Verifications List */}
                <div className="grid grid-cols-1 gap-4">
                    {verifications.map(verification => (
                        <div key={verification.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{verification.full_name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">کد ملی: {verification.national_code}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">شماره تماس: {verification.phone_number}</p>
                                </div>
                                {getStatusBadge(verification.status)}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm font-medium mb-1">شهر:</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{verification.city || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">تاریخ تولد:</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatPersianDate(verification.birth_date)}</p>
                                </div>
                            </div>

                            {verification.address && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium mb-1">آدرس:</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{verification.address}</p>
                                </div>
                            )}

                            {/* Documents */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {verification.national_card_front_url && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">روی کارت ملی:</p>
                                        <a href={verification.national_card_front_url} target="_blank" rel="noopener noreferrer">
                                            <img 
                                                src={verification.national_card_front_url} 
                                                alt="Front" 
                                                className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                            />
                                        </a>
                                    </div>
                                )}
                                {verification.national_card_back_url && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">پشت کارت ملی:</p>
                                        <a href={verification.national_card_back_url} target="_blank" rel="noopener noreferrer">
                                            <img 
                                                src={verification.national_card_back_url} 
                                                alt="Back" 
                                                className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                            />
                                        </a>
                                    </div>
                                )}
                                {verification.selfie_with_card_url && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">سلفی با کارت:</p>
                                        <a href={verification.selfie_with_card_url} target="_blank" rel="noopener noreferrer">
                                            <img 
                                                src={verification.selfie_with_card_url} 
                                                alt="Selfie" 
                                                className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                            />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {verification.status === 'pending' && (
                                <div className="border-t pt-4">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2">یادداشت ادمین (اختیاری):</label>
                                        <textarea
                                            value={selectedVerification?.id === verification.id ? adminNotes : ''}
                                            onChange={(e) => {
                                                setSelectedVerification(verification);
                                                setAdminNotes(e.target.value);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                            rows={2}
                                            placeholder="یادداشت‌های داخلی..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedVerification(verification);
                                                handleApprove(verification);
                                            }}
                                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                                        >
                                            ✓ تایید
                                        </button>
                                        <button
                                            onClick={() => setSelectedVerification(verification)}
                                            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                                        >
                                            ✗ رد
                                        </button>
                                    </div>
                                </div>
                            )}

                            {verification.status === 'rejected' && verification.rejection_reason && (
                                <div className="border-t pt-4">
                                    <p className="text-sm font-medium text-red-600">دلیل رد:</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{verification.rejection_reason}</p>
                                </div>
                            )}

                            {verification.admin_notes && (
                                <div className="border-t pt-4 mt-4">
                                    <p className="text-sm font-medium">یادداشت ادمین:</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{verification.admin_notes}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {verifications.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">درخواستی یافت نشد</p>
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            {selectedVerification && selectedVerification.status === 'pending' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedVerification(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">رد درخواست احراز هویت</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">دلیل رد:</label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                rows={4}
                                placeholder="دلیل رد درخواست را وارد کنید..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleReject(selectedVerification)}
                                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                            >
                                تایید رد
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedVerification(null);
                                    setRejectionReason('');
                                }}
                                className="flex-1 bg-gray-300 dark:bg-gray-600 py-2 rounded-lg hover:bg-gray-400"
                            >
                                انصراف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminKYCManagement;
