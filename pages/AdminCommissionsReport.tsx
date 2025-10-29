import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Commission } from '../types';
import api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';

const AdminCommissionsReport: React.FC = () => {
    const { showNotification } = useNotification();
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCommission, setTotalCommission] = useState(0);
    const [dateFilter, setDateFilter] = useState('');
    const [sellerFilter, setSellerFilter] = useState('');

    useEffect(() => {
        fetchCommissions();
    }, []);

    const fetchCommissions = async () => {
        try {
            setLoading(true);
            const commissionsData = await api.getCommissions();

            setCommissions(commissionsData || []);
            
            // Calculate total commission
            const total = commissionsData?.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0) || 0;
            setTotalCommission(total);
        } catch (err) {
            showNotification('خطا در دریافت اطلاعات کمیسیون', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredCommissions = commissions.filter(commission => {
        let matches = true;
        
        if (dateFilter) {
            const commissionDate = new Date(commission.date).toLocaleDateString('fa-IR');
            const filterDate = new Date(dateFilter).toLocaleDateString('fa-IR');
            matches = matches && commissionDate === filterDate;
        }
        
        if (sellerFilter) {
            matches = matches && commission.seller_name.includes(sellerFilter);
        }
        
        return matches;
    });

    return (
        <DashboardLayout>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6">گزارش درآمد کمیسیون‌ها</h2>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-6 rounded-lg">
                        <p className="text-green-600 dark:text-green-300 text-sm font-semibold">کل کمیسیون‌های دریافت‌شده</p>
                        <p className="text-3xl font-bold text-green-800 dark:text-green-200 mt-2">
                            {totalCommission.toLocaleString('fa-IR')} تومان
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-6 rounded-lg">
                        <p className="text-blue-600 dark:text-blue-300 text-sm font-semibold">تعداد فروش‌ها</p>
                        <p className="text-3xl font-bold text-blue-800 dark:text-blue-200 mt-2">
                            {filteredCommissions.length}
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-6 rounded-lg">
                        <p className="text-purple-600 dark:text-purple-300 text-sm font-semibold">میانگین کمیسیون</p>
                        <p className="text-3xl font-bold text-purple-800 dark:text-purple-200 mt-2">
                            {filteredCommissions.length > 0 
                                ? Math.floor(filteredCommissions.reduce((sum, c) => sum + c.commission_amount, 0) / filteredCommissions.length).toLocaleString('fa-IR')
                                : '0'
                            } تومان
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2 font-medium">فیلتر بر اساس تاریخ</label>
                            <input 
                                type="date" 
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 font-medium">جستجو بر اساس نام فروشنده</label>
                            <input 
                                type="text" 
                                value={sellerFilter}
                                onChange={(e) => setSellerFilter(e.target.value)}
                                placeholder="نام فروشنده..."
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center py-8">در حال بارگذاری...</div>
                ) : filteredCommissions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">هیچ کمیسیونی یافت نشد</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th className="p-3 font-semibold">شماره سیمکارت</th>
                                    <th className="p-3 font-semibold">فروشنده</th>
                                    <th className="p-3 font-semibold">خریدار</th>
                                    <th className="p-3 font-semibold">نوع فروش</th>
                                    <th className="p-3 font-semibold">قیمت فروش</th>
                                    <th className="p-3 font-semibold">درصد کمیسیون</th>
                                    <th className="p-3 font-semibold">مبلغ کمیسیون</th>
                                    <th className="p-3 font-semibold">مبلغ دریافت‌شده فروشنده</th>
                                    <th className="p-3 font-semibold">تاریخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCommissions.map((commission, index) => (
                                    <tr key={commission.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="p-3 font-mono">{commission.sim_number}</td>
                                        <td className="p-3">{commission.seller_name}</td>
                                        <td className="p-3">{commission.buyer_name || 'نامشخص'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                commission.sale_type === 'auction' 
                                                    ? 'bg-red-100 text-red-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {commission.sale_type === 'auction' ? 'حراجی' : 'مقطوع'}
                                            </span>
                                        </td>
                                        <td className="p-3 font-semibold">{commission.sale_price.toLocaleString('fa-IR')}</td>
                                        <td className="p-3">{commission.commission_percentage}%</td>
                                        <td className="p-3 text-green-600 dark:text-green-400 font-semibold">
                                            {commission.commission_amount.toLocaleString('fa-IR')}
                                        </td>
                                        <td className="p-3 text-blue-600 dark:text-blue-400 font-semibold">
                                            {commission.seller_received_amount.toLocaleString('fa-IR')}
                                        </td>
                                        <td className="p-3 text-xs text-gray-500">
                                            {new Date(commission.date).toLocaleDateString('fa-IR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminCommissionsReport;
