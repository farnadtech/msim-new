import React, { useState } from 'react';
// FIX: Upgrading react-router-dom from v5 to v6.
import { NavLink, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useData } from '../hooks/useData';
import { User, SimCard, Package } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';
import AdminPaymentReceipts from './AdminPaymentReceipts';

const AdminSeedNotice: React.FC<{ onSeeded: () => void }> = ({ onSeeded }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    const handleSeed = async () => {
        setIsLoading(true);
        try {
            await api.seedDatabase();
            showNotification('پایگاه داده با موفقیت با داده های نمونه پر شد.', 'success');
            onSeeded();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.';
            showNotification(`خطا در مقداردهی اولیه پایگاه داده: ${message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/50 p-6 rounded-lg shadow-md text-center border-l-4 border-yellow-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7l8 5 8-5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12l8 5" />
            </svg>
            <h3 className="text-xl font-bold mt-2">راه اندازی اولیه</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
                پایگاه داده شما خالی به نظر می رسد. برای شروع، می توانید آن را با داده های نمونه پر کنید.
            </p>
            <button
                onClick={handleSeed}
                disabled={isLoading}
                className="mt-4 bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
                {isLoading ? 'در حال مقداردهی...' : 'مقداردهی اولیه با داده های نمونه'}
            </button>
        </div>
    );
};


const AdminOverview = () => {
    const { users, simCards, packages, loading, fetchData } = useData();
    const needsSeeding = !loading && packages.length === 0 && simCards.length === 0;

    return (
        <div className="space-y-6">
            {needsSeeding && <AdminSeedNotice onSeeded={fetchData} />}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">داشبورد مدیر</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{users.length}</p>
                        <p className="text-blue-700 dark:text-blue-400">کل کاربران</p>
                    </div>
                     <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-green-800 dark:text-green-300">{simCards.length}</p>
                        <p className="text-green-700 dark:text-green-400">کل سیمکارت ها</p>
                    </div>
                     <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-300">{packages.length}</p>
                        <p className="text-yellow-700 dark:text-yellow-400">کل پکیج ها</p>
                    </div>
                </div>
            </div>
        </div>
    )
};

const ManageUsers = () => {
    const { users, updateUser } = useData();
    const { showNotification } = useNotification();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, role: user.role, wallet_balance: user.wallet_balance });
        setModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'wallet_balance' ? parseInt(value) : value }));
    };
    
    const handleSave = async () => {
        if (!editingUser) return;
        try {
            await updateUser(editingUser.id, formData);
            showNotification('کاربر با موفقیت به‌روزرسانی شد.', 'success');
            setModalOpen(false);
            setEditingUser(null);
        } catch (error) {
            showNotification('خطا در به‌روزرسانی کاربر.', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">مدیریت کاربران</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">نام</th>
                            <th className="p-3">ایمیل</th>
                            <th className="p-3">نقش</th>
                            <th className="p-3">موجودی کیف پول</th>
                            <th className="p-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b dark:border-gray-700">
                                <td className="p-3">{user.name}</td>
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">{user.role}</td>
                                <td className="p-3">{(user.wallet_balance || 0).toLocaleString('fa-IR')} تومان</td>
                                <td className="p-3">
                                    <button onClick={() => handleEditClick(user)} className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 text-sm">ویرایش</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">ویرایش کاربر: {editingUser.name}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-1">نام</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                            </div>
                            <div>
                                <label className="block mb-1">ایمیل</label>
                                <input type="email" name="email" value={formData.email || ''} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                            </div>
                             <div>
                                <label className="block mb-1">نقش</label>
                                <select name="role" value={formData.role || ''} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700">
                                    <option value="admin">admin</option>
                                    <option value="seller">seller</option>
                                    <option value="buyer">buyer</option>
                                </select>
                            </div>
                             <div>
                                <label className="block mb-1">موجودی کیف پول</label>
                                <input type="number" name="wallet_balance" value={formData.wallet_balance || 0} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                            <button onClick={() => setModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg">انصراف</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white bg-blue-600">ذخیره تغییرات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

const ManageSimCards = () => {
    const { simCards, users, updateSimCard } = useData();
    const { showNotification } = useNotification();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSim, setEditingSim] = useState<SimCard | null>(null);
    const [formData, setFormData] = useState<{status?: 'available' | 'sold', price?: number}>({});

    const handleEditClick = (sim: SimCard) => {
        setEditingSim(sim);
        const price = sim.type === 'auction' ? sim.auction_details?.current_bid : sim.price;
        setFormData({ status: sim.status, price: price });
        setModalOpen(true);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseInt(value) : value }));
    };

    const handleSave = async () => {
        if (!editingSim || formData.price === undefined) return;
        try {
            let dataToUpdate: Partial<SimCard> = { status: formData.status };
            if (editingSim.type === 'auction' && editingSim.auction_details) {
                dataToUpdate.auction_details = { ...editingSim.auction_details, current_bid: formData.price };
            } else {
                dataToUpdate.price = formData.price;
            }
            await updateSimCard(editingSim.id, dataToUpdate);
            showNotification('سیمکارت با موفقیت به‌روزرسانی شد.', 'success');
            setModalOpen(false);
            setEditingSim(null);
        } catch (error) {
            showNotification('خطا در به‌روزرسانی سیمکارت.', 'error');
        }
    };

    return (
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">مدیریت سیمکارت ها</h2>
            <div className="overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">شماره</th>
                            <th className="p-3">فروشنده</th>
                            <th className="p-3">قیمت/پیشنهاد</th>
                            <th className="p-3">وضعیت</th>
                            <th className="p-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {simCards.map(sim => (
                            <tr key={sim.id} className="border-b dark:border-gray-700">
                                <td className="p-3" style={{direction: 'ltr'}}>{sim.number}</td>
                                <td className="p-3">{users.find(u => u.id === sim.seller_id)?.name}</td>
                                <td className="p-3">{((sim.type === 'auction' ? sim.auction_details?.current_bid : sim.price) || 0).toLocaleString('fa-IR')} تومان</td>
                                <td className="p-3">{sim.status === 'available' ? 'موجود' : 'فروخته شده'}</td>
                                <td className="p-3">
                                    <button onClick={() => handleEditClick(sim)} className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 text-sm">ویرایش</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && editingSim && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">ویرایش سیمکارت: {editingSim.number}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-1">وضعیت</label>
                                <select name="status" value={formData.status} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700">
                                    <option value="available">موجود</option>
                                    <option value="sold">فروخته شده</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1">{editingSim.type === 'auction' ? 'بالاترین پیشنهاد' : 'قیمت'} (تومان)</label>
                                <input type="number" name="price" value={formData.price} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                            <button onClick={() => setModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg">انصراف</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white bg-blue-600">ذخیره تغییرات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

const ManagePackages = () => {
    const { packages, users, addPackage, updatePackage } = useData();
    const { showNotification } = useNotification();

    const [isBuyersModalOpen, setBuyersModalOpen] = useState(false);
    const [viewingPackage, setViewingPackage] = useState<Package | null>(null);

    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<Package | null>(null); // null for new, Package object for editing
    const [formData, setFormData] = useState<Omit<Package, 'id'>>({
        name: '', price: 0, duration_days: 30, listing_limit: 5, description: ''
    });

    const buyers = viewingPackage ? users.filter(u => u.package_id === viewingPackage.id) : [];

    const handleViewBuyers = (pkg: Package) => {
        setViewingPackage(pkg);
        setBuyersModalOpen(true);
    };

    const handleOpenAddModal = () => {
        setEditingPackage(null);
        setFormData({ name: '', price: 0, duration_days: 30, listing_limit: 5, description: '' });
        setEditModalOpen(true);
    };

    const handleOpenEditModal = (pkg: Package) => {
        setEditingPackage(pkg);
        setFormData({ name: pkg.name, price: pkg.price, duration_days: pkg.duration_days, listing_limit: pkg.listing_limit, description: pkg.description });
        setEditModalOpen(true);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' || name === 'duration_days' || name === 'listing_limit' ? parseInt(value) || 0 : value }));
    };

    const handleSave = async () => {
        try {
            if (editingPackage) {
                await updatePackage(editingPackage.id, formData);
                showNotification('پکیج با موفقیت به‌روزرسانی شد.', 'success');
            } else {
                await addPackage(formData);
                showNotification('پکیج جدید با موفقیت اضافه شد.', 'success');
            }
            setEditModalOpen(false);
        } catch (error) {
            showNotification('خطا در ذخیره‌سازی پکیج.', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold">مدیریت پکیج ها</h2>
                 <button onClick={handleOpenAddModal} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">افزودن پکیج جدید</button>
            </div>
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map(pkg => (
                    <div key={pkg.id} className="border dark:border-gray-700 p-4 rounded-lg flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-lg">{pkg.name}</h3>
                            <p>قیمت: {pkg.price.toLocaleString('fa-IR')} تومان</p>
                            <p>مدت: {pkg.duration_days} روز</p>
                            <p>تعداد آگهی: {pkg.listing_limit} عدد</p>
                        </div>
                        <div className="mt-4 flex space-x-2 space-x-reverse">
                             <button onClick={() => handleViewBuyers(pkg)} className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm">مشاهده خریداران</button>
                             <button onClick={() => handleOpenEditModal(pkg)} className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 text-sm">ویرایش</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Buyers Modal */}
             {isBuyersModalOpen && viewingPackage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">خریداران پکیج: {viewingPackage.name}</h3>
                        {buyers.length > 0 ? (
                             <ul className="space-y-2 list-disc list-inside">
                                {buyers.map(b => <li key={b.id}>{b.name} ({b.email})</li>)}
                            </ul>
                        ) : (
                            <p>هیچ خریداری برای این پکیج یافت نشد.</p>
                        )}
                       
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setBuyersModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg">بستن</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit/Add Modal */}
            {isEditModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-4">{editingPackage ? 'ویرایش پکیج' : 'افزودن پکیج جدید'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-1">نام پکیج</label>
                                <input type="text" name="name" value={formData.name} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1">قیمت (تومان)</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                                </div>
                                <div>
                                    <label className="block mb-1">مدت (روز)</label>
                                    <input type="number" name="duration_days" value={formData.duration_days} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                                </div>
                                <div>
                                    <label className="block mb-1">تعداد آگهی</label>
                                    <input type="number" name="listing_limit" value={formData.listing_limit} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                                </div>
                            </div>
                             <div>
                                <label className="block mb-1">توضیحات</label>
                                <textarea name="description" value={formData.description} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" rows={3}></textarea>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                            <button onClick={() => setEditModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg">انصراف</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white bg-blue-600">ذخیره</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

const PackagePurchases = () => {
    const { transactions, users } = useData();
    const packageTransactions = transactions.filter(t => t.type === 'purchase' && t.description.includes('خرید پکیج'));
    
    const getPackageName = (description: string) => {
        return description.replace('خرید پکیج', '').trim();
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">تاریخچه خرید پکیج ها</h2>
            <div className="overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">خریدار</th>
                            <th className="p-3">نام پکیج</th>
                            <th className="p-3">مبلغ پرداخت شده</th>
                            <th className="p-3">تاریخ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {packageTransactions.map(t => {
                             const user = users.find(u => u.id === t.user_id);
                             return (
                                <tr key={t.id} className="border-b dark:border-gray-700">
                                    <td className="p-3">{user ? user.name : 'کاربر حذف شده'}</td>
                                    <td className="p-3">{getPackageName(t.description)}</td>
                                    <td className="p-3">{Math.abs(t.amount).toLocaleString('fa-IR')} تومان</td>
                                    <td className="p-3">{new Date(t.date).toLocaleDateString('fa-IR')}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

// FIX: Moved NavItem component outside of AdminDashboard to prevent re-creation on render and fix children prop error.
// FIX: Changed NavItem to be a React.FC to fix errors about missing 'children' property.
const NavItem: React.FC<{ to: string, children: React.ReactNode, end?: boolean }> = ({ to, children, end = false }) => (
    <NavLink
        to={to}
        // FIX: The `end` prop and `className` function are v6 features.
        // Replaced `exact` and `activeClassName` for v6 compatibility.
        end={end}
        className={({isActive}) => 
            "block px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" +
            (isActive ? " bg-blue-600 text-white" : "")
        }
    >
        {children}
    </NavLink>
);

const AdminDashboard: React.FC = () => {
  const sidebar = (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h3 className="font-bold text-lg mb-4">پنل مدیریت</h3>
      <nav className="space-y-2">
        {/* FIX: Using relative paths for nested routes. `end` prop for the index link. */}
        <NavItem to="." end>داشبورد</NavItem>
        <NavItem to="users">مدیریت کاربران</NavItem>
        <NavItem to="simcards">مدیریت سیمکارت ها</NavItem>
        <NavItem to="packages">مدیریت پکیج ها</NavItem>
        <NavItem to="purchases">خرید پکیج ها</NavItem>
        <NavItem to="receipts">رسیدهای پرداخت</NavItem>
      </nav>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
        {/* FIX: Replaced v5 <Switch> with v6 <Routes> and updated Route syntax for nesting. */}
        <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="simcards" element={<ManageSimCards />} />
            <Route path="packages" element={<ManagePackages />} />
            <Route path="purchases" element={<PackagePurchases />} />
            <Route path="receipts" element={<AdminPaymentReceipts />} />
        </Routes>
    </DashboardLayout>
  );
};

export default AdminDashboard;