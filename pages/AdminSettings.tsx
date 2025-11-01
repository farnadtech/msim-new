import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { SiteSetting } from '../types';
import { supabase } from '../services/supabase';

const AdminSettings: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [settings, setSettings] = useState<SiteSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editedValues, setEditedValues] = useState<Record<string, string>>({});
    const [activeCategory, setActiveCategory] = useState<string>('all');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const { data: allSettings, error } = await supabase
                .from('site_settings')
                .select('*')
                .order('category', { ascending: true })
                .order('setting_key', { ascending: true });
            
            if (error) throw error;
            
            setSettings(allSettings || []);
            
            // Initialize edited values
            const initialValues: Record<string, string> = {};
            (allSettings || []).forEach(setting => {
                initialValues[setting.setting_key] = setting.setting_value;
            });
            setEditedValues(initialValues);
        } catch (error) {
            console.error('Error loading settings:', error);
            showNotification('خطا در بارگذاری تنظیمات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (key: string, value: string) => {
        setEditedValues(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = async (settingKey: string) => {
        if (!user) return;
        
        try {
            setSaving(true);
            const newValue = editedValues[settingKey];
            
            const { error } = await supabase
                .from('site_settings')
                .update({
                    setting_value: newValue,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id
                })
                .eq('setting_key', settingKey);
            
            if (error) throw error;
            
            // Update local state
            setSettings(prev => prev.map(s => 
                s.setting_key === settingKey 
                    ? { ...s, setting_value: newValue, updated_at: new Date().toISOString() }
                    : s
            ));
            
            showNotification('تنظیمات با موفقیت ذخیره شد', 'success');
        } catch (error) {
            console.error('Error saving setting:', error);
            showNotification('خطا در ذخیره تنظیمات', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        if (!user) return;
        
        try {
            setSaving(true);
            const filteredSettings = activeCategory === 'all' 
                ? settings 
                : settings.filter(s => s.category === activeCategory);
            
            for (const setting of filteredSettings) {
                const newValue = editedValues[setting.setting_key];
                if (newValue !== setting.setting_value) {
                    const { error } = await supabase
                        .from('site_settings')
                        .update({
                            setting_value: newValue,
                            updated_at: new Date().toISOString(),
                            updated_by: user.id
                        })
                        .eq('setting_key', setting.setting_key);
                    
                    if (error) throw error;
                }
            }
            
            await loadSettings();
            showNotification('همه تنظیمات با موفقیت ذخیره شد', 'success');
        } catch (error) {
            console.error('Error saving all settings:', error);
            showNotification('خطا در ذخیره تنظیمات', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = async () => {
        if (!window.confirm('آیا مطمئن هستید که می‌خواهید تمام تنظیمات به حالت پیش‌فرض برگردند؟')) {
            return;
        }
        
        // This would require a separate API endpoint to reset to defaults
        showNotification('این قابلیت به زودی اضافه می‌شود', 'info');
    };

    const getCategoryLabel = (category: string): string => {
        const labels: Record<string, string> = {
            commission: '💰 کمیسیون',
            auction: '🏆 حراجی',
            listing: '📋 آگهی‌ها',
            payment: '💳 پرداخت',
            rond: '⭐ رند',
            general: '⚙️ عمومی'
        };
        return labels[category] || category;
    };

    const renderSettingInput = (setting: SiteSetting) => {
        const value = editedValues[setting.setting_key] || setting.setting_value;
        const hasChanged = value !== setting.setting_value;

        switch (setting.setting_type) {
            case 'boolean':
                return (
                    <div className="flex items-center space-x-3 space-x-reverse">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={value === 'true'}
                                onChange={(e) => handleValueChange(setting.setting_key, e.target.checked ? 'true' : 'false')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                                {value === 'true' ? 'فعال' : 'غیرفعال'}
                            </span>
                        </label>
                        {hasChanged && (
                            <button
                                onClick={() => handleSave(setting.setting_key)}
                                disabled={saving}
                                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400"
                            >
                                ذخیره
                            </button>
                        )}
                    </div>
                );

            case 'number':
                return (
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
                            className="w-48 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            step={setting.setting_key.includes('rate') ? '0.01' : '1'}
                        />
                        {hasChanged && (
                            <button
                                onClick={() => handleSave(setting.setting_key)}
                                disabled={saving}
                                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400"
                            >
                                ذخیره
                            </button>
                        )}
                    </div>
                );

            case 'string':
            default:
                return (
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
                            className="w-64 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                        {hasChanged && (
                            <button
                                onClick={() => handleSave(setting.setting_key)}
                                disabled={saving}
                                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400"
                            >
                                ذخیره
                            </button>
                        )}
                    </div>
                );
        }
    };

    const categories = ['all', 'commission', 'auction', 'listing', 'payment', 'rond', 'general'];
    const filteredSettings = activeCategory === 'all' 
        ? settings 
        : settings.filter(s => s.category === activeCategory);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">⚙️ تنظیمات سایت</h2>
                <div className="flex space-x-3 space-x-reverse">
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {saving ? 'در حال ذخیره...' : 'ذخیره همه تغییرات'}
                    </button>
                    <button
                        onClick={handleResetToDefaults}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                        بازگشت به پیش‌فرض
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b dark:border-gray-700 pb-3">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-t-lg transition-colors ${
                            activeCategory === cat
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                        {cat === 'all' ? '🌐 همه' : getCategoryLabel(cat)}
                    </button>
                ))}
            </div>

            {/* Settings List */}
            <div className="space-y-4">
                {filteredSettings.length > 0 ? (
                    filteredSettings.map(setting => (
                        <div 
                            key={setting.id}
                            className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                        <h3 className="font-bold text-lg">{setting.description}</h3>
                                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                                            {getCategoryLabel(setting.category)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                        کلید: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{setting.setting_key}</code>
                                    </p>
                                    {renderSettingInput(setting)}
                                    {setting.updated_at && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            آخرین به‌روزرسانی: {new Date(setting.updated_at).toLocaleDateString('fa-IR')} 
                                            {' - '}
                                            {new Date(setting.updated_at).toLocaleTimeString('fa-IR')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        هیچ تنظیماتی در این دسته‌بندی یافت نشد
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
                <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">ℹ️ راهنما:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• تغییرات بلافاصله پس از ذخیره اعمال می‌شوند</li>
                    <li>• برای تنظیمات نرخ (مانند کمیسیون)، از اعداد اعشاری استفاده کنید (مثال: 0.02 برای 2%)</li>
                    <li>• زمان‌ها به ساعت یا روز محاسبه می‌شوند</li>
                    <li>• مبالغ به تومان هستند</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminSettings;
