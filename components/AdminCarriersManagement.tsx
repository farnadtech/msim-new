import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useCarriers } from '../contexts/CarriersContext';
import api from '../services/api-supabase';

interface Carrier {
    id: number;
    name: string;
    name_fa: string;
    is_active: boolean;
    display_order: number;
}

const AdminCarriersManagement: React.FC = () => {
    const { showNotification } = useNotification();
    const { refreshCarriers } = useCarriers();
    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        name_fa: '',
        is_active: true,
        display_order: 0
    });

    useEffect(() => {
        loadCarriers();
    }, []);

    const loadCarriers = async () => {
        setLoading(true);
        try {
            const { data, error } = await api.supabase
                .from('carriers')
                .select('*')
                .order('display_order', { ascending: true });
            
            if (error) throw error;
            setCarriers(data || []);
        } catch (error) {
            showNotification('خطا در بارگذاری اپراتورها', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setFormData({
            name: '',
            name_fa: '',
            is_active: true,
            display_order: carriers.length + 1
        });
        setEditingCarrier(null);
        setAddModalOpen(true);
    };

    const handleEdit = (carrier: Carrier) => {
        setFormData({
            name: carrier.name,
            name_fa: carrier.name_fa,
            is_active: carrier.is_active,
            display_order: carrier.display_order
        });
        setEditingCarrier(carrier);
        setAddModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.name_fa) {
            showNotification('لطفاً تمام فیلدها را پر کنید', 'error');
            return;
        }

        try {
            if (editingCarrier) {
                // Update
                const { error } = await api.supabase
                    .from('carriers')
                    .update({
                        name: formData.name,
                        name_fa: formData.name_fa,
                        is_active: formData.is_active,
                        display_order: formData.display_order,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingCarrier.id);
                
                if (error) throw error;
                showNotification('اپراتور به‌روزرسانی شد', 'success');
            } else {
                // Insert
                const { error } = await api.supabase
                    .from('carriers')
                    .insert({
                        name: formData.name,
                        name_fa: formData.name_fa,
                        is_active: formData.is_active,
                        display_order: formData.display_order
                    });
                
                if (error) throw error;
                showNotification('اپراتور اضافه شد', 'success');
            }
            
            setAddModalOpen(false);
            await loadCarriers();
            await refreshCarriers(); // Refresh global carriers context
        } catch (error: any) {
            showNotification(error.message || 'خطا در ذخیره اپراتور', 'error');
        }
    };

    const handleToggleActive = async (carrier: Carrier) => {
        try {
            const { error } = await api.supabase
                .from('carriers')
                .update({
                    is_active: !carrier.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', carrier.id);
            
            if (error) throw error;
            showNotification(
                carrier.is_active ? 'اپراتور غیرفعال شد' : 'اپراتور فعال شد',
                'success'
            );
            await loadCarriers();
            await refreshCarriers(); // Refresh global carriers context
        } catch (error) {
            showNotification('خطا در تغییر وضعیت', 'error');
        }
    };

    const handleDelete = async (carrier: Carrier) => {
        if (!confirm(`آیا مطمئن هستید که می‌خواهید "${carrier.name_fa}" را حذف کنید؟`)) {
            return;
        }

        try {
            const { error } = await api.supabase
                .from('carriers')
                .delete()
                .eq('id', carrier.id);
            
            if (error) throw error;
            showNotification('اپراتور حذف شد', 'success');
            await loadCarriers();
            await refreshCarriers(); // Refresh global carriers context
        } catch (error) {
            showNotification('خطا در حذف اپراتور', 'error');
        }
    };

    if (loading) {
        return <div className="text-center py-20">در حال بارگذاری...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">📱 مدیریت اپراتورها</h2>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            await loadCarriers();
                            await refreshCarriers();
                            showNotification('لیست اپراتورها به‌روز شد', 'success');
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
                    >
                        🔄 رفرش
                    </button>
                    <button
                        onClick={handleAdd}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        ➕ افزودن اپراتور
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">ترتیب</th>
                            <th className="p-3">نام انگلیسی</th>
                            <th className="p-3">نام فارسی</th>
                            <th className="p-3">وضعیت</th>
                            <th className="p-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {carriers.map(carrier => (
                            <tr key={carrier.id} className="border-b dark:border-gray-700">
                                <td className="p-3">{carrier.display_order}</td>
                                <td className="p-3 font-mono">{carrier.name}</td>
                                <td className="p-3 font-bold">{carrier.name_fa}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        carrier.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {carrier.is_active ? '✓ فعال' : '✗ غیرفعال'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(carrier)}
                                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                                        >
                                            ✏️ ویرایش
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(carrier)}
                                            className={`px-3 py-1 rounded text-sm ${
                                                carrier.is_active
                                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                            }`}
                                        >
                                            {carrier.is_active ? '🚫 غیرفعال' : '✓ فعال'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(carrier)}
                                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                                        >
                                            🗑️ حذف
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-2xl font-bold mb-6">
                            {editingCarrier ? 'ویرایش اپراتور' : 'افزودن اپراتور جدید'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">نام انگلیسی</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="irancell"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">نام فارسی</label>
                                <input
                                    type="text"
                                    value={formData.name_fa}
                                    onChange={(e) => setFormData({...formData, name_fa: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="ایرانسل"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">ترتیب نمایش</label>
                                <input
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                    className="w-4 h-4"
                                />
                                <label className="text-sm font-medium">فعال</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                onClick={() => setAddModalOpen(false)}
                                className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                                انصراف
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                            >
                                ذخیره
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCarriersManagement;
