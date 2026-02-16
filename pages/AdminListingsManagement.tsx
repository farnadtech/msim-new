import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import DashboardLayout from '../components/DashboardLayout';
import { SimCard } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api-supabase';

const AdminListingsManagement: React.FC = () => {
    const { simCards, loading, removeSimCard } = useData();
    const { showNotification } = useNotification();
    const [filterType, setFilterType] = useState<'all' | 'fixed' | 'inquiry'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold'>('all');
    const [deleting, setDeleting] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Get all non-auction SIM cards
    const listings = useMemo(() => 
        simCards.filter(sim => sim.type !== 'auction'),
        [simCards]
    );

    // Apply filters
    const filteredListings = useMemo(() => {
        let filtered = listings;

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(sim => sim.type === filterType);
        }

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(sim => sim.status === filterStatus);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(sim => 
                sim.number.includes(searchQuery.trim())
            );
        }

        return filtered;
    }, [listings, filterType, filterStatus, searchQuery]);

    const handleDeleteListing = async (sim: SimCard) => {
        if (!window.confirm(`آیا مطمئن هستید که می‌خواهید آگهی ${sim.number} را به طور کامل حذف کنید؟\n\nتوجه: این عمل غیرقابل بازگشت است.`)) {
            return;
        }

        try {
            setDeleting(sim.id);
            await api.deleteSimCard(sim.id, true); // true = isAdmin
            removeSimCard(sim.id);
            showNotification('آگهی با موفقیت حذف شد', 'success');
        } catch (error: any) {
            showNotification(error.message || 'خطا در حذف آگهی', 'error');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return <div className="text-center py-20">در حال بارگذاری...</div>;
    }

    return (
        <DashboardLayout sidebar={
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-bold text-lg mb-4">📋 مدیریت آگهی‌ها</h3>
                
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">نوع آگهی</p>
                        <nav className="space-y-2">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`w-full text-left px-4 py-2 rounded-md text-sm ${filterType === 'all' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                همه
                            </button>
                            <button
                                onClick={() => setFilterType('fixed')}
                                className={`w-full text-left px-4 py-2 rounded-md text-sm ${filterType === 'fixed' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                قیمت مقطوع
                            </button>
                            <button
                                onClick={() => setFilterType('inquiry')}
                                className={`w-full text-left px-4 py-2 rounded-md text-sm ${filterType === 'inquiry' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                استعلامی
                            </button>
                        </nav>
                    </div>

                    <div>
                        <p className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">وضعیت</p>
                        <nav className="space-y-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`w-full text-left px-4 py-2 rounded-md text-sm ${filterStatus === 'all' ? 'bg-green-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                همه
                            </button>
                            <button
                                onClick={() => setFilterStatus('available')}
                                className={`w-full text-left px-4 py-2 rounded-md text-sm ${filterStatus === 'available' ? 'bg-green-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                موجود
                            </button>
                            <button
                                onClick={() => setFilterStatus('sold')}
                                className={`w-full text-left px-4 py-2 rounded-md text-sm ${filterStatus === 'sold' ? 'bg-green-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                فروخته شده
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        }>
            <div className="space-y-6">
                {/* Header with Search */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">📋 لیست آگهی‌ها</h2>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            تعداد: {filteredListings.length} آگهی
                        </div>
                    </div>
                    
                    <input
                        type="text"
                        placeholder="جستجو بر اساس شماره..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        dir="ltr"
                    />
                </div>

                {/* Listings Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    {filteredListings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">شماره</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">نوع</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">قیمت</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">اپراتور</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">وضعیت</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">فعالیت</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredListings.map(sim => (
                                        <tr key={sim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3" style={{ direction: 'ltr' }}>
                                                <span className="font-mono">{sim.number}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    sim.type === 'fixed' 
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                }`}>
                                                    {sim.type === 'fixed' ? 'مقطوع' : 'استعلامی'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {sim.type === 'inquiry' 
                                                    ? 'توافقی' 
                                                    : `${(sim.price || 0).toLocaleString('fa-IR')} تومان`
                                                }
                                            </td>
                                            <td className="px-4 py-3">{sim.carrier}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    sim.status === 'available' 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                    {sim.status === 'available' ? 'موجود' : 'فروخته شده'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    sim.is_active 
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {sim.is_active ? 'فعال' : 'صفر'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleDeleteListing(sim)}
                                                    disabled={deleting === sim.id}
                                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm disabled:bg-gray-400 transition-colors"
                                                    title="حذف آگهی"
                                                >
                                                    {deleting === sim.id ? '⏳ در حال حذف...' : '🗑️ حذف'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">هیچ آگهی با این فیلتر یافت نشد.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminListingsManagement;
