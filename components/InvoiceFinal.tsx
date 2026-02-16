import React, { useState, useEffect } from 'react';
import { PurchaseOrder } from '../types';
import * as settingsService from '../services/settings-service';

interface InvoiceFinalProps {
    order: PurchaseOrder;
    type: 'purchase' | 'sale';
    onClose: () => void;
}

const InvoiceFinal: React.FC<InvoiceFinalProps> = ({ order, type, onClose }) => {
    const [companyStampUrl, setCompanyStampUrl] = useState<string>('');
    
    useEffect(() => {
        const loadStamp = async () => {
            const url = await settingsService.getCompanyStampUrl();
            setCompanyStampUrl(url);
        };
        loadStamp();
    }, []);
    
    const formatPrice = (price: number) => price.toLocaleString('fa-IR');
    
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fa-IR');
    };

    const getStatusText = (status: string) => {
        const statuses: Record<string, string> = {
            'pending': 'در انتظار پردازش',
            'code_sent': 'کد فعالسازی ارسال شده',
            'code_verified': 'کد تایید شده',
            'document_pending': 'در انتظار مدارک',
            'document_submitted': 'مدارک ارسال شده',
            'verified': 'تایید شده',
            'completed': 'تکمیل شده',
            'cancelled': 'لغو شده'
        };
        return statuses[status] || status;
    };

    const isCompleted = order.status === 'completed';
    const invoiceTitle = isCompleted 
        ? (type === 'purchase' ? 'فاکتور خرید' : 'فاکتور فروش')
        : (type === 'purchase' ? 'پیش‌فاکتور خرید' : 'پیش‌فاکتور فروش');

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:block">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none print:max-h-full print:overflow-visible">
                {/* Header - No Print */}
                <div className="flex justify-between items-center p-4 border-b print:hidden bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">{invoiceTitle}</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm print:hidden"
                        >
                            🖨️ چاپ
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 text-sm print:hidden"
                        >
                            بستن
                        </button>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-8 print:p-12 text-gray-900" dir="rtl">
                    {/* Header */}
                    <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            {isCompleted ? 'فاکتور رسمی' : 'پیش‌فاکتور'}
                        </h1>
                        <h2 className="text-xl font-bold text-blue-600">سیم کارت 724</h2>
                        <p className="text-sm text-gray-700">بستر خرید و فروش سیم کارت</p>
                        <p className="text-xs text-gray-600 mt-1">www.simcard724.ir</p>
                    </div>

                    {/* Invoice Info Table */}
                    <div className="mb-6">
                        <table className="w-full border-collapse border border-gray-800 text-sm">
                            <tbody>
                                <tr>
                                    <td className="border border-gray-800 px-3 py-2 font-semibold bg-gray-100 w-1/4">شماره فاکتور</td>
                                    <td className="border border-gray-800 px-3 py-2">{order.id}</td>
                                    <td className="border border-gray-800 px-3 py-2 font-semibold bg-gray-100 w-1/4">تاریخ صدور</td>
                                    <td className="border border-gray-800 px-3 py-2">{formatDate(order.created_at)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-800 px-3 py-2 font-semibold bg-gray-100">نوع معامله</td>
                                    <td className="border border-gray-800 px-3 py-2">{type === 'purchase' ? 'خرید' : 'فروش نیابتی'}</td>
                                    <td className="border border-gray-800 px-3 py-2 font-semibold bg-gray-100">وضعیت</td>
                                    <td className="border border-gray-800 px-3 py-2">{getStatusText(order.status)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Items Table */}
                    <div className="mb-6">
                        <h3 className="font-bold mb-2 text-gray-900">جزئیات معامله</h3>
                        <table className="w-full border-collapse border border-gray-800 text-sm">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border border-gray-800 px-3 py-2 text-center w-12">ردیف</th>
                                    <th className="border border-gray-800 px-3 py-2 text-right">شرح کالا/خدمات</th>
                                    <th className="border border-gray-800 px-3 py-2 text-center w-20">تعداد</th>
                                    <th className="border border-gray-800 px-3 py-2 text-left w-32">مبلغ واحد (تومان)</th>
                                    <th className="border border-gray-800 px-3 py-2 text-left w-32">مبلغ کل (تومان)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-800 px-3 py-2 text-center">1</td>
                                    <td className="border border-gray-800 px-3 py-2">
                                        <div className="font-semibold">سیم‌کارت</div>
                                        <div className="text-xs text-gray-700 font-mono mt-1">شماره: {(order as any).sim_number || order.sim_card_id}</div>
                                    </td>
                                    <td className="border border-gray-800 px-3 py-2 text-center">1</td>
                                    <td className="border border-gray-800 px-3 py-2 text-left font-mono">{formatPrice(order.price)}</td>
                                    <td className="border border-gray-800 px-3 py-2 text-left font-mono font-bold">{formatPrice(order.price)}</td>
                                </tr>
                                
                                {type === 'sale' && (
                                    <tr className="bg-red-50">
                                        <td className="border border-gray-800 px-3 py-2 text-center">2</td>
                                        <td className="border border-gray-800 px-3 py-2">
                                            <div className="font-semibold text-red-700">کمیسیون بستر (کسر شده)</div>
                                            <div className="text-xs text-gray-700 mt-1">کمیسیون سایت سیم کارت 724</div>
                                        </td>
                                        <td className="border border-gray-800 px-3 py-2 text-center">1</td>
                                        <td className="border border-gray-800 px-3 py-2 text-left font-mono text-red-700">-{formatPrice(order.commission_amount)}</td>
                                        <td className="border border-gray-800 px-3 py-2 text-left font-mono font-bold text-red-700">-{formatPrice(order.commission_amount)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="mb-6">
                        <table className="w-full border-collapse border border-gray-800 text-sm">
                            <tbody>
                                {type === 'purchase' ? (
                                    <>
                                        <tr>
                                            <td className="border border-gray-800 px-3 py-2 font-semibold bg-gray-100 text-right">جمع کل</td>
                                            <td className="border border-gray-800 px-3 py-2 text-left font-mono">{formatPrice(order.price)} تومان</td>
                                        </tr>
                                        <tr className="bg-blue-50">
                                            <td className="border border-gray-800 px-3 py-3 font-bold text-lg text-right">مبلغ قابل پرداخت</td>
                                            <td className="border border-gray-800 px-3 py-3 text-left font-mono font-bold text-lg text-blue-700">{formatPrice(order.price)} تومان</td>
                                        </tr>
                                    </>
                                ) : (
                                    <>
                                        <tr>
                                            <td className="border border-gray-800 px-3 py-2 font-semibold bg-gray-100 text-right">مبلغ فروش</td>
                                            <td className="border border-gray-800 px-3 py-2 text-left font-mono">{formatPrice(order.price)} تومان</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-800 px-3 py-2 font-semibold bg-gray-100 text-right">کمیسیون بستر</td>
                                            <td className="border border-gray-800 px-3 py-2 text-left font-mono text-red-700">-{formatPrice(order.commission_amount)} تومان</td>
                                        </tr>
                                        <tr className="bg-green-50">
                                            <td className="border border-gray-800 px-3 py-3 font-bold text-lg text-right">مبلغ دریافتی شما</td>
                                            <td className="border border-gray-800 px-3 py-3 text-left font-mono font-bold text-lg text-green-700">{formatPrice(order.seller_received_amount)} تومان</td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Notice */}
                    <div className="bg-yellow-50 border-r-4 border-yellow-500 p-3 mb-6 text-xs text-gray-800">
                        <p className="font-semibold mb-1">⚠️ توجه مهم:</p>
                        <p>این فاکتور برای فروش نیابتی از طریق بستر سیم کارت 724 صادر شده است. سایت سیم کارت 724 صرفاً واسط معامله بوده و مسئولیتی در قبال کیفیت یا صحت اطلاعات سیم‌کارت ندارد. این سند صرفاً جهت ارائه به مراجع مالیاتی قابل استفاده است.</p>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t-2 border-gray-800">
                        <div className="text-center">
                            <div className="h-16 border-b-2 border-gray-800 mb-2"></div>
                            <p className="text-sm font-semibold text-gray-800">
                                {type === 'purchase' ? 'امضای خریدار' : 'امضای فروشنده'}
                            </p>
                        </div>
                        <div className="text-center">
                            {companyStampUrl ? (
                                <div className="flex flex-col items-center">
                                    <img 
                                        src={companyStampUrl} 
                                        alt="مهر شرکت" 
                                        className="h-16 w-auto object-contain mb-2"
                                    />
                                    <p className="text-sm font-semibold text-gray-800">مهر و امضای سیم کارت 724</p>
                                </div>
                            ) : (
                                <>
                                    <div className="h-16 border-b-2 border-gray-800 mb-2"></div>
                                    <p className="text-sm font-semibold text-gray-800">مهر و امضای سیم کارت 724</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 pt-4 border-t text-xs text-gray-600">
                        <p>این فاکتور به صورت الکترونیکی صادر شده است.</p>
                        <p className="mt-1">برای استعلام: www.simcard724.ir | تلفن پشتیبانی: 021-12345678</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceFinal;
