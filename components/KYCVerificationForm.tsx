import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../services/supabase';
import { KYCVerification } from '../types';
import PersianDatePicker from './PersianDatePicker';

interface KYCVerificationFormProps {
    onComplete?: () => void;
}

const KYCVerificationForm: React.FC<KYCVerificationFormProps> = ({ onComplete }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [existingKYC, setExistingKYC] = useState<KYCVerification | null>(null);
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

    const [formData, setFormData] = useState({
        full_name: '',
        national_code: '',
        birth_date: '',
        phone_number: user?.phoneNumber || '',
        address: '',
        city: '',
        postal_code: '',
        national_card_front_url: '',
        national_card_back_url: '',
        selfie_with_card_url: ''
    });

    useEffect(() => {
        loadExistingKYC();
    }, [user]);

    const loadExistingKYC = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('kyc_verifications')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setExistingKYC(data);
                setFormData({
                    full_name: data.full_name || '',
                    national_code: data.national_code || '',
                    birth_date: data.birth_date || '',
                    phone_number: data.phone_number || user?.phoneNumber || '',
                    address: data.address || '',
                    city: data.city || '',
                    postal_code: data.postal_code || '',
                    national_card_front_url: data.national_card_front_url || '',
                    national_card_back_url: data.national_card_back_url || '',
                    selfie_with_card_url: data.selfie_with_card_url || ''
                });
            }
        } catch (error) {
            console.error('Error loading KYC:', error);
        }
    };

    const handleFileUpload = async (file: File, fieldName: string) => {
        if (!user) return;

        try {
            setUploading(prev => ({ ...prev, [fieldName]: true }));

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${fieldName}_${Date.now()}.${fileExt}`;

            const { error: uploadError, data } = await supabase.storage
                .from('kyc-documents')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('kyc-documents')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
            showNotification('فایل با موفقیت آپلود شد', 'success');
        } catch (error: any) {
            // تبدیل خطاهای آپلود به فارسی
            let errorMessage = 'خطا در آپلود فایل';
            
            if (error.message) {
                const msg = error.message.toLowerCase();
                
                if (msg.includes('size') || msg.includes('large')) {
                    errorMessage = 'حجم فایل بیش از حد مجاز است. حداکثر ۵ مگابایت.';
                } else if (msg.includes('type') || msg.includes('format')) {
                    errorMessage = 'فرمت فایل پشتیبانی نمی‌شود. فقط تصاویر مجاز هستند.';
                } else if (msg.includes('permission') || msg.includes('policy')) {
                    errorMessage = 'خطای دسترسی. لطفاً دوباره وارد شوید.';
                } else if (msg.includes('network') || msg.includes('fetch')) {
                    errorMessage = 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
                } else {
                    errorMessage = `خطا در آپلود فایل: ${error.message}`;
                }
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            setUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validation - همه فیلدها الزامی هستند
        if (!formData.full_name || !formData.national_code || !formData.phone_number || 
            !formData.birth_date || !formData.city || !formData.address || !formData.postal_code) {
            showNotification('لطفا تمام فیلدها را پر کنید', 'error');
            return;
        }

        if (!formData.national_card_front_url || !formData.national_card_back_url) {
            showNotification('لطفا تصاویر کارت ملی را آپلود کنید', 'error');
            return;
        }

        try {
            setLoading(true);

            const kycData = {
                user_id: user.id,
                ...formData,
                status: 'pending',
                submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (existingKYC) {
                // Update existing
                const { error } = await supabase
                    .from('kyc_verifications')
                    .update(kycData)
                    .eq('user_id', user.id);

                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('kyc_verifications')
                    .insert(kycData);

                if (error) throw error;
            }

            // Update user's kyc_submitted_at
            await supabase
                .from('users')
                .update({ kyc_submitted_at: new Date().toISOString() })
                .eq('id', user.id);

            showNotification('درخواست احراز هویت شما با موفقیت ثبت شد و در انتظار بررسی است', 'success');
            
            if (onComplete) {
                onComplete();
            }
        } catch (error: any) {
            // تبدیل خطاهای دیتابیس به فارسی
            let errorMessage = 'خطا در ثبت درخواست';
            
            if (error.message) {
                const msg = error.message.toLowerCase();
                
                // خطای کد ملی تکراری
                if (msg.includes('duplicate') && msg.includes('national_code')) {
                    errorMessage = 'این کد ملی قبلاً ثبت شده است. لطفاً با پشتیبانی تماس بگیرید.';
                }
                // خطای user_id تکراری
                else if (msg.includes('duplicate') && msg.includes('user_id')) {
                    errorMessage = 'شما قبلاً درخواست احراز هویت ثبت کرده‌اید. لطفاً صفحه را رفرش کنید.';
                }
                // خطای فیلد خالی
                else if (msg.includes('null value') || msg.includes('not-null')) {
                    errorMessage = 'لطفاً تمام فیلدهای الزامی را پر کنید.';
                }
                // خطای فرمت کد ملی
                else if (msg.includes('check constraint') && msg.includes('national_code')) {
                    errorMessage = 'کد ملی باید ۱۰ رقم باشد.';
                }
                // خطای دسترسی
                else if (msg.includes('permission') || msg.includes('policy')) {
                    errorMessage = 'خطای دسترسی. لطفاً دوباره وارد شوید.';
                }
                // خطای اتصال به اینترنت
                else if (msg.includes('network') || msg.includes('fetch')) {
                    errorMessage = 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
                }
                // خطای آپلود فایل
                else if (msg.includes('storage') || msg.includes('upload')) {
                    errorMessage = 'خطا در آپلود فایل. لطفاً دوباره تلاش کنید.';
                }
                // سایر خطاها
                else {
                    errorMessage = `خطا در ثبت درخواست: ${error.message}`;
                }
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (existingKYC && existingKYC.status === 'approved') {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-6 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                    احراز هویت شما تایید شده است
                </h3>
                <p className="text-green-700 dark:text-green-300">
                    شما می‌توانید از تمام امکانات سایت استفاده کنید
                </p>
            </div>
        );
    }

    if (existingKYC && existingKYC.status === 'pending') {
        return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-6">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">⏳</div>
                    <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                        درخواست شما در حال بررسی است
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300">
                        لطفا منتظر بمانید تا ادمین درخواست شما را بررسی کند
                    </p>
                </div>
                <button
                    onClick={loadExistingKYC}
                    className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700"
                >
                    بروزرسانی وضعیت
                </button>
            </div>
        );
    }

    if (existingKYC && existingKYC.status === 'rejected') {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                    <div className="text-6xl mb-4">❌</div>
                    <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                        درخواست شما رد شد
                    </h3>
                    {existingKYC.rejection_reason && (
                        <p className="text-red-700 dark:text-red-300 mb-4">
                            دلیل: {existingKYC.rejection_reason}
                        </p>
                    )}
                    <p className="text-sm text-red-600 dark:text-red-400">
                        لطفا اطلاعات خود را اصلاح کرده و مجددا ارسال کنید
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">🔐 احراز هویت</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    برای استفاده از امکانات سایت، لطفا اطلاعات خود را تکمیل کنید
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* نام کامل */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        نام و نام خانوادگی <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        required
                    />
                </div>

                {/* کد ملی */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        کد ملی <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.national_code}
                        onChange={(e) => setFormData({ ...formData, national_code: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        required
                    />
                </div>

                {/* تاریخ تولد */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        تاریخ تولد <span className="text-red-500">*</span>
                    </label>
                    <PersianDatePicker
                        value={formData.birth_date}
                        onChange={(date) => setFormData({ ...formData, birth_date: date })}
                        placeholder="تاریخ تولد خود را انتخاب کنید"
                        maxDate={new Date()}
                    />
                </div>

                {/* شماره تماس */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        شماره تماس <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        required
                    />
                </div>

                {/* شهر */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        شهر <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        required
                    />
                </div>

                {/* آدرس */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        آدرس کامل <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        rows={3}
                        required
                    />
                </div>

                {/* کد پستی */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        کد پستی <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        maxLength={10}
                        required
                    />
                </div>

                {/* عکس روی کارت ملی */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        عکس روی کارت ملی <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'national_card_front_url');
                        }}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        required={!formData.national_card_front_url}
                    />
                    {uploading.national_card_front_url && <p className="text-sm text-blue-600 mt-1">در حال آپلود...</p>}
                    {formData.national_card_front_url && (
                        <img src={formData.national_card_front_url} alt="Front" className="mt-2 h-32 rounded" />
                    )}
                </div>

                {/* عکس پشت کارت ملی */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        عکس پشت کارت ملی <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'national_card_back_url');
                        }}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        required={!formData.national_card_back_url}
                    />
                    {uploading.national_card_back_url && <p className="text-sm text-blue-600 mt-1">در حال آپلود...</p>}
                    {formData.national_card_back_url && (
                        <img src={formData.national_card_back_url} alt="Back" className="mt-2 h-32 rounded" />
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold"
                >
                    {loading ? 'در حال ارسال...' : 'ارسال درخواست احراز هویت'}
                </button>
            </form>
        </div>
    );
};

export default KYCVerificationForm;
