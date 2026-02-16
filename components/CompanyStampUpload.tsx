import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNotification } from '../contexts/NotificationContext';
import * as settingsService from '../services/settings-service';

const CompanyStampUpload: React.FC = () => {
    const { showNotification } = useNotification();
    const [stampUrl, setStampUrl] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStampUrl();
    }, []);

    const loadStampUrl = async () => {
        try {
            const url = await settingsService.getCompanyStampUrl();
            setStampUrl(url);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('لطفاً یک فایل تصویری انتخاب کنید', 'error');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showNotification('حجم فایل نباید بیشتر از 2 مگابایت باشد', 'error');
            return;
        }

        try {
            setUploading(true);

            // Delete old stamp if exists
            if (stampUrl) {
                const oldPath = stampUrl.split('/').pop();
                if (oldPath) {
                    await supabase.storage
                        .from('company-assets')
                        .remove([`stamps/${oldPath}`]);
                }
            }

            // Upload new stamp
            const fileExt = file.name.split('.').pop();
            const fileName = `company-stamp-${Date.now()}.${fileExt}`;
            const filePath = `stamps/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('company-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('company-assets')
                .getPublicUrl(filePath);

            // Save URL to settings
            const { error: settingsError } = await supabase
                .from('site_settings')
                .update({
                    setting_value: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('setting_key', 'company_stamp_url');

            if (settingsError) throw settingsError;

            // Clear cache and reload
            settingsService.clearSettingsCache();
            setStampUrl(publicUrl);
            showNotification('مهر شرکت با موفقیت آپلود شد', 'success');
        } catch (error) {
            showNotification('خطا در آپلود مهر شرکت', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('آیا مطمئن هستید که می‌خواهید مهر شرکت را حذف کنید؟')) {
            return;
        }

        try {
            setUploading(true);

            // Delete file from storage
            if (stampUrl) {
                const oldPath = stampUrl.split('/').pop();
                if (oldPath) {
                    await supabase.storage
                        .from('company-assets')
                        .remove([`stamps/${oldPath}`]);
                }
            }

            // Clear URL from settings
            const { error } = await supabase
                .from('site_settings')
                .update({
                    setting_value: '',
                    updated_at: new Date().toISOString()
                })
                .eq('setting_key', 'company_stamp_url');

            if (error) throw error;

            // Clear cache and reload
            settingsService.clearSettingsCache();
            setStampUrl('');
            showNotification('مهر شرکت با موفقیت حذف شد', 'success');
        } catch (error) {
            showNotification('خطا در حذف مهر شرکت', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-4">در حال بارگذاری...</div>;
    }

    return (
        <div className="space-y-4">
            {stampUrl ? (
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <img
                            src={stampUrl}
                            alt="مهر شرکت"
                            className="w-32 h-32 object-contain border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white p-2"
                        />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            مهر فعلی شرکت
                        </p>
                        <div className="flex gap-2">
                            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm">
                                {uploading ? '⏳ در حال آپلود...' : '🔄 تغییر مهر'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>
                            <button
                                onClick={handleDelete}
                                disabled={uploading}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm disabled:bg-gray-400"
                            >
                                🗑️ حذف مهر
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <div className="mb-4">
                        <span className="text-6xl">🖼️</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        هنوز مهری آپلود نشده است
                    </p>
                    <label className="cursor-pointer inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors">
                        {uploading ? '⏳ در حال آپلود...' : '📤 آپلود مهر شرکت'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        فرمت‌های مجاز: JPG, PNG, GIF | حداکثر حجم: 2MB
                    </p>
                </div>
            )}
        </div>
    );
};

export default CompanyStampUpload;
