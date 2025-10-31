import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface LineDeliveryMethodModalProps {
    isOpen: boolean;
    simNumber: string;
    isInactiveLine: boolean;
    onSelect: (method: 'activation_code' | 'physical_card') => Promise<void>;
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

    const handleSelect = async (method: 'activation_code' | 'physical_card') => {
        setSelectedMethod(method);
        setIsProcessing(true);
        try {
            await onSelect(method);
            setSelectedMethod(null);
        } catch (error) {
            showNotification(
                error instanceof Error ? error.message : 'خطایی در انتخاب روش تحویل رخ داد',
                'error'
            );
            setSelectedMethod(null);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-2 text-center">انتخاب روش تحویل</h2>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                    سیمکارت {simNumber} را چگونه می‌خواهید تحویل بگیرید؟
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Activation Code Option */}
                    <div
                        onClick={() => !isProcessing && handleSelect('activation_code')}
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
                                    فروشنده کد فعال‌سازی را برای شما ارسال می‌کند و سیستم تایید می‌کند.
                                </p>
                                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                                    <li>✓ سریع‌تر</li>
                                    <li>✓ هزینه کمتر</li>
                                    <li>✓ بدون ارسال</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Physical Card Option */}
                    <div
                        onClick={() => !isProcessing && handleSelect('physical_card')}
                        className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedMethod === 'physical_card'
                                ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                                : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                    سیم‌کارت فیزیکی برای شما ارسال و فروشنده مدارک را ثبت می‌کند.
                                </p>
                                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                                    <li>✓ دریافت سیمکارت</li>
                                    <li>✓ تایید ادمین</li>
                                    <li>✓ امن‌تر</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {isInactiveLine && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 rounded-lg p-4 mb-6">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ این یک خط صفر است. پس از انتخاب روش تحویل، فروشنده باید کد فعال‌سازی را ارسال کند.
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
            </div>
        </div>
    );
};

export default LineDeliveryMethodModal;
