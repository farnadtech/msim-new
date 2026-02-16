import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { useNotification } from '../contexts/NotificationContext';

const AdminSuspensionsPanel: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'suspended' | 'with_penalties'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const { showNotification } = useNotification();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('users')
                .select('*')
                .order('negative_score', { ascending: false });

            if (filterStatus === 'suspended') {
                query = query.eq('is_suspended', true);
            } else if (filterStatus === 'with_penalties') {
                query = query.gt('negative_score', 0);
            }

            const { data, error } = await query;

            if (error) throw error;

            let filteredData = data || [];
            
            if (searchTerm) {
                filteredData = filteredData.filter(user => 
                    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.phone_number?.includes(searchTerm)
                );
            }

            setUsers(filteredData);
        } catch (error) {
            showNotification('خطا در دریافت لیست کاربران', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filterStatus]);

    const handleSuspend = async (userId: string) => {
        const reason = prompt('دلیل تعلیق را وارد کنید:');
        if (!reason) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    is_suspended: true,
                    suspended_at: new Date().toISOString(),
                    suspension_reason: reason
                })
                .eq('id', userId);

            if (error) throw error;

            // Create notification for user
            await supabase.from('notifications').insert({
                user_id: userId,
                title: 'تعلیق حساب کاربری',
                message: `حساب کاربری شما به دلیل "${reason}" تعلیق شده است.`,
                type: 'error'
            });

            showNotification('کاربر با موفقیت تعلیق شد', 'success');
            fetchUsers();
        } catch (error) {
            showNotification('خطا در تعلیق کاربر', 'error');
        }
    };

    const handleUnsuspend = async (userId: string) => {
        if (!confirm('آیا از رفع تعلیق این کاربر مطمئن هستید؟')) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    is_suspended: false,
                    suspended_at: null,
                    suspension_reason: null
                })
                .eq('id', userId);

            if (error) throw error;

            // Create notification for user
            await supabase.from('notifications').insert({
                user_id: userId,
                title: 'رفع تعلیق حساب کاربری',
                message: 'تعلیق حساب کاربری شما برداشته شد. اکنون می‌توانید از خدمات سایت استفاده کنید.',
                type: 'success'
            });

            showNotification('تعلیق کاربر با موفقیت رفع شد', 'success');
            fetchUsers();
        } catch (error) {
            showNotification('خطا در رفع تعلیق کاربر', 'error');
        }
    };

    const handleResetNegativeScore = async (userId: string) => {
        if (!confirm('آیا از صفر کردن امتیاز منفی این کاربر مطمئن هستید؟')) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    negative_score: 0,
                    last_penalty_at: null
                })
                .eq('id', userId);

            if (error) throw error;

            showNotification('امتیاز منفی با موفقیت صفر شد', 'success');
            fetchUsers();
        } catch (error) {
            showNotification('خطا در صفر کردن امتیاز منفی', 'error');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">مدیریت تعلیق‌ها و جریمه‌ها</h1>
                <button 
                    onClick={fetchUsers}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    🔄 بروزرسانی
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-2">فیلتر وضعیت</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                    >
                        <option value="all">همه کاربران</option>
                        <option value="suspended">فقط تعلیق شده‌ها</option>
                        <option value="with_penalties">فقط دارای امتیاز منفی</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">جستجو</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                        placeholder="نام، ایمیل یا شماره تلفن..."
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                    <div className="text-red-800 dark:text-red-300 text-sm font-medium">تعلیق شده</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {users.filter(u => u.is_suspended).length}
                    </div>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                    <div className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">دارای امتیاز منفی</div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {users.filter(u => u.negative_score && u.negative_score > 0).length}
                    </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                    <div className="text-blue-800 dark:text-blue-300 text-sm font-medium">کل کاربران</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {users.length}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
            ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">کاربری یافت نشد</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-right">کاربر</th>
                                <th className="p-3 text-center">امتیاز منفی</th>
                                <th className="p-3 text-center">وضعیت</th>
                                <th className="p-3 text-right">دلیل تعلیق</th>
                                <th className="p-3 text-center">آخرین جریمه</th>
                                <th className="p-3 text-center">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="p-3">
                                        <div className="font-semibold">{user.name}</div>
                                        <div className="text-sm text-gray-500">{user.email || user.phone_number}</div>
                                    </td>
                                    <td className="p-3 text-center">
                                        {user.negative_score && user.negative_score > 0 ? (
                                            <span className="inline-block bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3 py-1 rounded-full font-bold">
                                                {user.negative_score}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">0</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        {user.is_suspended ? (
                                            <span className="inline-block bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                                تعلیق شده
                                            </span>
                                        ) : (
                                            <span className="inline-block bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                                فعال
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm">
                                        {user.suspension_reason || '-'}
                                    </td>
                                    <td className="p-3 text-center text-sm">
                                        {user.last_penalty_at ? (
                                            <div dir="ltr">
                                                {new Date(user.last_penalty_at).toLocaleDateString('fa-IR')}
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-2 justify-center">
                                            {user.is_suspended ? (
                                                <button
                                                    onClick={() => handleUnsuspend(user.id)}
                                                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                                                >
                                                    رفع تعلیق
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSuspend(user.id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                                >
                                                    تعلیق
                                                </button>
                                            )}
                                            {user.negative_score && user.negative_score > 0 && (
                                                <button
                                                    onClick={() => handleResetNegativeScore(user.id)}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                                                >
                                                    صفر کردن امتیاز
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminSuspensionsPanel;
