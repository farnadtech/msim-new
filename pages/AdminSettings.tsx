import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { SiteSetting } from '../types';
import { supabase } from '../services/supabase';
import * as settingsService from '../services/settings-service';

interface CategoryInfo {
    icon: string;
    label: string;
    color: string;
    description: string;
}

const AdminSettings: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [settings, setSettings] = useState<SiteSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editedValues, setEditedValues] = useState<Record<string, string>>({});
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());

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
            
            // Clear settings cache to force refresh everywhere
            settingsService.clearSettingsCache();
            
            // Update local state
            setSettings(prev => prev.map(s => 
                s.setting_key === settingKey 
                    ? { ...s, setting_value: newValue, updated_at: new Date().toISOString() }
                    : s
            ));
            
            showNotification('تنظیمات با موفقیت ذخیره شد و در سراسر سایت به روز شد', 'success');
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
            
            // Clear settings cache to force refresh everywhere
            settingsService.clearSettingsCache();
            
            await loadSettings();
            showNotification('تمام تنظیمات با موفقیت ذخیره شد و در سراسر سایت به روز شد', 'success');
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

    const categoryInfo: Record<string, CategoryInfo> = {
        commission: {
            icon: '💰',
            label: 'کمیسیون',
            color: 'from-emerald-500 to-teal-600',
            description: 'تنظیمات کمیسیون و سهم سایت'
        },
        auction: {
            icon: '🏆',
            label: 'حراجی',
            color: 'from-purple-500 to-pink-600',
            description: 'تنظیمات مربوط به حراجی‌های محصول'
        },
        listing: {
            icon: '📋',
            label: 'آگهی‌ها',
            color: 'from-blue-500 to-cyan-600',
            description: 'مدیریت ایام نمایش و حذف خودکار'
        },
        payment: {
            icon: '💳',
            label: 'پرداخت',
            color: 'from-orange-500 to-red-600',
            description: 'درگاه‌های پرداخت و حداقل مبالغ'
        },
        payment_gateways: {
            icon: '🔐',
            label: 'درگاه‌های پرداخت',
            color: 'from-indigo-500 to-blue-600',
            description: 'تنظیمات زرین‌پال، زیبال و کارت به کارت'
        },
        rond: {
            icon: '⭐',
            label: 'رند',
            color: 'from-yellow-500 to-amber-600',
            description: 'هزینه‌های درجات رند مختلف'
        },
        general: {
            icon: '⚙️',
            label: 'عمومی',
            color: 'from-gray-500 to-slate-600',
            description: 'تنظیمات عمومی سایت'
        }
    };

    const getCategoryLabel = (category: string): string => {
        const info = categoryInfo[category];
        return info ? `${info.icon} ${info.label}` : category;
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

    const categories = ['all', 'commission', 'auction', 'listing', 'payment', 'payment_gateways', 'rond', 'general'];
    
    let filteredSettings = activeCategory === 'all' 
        ? settings 
        : settings.filter(s => s.category === activeCategory);
    
    if (searchQuery.trim()) {
        filteredSettings = filteredSettings.filter(s => 
            s.description.includes(searchQuery) || 
            s.setting_key.includes(searchQuery) ||
            s.setting_value.includes(searchQuery)
        );
    }

    const toggleExpanded = (key: string) => {
        const newExpanded = new Set(expandedSettings);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedSettings(newExpanded);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Count changed settings
    const changedCount = Object.entries(editedValues).filter(([key, value]) => {
        const original = settings.find(s => s.setting_key === key)?.setting_value;
        return value !== original;
    }).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                ⚙️ تنظیمات سایت
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">مدیریت تمام پارامترهای سایت از یک جا</p>
                        </div>
                        <div className="flex space-x-3 space-x-reverse">
                            {changedCount > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg px-4 py-2">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold">
                                        {changedCount} تغییر در انتظار ذخیره
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={handleSaveAll}
                                disabled={saving || changedCount === 0}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold"
                            >
                                {saving ? '⏳ در حال ذخیره...' : '✓ ذخیره تغییرات'}
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="جستجو در تنظیمات... (توضیح، کلید یا مقدار)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Category Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {categories.filter(c => c !== 'all').map(cat => {
                        const info = categoryInfo[cat];
                        const catSettings = settings.filter(s => s.category === cat);
                        return (
                            <button
                                key={cat}
                                onClick={() => {
                                    setActiveCategory(cat);
                                    setSearchQuery('');
                                }}
                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                    activeCategory === cat
                                        ? `bg-gradient-to-br ${info.color} text-white border-current shadow-lg`
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-2xl mb-1">{info.icon}</p>
                                        <h3 className={`font-bold text-lg ${
                                            activeCategory === cat ? 'text-white' : ''
                                        }`}>
                                            {info.label}
                                        </h3>
                                        <p className={`text-sm ${
                                            activeCategory === cat 
                                                ? 'text-white/80' 
                                                : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                            {info.description}
                                        </p>
                                    </div>
                                    <span className={`text-2xl font-bold ${
                                        activeCategory === cat ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {catSettings.length}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Active Category View */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    {activeCategory !== 'all' && (
                        <div className="mb-6 pb-4 border-b dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-4xl">{categoryInfo[activeCategory]?.icon}</span>
                                <div>
                                    <h2 className="text-2xl font-bold">{categoryInfo[activeCategory]?.label}</h2>
                                    <p className="text-gray-600 dark:text-gray-400">{categoryInfo[activeCategory]?.description}</p>
                                </div>
                            </div>
                        </div>
                    )}

                {/* Settings List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredSettings.length > 0 ? (
                    <div className="space-y-3">
                        {filteredSettings.map(setting => {
                            const value = editedValues[setting.setting_key] || setting.setting_value;
                            const hasChanged = value !== setting.setting_value;
                            const isExpanded = expandedSettings.has(setting.setting_key);
                            return (
                                <div
                                    key={setting.id}
                                    className={`border dark:border-gray-700 rounded-lg overflow-hidden transition-all ${
                                        hasChanged ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300 dark:border-yellow-600' : 'hover:shadow-md'
                                    }`}
                                >
                                    {/* Setting Header */}
                                    <div
                                        onClick={() => toggleExpanded(setting.setting_key)}
                                        className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg leading-tight text-gray-900 dark:text-white">
                                                        {setting.description}
                                                    </h3>
                                                    {hasChanged && (
                                                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded">
                                                            تغییر نیافته
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                    {setting.setting_key}
                                                </p>
                                            </div>
                                            <span className={`text-xl transition-transform ${
                                                isExpanded ? 'rotate-90' : ''
                                            }`}>
                                                ▶️
                                            </span>
                                        </div>
                                    </div>

                                    {/* Setting Details */}
                                    {isExpanded && (
                                        <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/20">
                                            <div className="mb-4">
                                                {renderSettingInput(setting)}
                                            </div>
                                            {setting.updated_at && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    آخرین به‌روزرسانی: {new Date(setting.updated_at).toLocaleDateString('fa-IR')} {' '}
                                                    {new Date(setting.updated_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            🔍 هیچ تنظیماتی یافت نشد
                        </p>
                    </div>
                )}
                </div>

                {/* Footer Info */}
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-5">
                    <div className="flex gap-3 mb-3">
                        <span className="text-2xl">📌</span>
                        <h4 className="font-bold text-blue-900 dark:text-blue-100">راهنمای و قوانین</h4>
                    </div>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 ml-4">
                        <li>✅ تغییرات بلافاصله پس از ذخیره تمام سایت را تحت تاثیر قرار می‌دهد</li>
                        <li>📁 برای نرخ‌ها (مانند کمیسیون):‌ از اعداد اعشاری استفاده کنید (مثال: 0.02 برای 2%)</li>
                        <li>⏰ زمان‌ها: به ساعت یا روز محاسبه می‌شوند</li>
                        <li>💵 مبالغ: به تومان</li>
                        <li>✅ بولی ‌مقادیر: فقط 'true' یا 'false'</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
