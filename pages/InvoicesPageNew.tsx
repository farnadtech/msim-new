import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { NavLink } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import InvoiceFinal from '../components/InvoiceFinal';
import { Commission, PurchaseOrder } from '../types';
import api from '../services/api-supabase';
import { useNotification } from '../contexts/NotificationContext';

const NavItem: React.FC<{ to: string, children: React.ReactNode, end?: boolean }> = ({ to, children, end = false }) => (
    <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`
        }
    >
        {children}
    </NavLink>
);

const InvoicesPageNew: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'purchases' | 'sales' | 'commissions'>('purchases');
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [showInvoice, setShowInvoice] = useState(false);

    useEffect(() => {
        if (user) {
            // Set default tab based on role
            if (user.role === 'buyer') setActiveTab('purchases');
            else if (user.role === 'seller') setActiveTab('sales');
            else if (user.role === 'admin') setActiveTab('commissions');
            
            loadData();
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [activeTab]);

    const loadData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            if (activeTab === 'purchases' && (user.role === 'buyer' || user.role === 'admin')) {
                const allOrders = await api.getPurchaseOrders(user.id, user.role);
                setOrders(allOrders.filter((o: PurchaseOrder) => o.buyer_id === user.id));
            } else if (activeTab === 'sales' && (user.role === 'seller' || user.role === 'admin')) {
                const allOrders = await api.getPurchaseOrders(user.id, user.role);
                setOrders(allOrders.filter((o: PurchaseOrder) => o.seller_id === user.id));
            } else if (activeTab === 'commissions' && user.role === 'admin') {
                const commissionsData = await api.getCommissions();
                setCommissions(commissionsData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showNotification('خطا در بارگذاری اطلاعات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoice = (order: PurchaseOrder) => {
        // Show invoice for all orders (pre-invoice for non-completed, final invoice for completed)
        setSelectedOrder(order);
        setShowInvoice(true);
    };

    const handlePrint = () => {
        window.print();
    };

    const formatPrice = (price: number) => price.toLocaleString('fa-IR');
    
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fa-IR');
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'pending': '⏳ در انتظار',
            'code_sent': '📥 کد ارسال شده',
            'completed': '✅ تکمیل شده',
            'cancelled': '❌ لغو شده'
        };
        return labels[status] || status;
    };

    const sidebar = (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">📄 فاکتورها</h3>
            <nav className="space-y-2">
                <NavItem to="/invoices" end>📄 فاکتورهای من</NavItem>
                {user?.role === 'buyer' && <NavItem to="/buyer">🛒 پنل خریدار</NavItem>}
                {user?.role === 'seller' && <NavItem to="/seller">🏪 پنل فروشنده</NavItem>}
                {user?.role === 'admin' && <NavItem to="/admin">👑 پنل مدیر</NavItem>}
            </nav>
        </div>
    );

    if (loading) {
        return (
            <DashboardLayout sidebar={sidebar}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout sidebar={sidebar}>
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">📄 فاکتورهای من</h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                    {(user?.role === 'buyer' || user?.role === 'admin') && (
                        <button
                            onClick={() => setActiveTab('purchases')}
                            className={`px-6 py-3 font-semibold ${
                                activeTab === 'purchases'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600'
                            }`}
                        >
                            🛒 خریدها
                        </button>
                    )}
                    {(user?.role === 'seller' || user?.role === 'admin') && (
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`px-6 py-3 font-semibold ${
                                activeTab === 'sales'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600'
                            }`}
                        >
                            🏪 فروش‌ها
                        </button>
                    )}
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setActiveTab('commissions')}
                            className={`px-6 py-3 font-semibold ${
                                activeTab === 'commissions'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600'
                            }`}
                        >
                            💰 کمیسیون‌ها
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {activeTab !== 'commissions' ? (
                        <div className="overflow-x-auto">
                            {orders.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">موردی یافت نشد</p>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-right">شماره</th>
                                            <th className="px-4 py-3 text-right">تاریخ</th>
                                            <th className="px-4 py-3 text-right">شماره سیم‌کارت</th>
                                            <th className="px-4 py-3 text-right">مبلغ</th>
                                            <th className="px-4 py-3 text-right">وضعیت</th>
                                            <th className="px-4 py-3 text-right">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order.id} className="border-b">
                                                <td className="px-4 py-3">{order.id}</td>
                                                <td className="px-4 py-3">{formatDate(order.created_at)}</td>
                                                <td className="px-4 py-3 font-mono">{(order as any).sim_number || order.sim_card_id}</td>
                                                <td className="px-4 py-3">{formatPrice(activeTab === 'sales' ? order.seller_received_amount : order.price)} تومان</td>
                                                <td className="px-4 py-3">{getStatusLabel(order.status)}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleViewInvoice(order)}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                                    >
                                                        {order.status === 'completed' ? 'فاکتور' : 'پیش‌فاکتور'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {commissions.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">موردی یافت نشد</p>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-right">شماره</th>
                                            <th className="px-4 py-3 text-right">تاریخ</th>
                                            <th className="px-4 py-3 text-right">شماره سیم‌کارت</th>
                                            <th className="px-4 py-3 text-right">مبلغ فروش</th>
                                            <th className="px-4 py-3 text-right">کمیسیون</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissions.map((comm) => (
                                            <tr key={comm.id} className="border-b">
                                                <td className="px-4 py-3">{comm.id}</td>
                                                <td className="px-4 py-3">{formatDate(comm.date)}</td>
                                                <td className="px-4 py-3 font-mono">{comm.sim_number}</td>
                                                <td className="px-4 py-3">{formatPrice(comm.sale_price)} تومان</td>
                                                <td className="px-4 py-3 text-green-600">{formatPrice(comm.commission_amount)} تومان</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Modal */}
            {showInvoice && selectedOrder && (
                <InvoiceFinal
                    order={selectedOrder}
                    type={activeTab === 'purchases' ? 'purchase' : 'sale'}
                    onClose={() => setShowInvoice(false)}
                />
            )}
        </DashboardLayout>
    );
};

export default InvoicesPageNew;
