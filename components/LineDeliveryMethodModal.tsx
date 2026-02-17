import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import * as settingsService from '../services/settings-service';

interface DeliveryAddress {
    address: string;
    city: string;
    postalCode: string;
    phone: string;
}

interface LineDeliveryMethodModalProps {
    isOpen: boolean;
    simNumber: string;
    isInactiveLine: boolean;
    onSelect: (method: 'activation_code' | 'physical_card', address?: DeliveryAddress) => Promise<void>;
    onClose: () => void;
    isLoading?: boolean;
}

const LineDeliveryMethodModal: React.FC<LineDeliveryMethodModalProps> = ({
    isOpen,
    simNumber,
    isInactiveLine,
    onSelect,
    onClose,
    isLoading = false
}) => {
    const { showNotification } = useNotification();
    const [selectedMethod, setSelectedMethod] = useState<'activation_code' | 'physical_card' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [buyerCanReceiveCode, setBuyerCanReceiveCode] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [address, setAddress] = useState<DeliveryAddress>({
        address: '',
        city: '',
        postalCode: '',
        phone: ''
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoadingSettings(true);
            const setting = await settingsService.getSetting('buyer_can_receive_activation_code');
            setBuyerCanReceiveCode(setting === 'true');
        } catch (error) {
            console.error('Error loading settings:', error);
            setBuyerCanReceiveCode(false);
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleMethodClick = (method: 'activation_code' | 'physical_card') => {
        if (isProcessing) return;
        
        // Check if buyer can receive activation code
        if (method === 'activation_code' && !buyerCanReceiveCode) {
            showNotification('دریافت کد فعال‌سازی در حال حاضر غیرفعال است', 'error');
            return;
        }
        
        setSelectedMethod(method);
        
        if (method === 'physical_card') {
            setShowAddressForm(true);
        } else {
            handleConfirm(method);
        }
    };

    const handleConfirm = async (method: 'activation_code' | 'physical_card', deliveryAddress?: DeliveryAddress) => {
        setIsProcessing(true);
        try {
            await onSelect(method, deliveryAddress);
            setSelectedMethod(null);
            setShowAddressForm(false);
            setAddress({ address: '', city: '', postalCode: '', phone: '' });
        } catch (error) {
            showNotification(
                error instanceof Error ? error.message : 'خطایی در انتخاب روش تحویل رخ داد',
                'error'
            );
            setSelectedMethod(null);
            setShowAddressForm(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddressSubmit = () => {
        // Validation
        if (!address.address.trim()) {
            showNotification('لطفاً آدرس را وارد کنید', 'error');
            return;
        }
        if (!address.city.trim()) {
            showNotification('لطفاً شهر را وارد کنید', 'error');
            return;
        }
        if (!address.postalCode.trim() || address.postalCode.length !== 10) {
            showNotification('لطفاً کد پستی 10 رقمی را وارد کنید', 'error');
            return;
        }
        if (!address.phone.trim() || address.phone.length !== 11) {
            showNotification('لطفاً شماره تماس 11 رقمی را وارد کنید', 'error');
            return;
        }

        handleConfirm('physical_card', address);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {!showAddressForm ? (
                    <>
                        <h2 className="text-2xl font-bold mb-2 text-center">انتخاب روش تحویل</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            سیمکارت {simNumber} را چگونه می‌خواهید تحویل بگیرید؟
                        </p>

                        {loadingSettings ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Activation Code Option - Only show if enabled */}
                            {buyerCanReceiveCode && (
                            <div
                                onClick={() => handleMethodClick('activation_code')}
                                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedMethod === 'activation_code'
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-600 text-white">
                                            📝
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold mb-2">دریافت کد فعال‌سازی</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            فروشنده کد فعال‌سازی را برای شما ارسال می‌کند.
                                        </p>
                                        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                                            <li>✓ سریع‌تر</li>
                                            <li>✓ بدون ارسال</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* Physical Card Option */}
                            <div
                                onClick={() => handleMethodClick('physical_card')}
                                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedMethod === 'physical_card'
                                        ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${!buyerCanReceiveCode ? 'md:col-span-2' : ''}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-green-600 text-white">
                                            📦
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold mb-2">دریافت خود سیمکارت</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            سیم‌کارت فیزیکی برای شما ارسال می‌شود.
                                        </p>
                                        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                                            <li>✓ دریافت سیمکارت</li>
                                            <li>✓ تایید ادمین</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!buyerCanReceiveCode && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-4 mb-6">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    ℹ️ در حال حاضر فقط روش تحویل فیزیکی فعال است.
                                </p>
                            </div>
                        )}

                        {isInactiveLine && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 rounded-lg p-4 mb-6">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    ⚠️ این یک خط صفر است. پس از انتخاب روش تحویل، فروشنده باید اقدامات لازم را انجام دهد.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={onClose}
                                disabled={isProcessing || isLoading}
                                className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50"
                            >
                                انصراف
                            </button>
                        </div>
                        </>
                        )}
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold mb-2 text-center">اطلاعات آدرس تحویل</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            لطفاً آدرس کامل برای ارسال سیمکارت را وارد کنید
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block mb-2 font-medium">آدرس کامل</label>
                                <textarea
                                    value={address.address}
                                    onChange={(e) => setAddress(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    rows={3}
                                    placeholder="آدرس کامل خود را وارد کنید..."
                                    disabled={isProcessing}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 font-medium">شهر</label>
                                    <input
                                        type="text"
                                        value={address.city}
                                        onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="نام شهر"
                                        disabled={isProcessing}
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium">کد پستی (10 رقمی)</label>
                                    <input
                                        type="text"
                                        value={address.postalCode}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            if (value.length <= 10) {
                                                setAddress(prev => ({ ...prev, postalCode: value }));
                                            }
                                        }}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="1234567890"
                                        maxLength={10}
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 font-medium">شماره تماس (11 رقمی)</label>
                                <input
                                    type="text"
                                    value={address.phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        if (value.length <= 11) {
                                            setAddress(prev => ({ ...prev, phone: value }));
                                        }
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="09123456789"
                                    maxLength={11}
                                    disabled={isProcessing}
                                />
                            </div>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    setShowAddressForm(false);
                                    setSelectedMethod(null);
                                }}
                                disabled={isProcessing}
                                className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50"
                            >
                                بازگشت
                            </button>
                            <button
                                onClick={handleAddressSubmit}
                                disabled={isProcessing}
                                className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'در حال پردازش...' : 'تایید و ادامه'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LineDeliveryMethodModal;
