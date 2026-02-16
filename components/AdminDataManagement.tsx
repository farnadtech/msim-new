import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api-supabase';
import LoadingOverlay from './LoadingOverlay';
import AdminCarriersManagement from './AdminCarriersManagement';

const AdminDataManagement: React.FC = () => {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // State for data cleanup
    const [cleanupStartDate, setCleanupStartDate] = useState('');
    const [cleanupEndDate, setCleanupEndDate] = useState('');
    const [selectedTables, setSelectedTables] = useState<string[]>([]);

    const tables = [
        { key: 'sim_cards', label: 'سیمکارت‌ها', icon: '📱' },
        { key: 'transactions', label: 'تراکنش‌ها', icon: '💰' },
        { key: 'purchase_orders', label: 'سفارشات', icon: '📦' },
        { key: 'activation_requests', label: 'درخواست‌های فعال‌سازی', icon: '🔐' },
        { key: 'bids', label: 'پیشنهادات حراجی', icon: '🏆' },
        { key: 'commissions', label: 'کمیسیون‌ها', icon: '💵' },
        { key: 'notifications', label: 'اعلان‌ها', icon: '🔔' },
        { key: 'support_messages', label: 'پیام‌های پشتیبانی', icon: '💬' },
    ];

    const handleDeleteExpiredAuctions = async () => {
        if (!confirm('آیا مطمئن هستید که می‌خواهید تمام حراج‌های تمام شده را حذف کنید؟\n\nاین عمل غیرقابل بازگشت است!')) {
            return;
        }

        setLoading(true);
        setLoadingMessage('در حال حذف حراج‌های تمام شده...');

        try {
            // حذف auction_details برای حراج‌های تمام شده
            const { data: expiredAuctions, error: fetchError } = await api.supabase
                .from('auction_details')
                .select('sim_card_id')
                .lt('end_time', new Date().toISOString());

            if (fetchError) throw fetchError;

            if (!expiredAuctions || expiredAuctions.length === 0) {
                showNotification('هیچ حراجی تمام شده‌ای یافت نشد', 'info');
                return;
            }

            const simCardIds = expiredAuctions.map(a => a.sim_card_id);

            // حذف bids
            await api.supabase
                .from('bids')
                .delete()
                .in('sim_card_id', simCardIds);

            // حذف auction_details
            await api.supabase
                .from('auction_details')
                .delete()
                .in('sim_card_id', simCardIds);

            // حذف sim_cards
            await api.supabase
                .from('sim_cards')
                .delete()
                .in('id', simCardIds);

            showNotification(`${expiredAuctions.length} حراجی تمام شده با موفقیت حذف شد`, 'success');
        } catch (error: any) {
            showNotification(error.message || 'خطا در حذف حراج‌ها', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTable = (tableKey: string) => {
        setSelectedTables(prev => 
            prev.includes(tableKey)
                ? prev.filter(t => t !== tableKey)
                : [...prev, tableKey]
        );
    };

    const handleCleanupData = async () => {
        if (selectedTables.length === 0) {
            showNotification('لطفاً حداقل یک جدول را انتخاب کنید', 'error');
            return;
        }

        if (!cleanupStartDate || !cleanupEndDate) {
            showNotification('لطفاً بازه زمانی را مشخص کنید', 'error');
            return;
        }

        const confirmMessage = `آیا مطمئن هستید که می‌خواهید داده‌های زیر را حذف کنید؟\n\n` +
            `جداول: ${selectedTables.map(t => tables.find(tb => tb.key === t)?.label).join(', ')}\n` +
            `از تاریخ: ${cleanupStartDate}\n` +
            `تا تاریخ: ${cleanupEndDate}\n\n` +
            `⚠️ این عمل غیرقابل بازگشت است!`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setLoading(true);
        setLoadingMessage('در حال پاکسازی داده‌ها...');

        try {
            let deletedCount = 0;

            for (const table of selectedTables) {
                setLoadingMessage(`در حال پاکسازی ${tables.find(t => t.key === table)?.label}...`);

                const { data, error } = await api.supabase
                    .from(table)
                    .delete()
                    .gte('created_at', cleanupStartDate)
                    .lte('created_at', cleanupEndDate)
                    .select();

                if (error) {
                    console.error(`Error deleting from ${table}:`, error);
                    continue;
                }

                deletedCount += data?.length || 0;
            }

            showNotification(`${deletedCount} رکورد با موفقیت حذف شد`, 'success');
            setSelectedTables([]);
            setCleanupStartDate('');
            setCleanupEndDate('');
        } catch (error: any) {
            showNotification(error.message || 'خطا در پاکسازی داده‌ها', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <LoadingOverlay message={loadingMessage} submessage="لطفاً صبر کنید..." />}

            <div className="space-y-6">
                {/* مدیریت اپراتورها */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span>📱</span>
                            <span>مدیریت اپراتورها</span>
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            افزودن، ویرایش و حذف اپراتورهای تلفن همراه
                        </p>
                    </div>
                    
                    <AdminCarriersManagement />
                </div>

                {/* حذف حراج‌های تمام شده */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg shadow-md p-6 border border-orange-200 dark:border-orange-800">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                        <span>🗑️</span>
                        <span>حذف حراج‌های تمام شده</span>
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        تمام حراج‌هایی که زمان آن‌ها به پایان رسیده را یکجا حذف کنید. این شامل سیمکارت‌ها، پیشنهادات و جزئیات حراجی می‌شود.
                    </p>
                    <button
                        onClick={handleDeleteExpiredAuctions}
                        disabled={loading}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold"
                    >
                        🗑️ حذف حراج‌های تمام شده
                    </button>
                </div>

                {/* پاکسازی کامل داده‌ها */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg shadow-md p-6 border-2 border-red-300 dark:border-red-800">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-700 dark:text-red-400">
                        <span>⚠️</span>
                        <span>پاکسازی کامل داده‌ها</span>
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-6 font-semibold">
                        ⚠️ هشدار: این عمل غیرقابل بازگشت است! داده‌های حذف شده قابل بازیابی نیستند.
                    </p>

                    {/* انتخاب بازه زمانی */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">از تاریخ</label>
                            <input
                                type="date"
                                value={cleanupStartDate}
                                onChange={(e) => setCleanupStartDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">تا تاریخ</label>
                            <input
                                type="date"
                                value={cleanupEndDate}
                                onChange={(e) => setCleanupEndDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    {/* انتخاب جداول */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-3">انتخاب جداول برای پاکسازی:</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {tables.map(table => (
                                <label
                                    key={table.key}
                                    className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                        selectedTables.includes(table.key)
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTables.includes(table.key)}
                                        onChange={() => handleToggleTable(table.key)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-lg">{table.icon}</span>
                                    <span className="text-sm font-medium">{table.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCleanupData}
                            disabled={loading || selectedTables.length === 0 || !cleanupStartDate || !cleanupEndDate}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold"
                        >
                            ⚠️ پاکسازی داده‌های انتخاب شده
                        </button>
                        <button
                            onClick={() => {
                                setSelectedTables([]);
                                setCleanupStartDate('');
                                setCleanupEndDate('');
                            }}
                            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-semibold"
                        >
                            پاک کردن انتخاب‌ها
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDataManagement;
