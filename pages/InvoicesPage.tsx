import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { NavLink } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Invoice from '../components/InvoiceNew';
import { Commission, PurchaseOrder, SimCard, User } from '../types';
import api from '../services/api-supabase';
import { supabase } from '../services/supabase';

// NavItem component for sidebar
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

const InvoicesPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'purchases' | 'sales' | 'commissions'>('purchases');
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [sales, setSales] = useState<PurchaseOrder[]>([]);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<{
        type: 'purchase' | 'sale' | 'commission';
        data: Commission | PurchaseOrder;
        simCard?: SimCard;
        buyer?: User;
        seller?: User;
    } | null>(null);

    useEffect(() => {
        if (user) {
            loadInvoices();
        }
    }, [user]);

    const loadInvoices = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Load purchases (as buyer)
            const purchaseOrders = await api.getPurchaseOrders(user.id, 'buyer');
            setPurchases(purchaseOrders);

            // Load sales (as seller)
            const saleOrders = await api.getPurchaseOrders(user.id, 'seller');
            setSales(saleOrders);

            // Load commissions (if seller)
            if (user.role === 'seller' || user.role === 'admin') {
                const commissionsData = await api.getCommissions();
                const userCommissions = commissionsData.filter(c => c.seller_id === user.id);
                setCommissions(userCommissions);
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoice = async (
        type: 'purchase' | 'sale' | 'commission',
        data: Commission | PurchaseOrder
    ) => {
        try {
            let simCard: SimCard | undefined;
            let buyer: User | undefined;
            let seller: User | undefined;

            if ('sim_card_id' in data) {
                // This is a PurchaseOrder
                const { data: simData } = await supabase
                    .from('sim_cards')
                    .select('*')
                    .eq('id', data.sim_card_id)
                    .single();
                simCard = simData || undefined;

                const { data: buyerData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.buyer_id)
                    .single();
                buyer = buyerData || undefined;

                const { data: sellerData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.seller_id)
                    .single();
                seller = sellerData || undefined;
            }

            setSelectedInvoice({
                type,
                data,
                simCard,
                buyer,
                seller
            });
        } catch (error) {
        }
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('fa-IR');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
            'pending': { label: '⏳ در انتظار', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
            'code_sent': { label: '📥 کد ارسال شده', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
            'code_verified': { label: '✅ کد تایید شده', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
            'document_pending': { label: '📄 در انتظار مدارک', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
            'document_submitted': { label: '📋 مدارک ارسال شده', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
            'verified': { label: '✅ تایید شده', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
            'completed': { label: '✅ تکمیل شده', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
            'cancelled': { label: '❌ لغو شده', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }
        };
        const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        const sidebar = (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-bold text-lg mb-4">📄 فاکتورها</h3>
                <nav className="space-y-2">
                    <NavItem to="/invoices" end>📄 فاکتورهای من</NavItem>
                    {user?.role === 'buyer' && <NavItem to="/buyer">🛒 پنل خریدار</NavItem>}
                    {user?.role === 'seller' && <NavItem to="/seller">🏪 پنل فروشنده</NavItem>}
                    {user?.role === 'admin' && <NavItem to="/admin">👑 پنل مدیر</NavItem>}
                    <NavItem to="/notifications">🔔 اعلانات</NavItem>
                </nav>
            </div>
        );
        
        return (
            <DashboardLayout sidebar={sidebar}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const sidebar = (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">📄 فاکتورها</h3>
            <nav className="space-y-2">
                <NavItem to="/invoices" end>📄 فاکتورهای من</NavItem>
                {user?.role === 'buyer' && <NavItem to="/buyer">🛒 پنل خریدار</NavItem>}
                {user?.role === 'seller' && <NavItem to="/seller">🏪 پنل فروشنده</NavItem>}
                {user?.role === 'admin' && <NavItem to="/admin">👑 پنل مدیر</NavItem>}
                <NavItem to="/notifications">🔔 اعلانات</NavItem>
            </nav>
        </div>
    );

    return (
        <DashboardLayout sidebar={sidebar}>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            📄 فاکتورهای من
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            مشاهده و چاپ فاکتورهای خرید و فروش
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mb-6 border-b dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('purchases')}
                            className={`px-6 py-3 font-semibold transition-colors ${
                                activeTab === 'purchases'
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            🛒 خریدهای من ({purchases.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`px-6 py-3 font-semibold transition-colors ${
                                activeTab === 'sales'
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            🏪 فروش‌های من ({sales.length})
                        </button>
                        {(user?.role === 'seller' || user?.role === 'admin') && (
                            <button
                                onClick={() => setActiveTab('commissions')}
                                className={`px-6 py-3 font-semibold transition-colors ${
                                    activeTab === 'commissions'
                                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                💰 کمیسیون‌ها ({commissions.length})
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                        {activeTab === 'purchases' && (
                            <div className="overflow-x-auto">
                                {purchases.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                                            هیچ خریدی ثبت نشده است
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    شماره فاکتور
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    تاریخ
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    مبلغ
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    وضعیت
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    عملیات
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {purchases.map((purchase) => (
                                                <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        INV-{purchase.id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(purchase.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatPrice(purchase.price)} تومان
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(purchase.status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => handleViewInvoice('purchase', purchase)}
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                                        >
                                                            مشاهده فاکتور
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {activeTab === 'sales' && (
                            <div className="overflow-x-auto">
                                {sales.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                                            هیچ فروشی ثبت نشده است
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    شماره فاکتور
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    تاریخ
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    مبلغ
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    وضعیت
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    عملیات
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {sales.map((sale) => (
                                                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        INV-{sale.id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(sale.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatPrice(sale.seller_received_amount)} تومان
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(sale.status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => handleViewInvoice('sale', sale)}
                                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                                        >
                                                            مشاهده فاکتور
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {activeTab === 'commissions' && (
                            <div className="overflow-x-auto">
                                {commissions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                                            هیچ کمیسیونی ثبت نشده است
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    شماره فاکتور
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    تاریخ
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    شماره سیم‌کارت
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    مبلغ فروش
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    کمیسیون
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    دریافتی
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    عملیات
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {commissions.map((commission) => (
                                                <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        COM-{commission.id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(commission.date)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900 dark:text-white">
                                                        {commission.sim_number}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                        {formatPrice(commission.sale_price)} تومان
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                                                        - {formatPrice(commission.commission_amount)} تومان
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                                        {formatPrice(commission.seller_received_amount)} تومان
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => handleViewInvoice('commission', commission)}
                                                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                                                        >
                                                            مشاهده فاکتور
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Invoice Modal */}
            {selectedInvoice && (
                <Invoice
                    type={selectedInvoice.type}
                    data={selectedInvoice.data}
                    simCard={selectedInvoice.simCard}
                    buyer={selectedInvoice.buyer}
                    seller={selectedInvoice.seller}
                    invoiceNumber={
                        selectedInvoice.type === 'commission'
                            ? `COM-${selectedInvoice.data.id}`
                            : `INV-${selectedInvoice.data.id}`
                    }
                    onClose={() => setSelectedInvoice(null)}
                />
            )}
        </DashboardLayout>
    );
};

export default InvoicesPage;
