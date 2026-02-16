import React, { useState, useEffect } from 'react';
import { Commission, PurchaseOrder, SimCard, User } from '../types';
import * as settingsService from '../services/settings-service';

interface InvoiceProps {
    type: 'purchase' | 'sale' | 'commission';
    data: Commission | PurchaseOrder;
    simCard?: SimCard;
    buyer?: User;
    seller?: User;
    invoiceNumber: string;
    onClose: () => void;
}

const InvoiceNew: React.FC<InvoiceProps> = ({
    type,
    data,
    simCard,
    buyer,
    seller,
    invoiceNumber,
    onClose
}) => {
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
        return date.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const handlePrint = () => {
        window.print();
    };

    // Determine invoice title and details based on type
    const getInvoiceTitle = () => {
        if (type === 'purchase') return 'فاکتور خرید';
        if (type === 'sale') return 'فاکتور فروش نیابتی';
        return 'فاکتور کمیسیون';
    };

    const purchaseOrder = 'sim_card_id' in data ? data : null;
    const commission = 'sale_price' in data ? data : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:block">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none print:max-h-full print:overflow-visible">
                {/* Header - No Print */}
                <div className="flex justify-between items-center p-6 border-b print:hidden">
                    <h2 className="text-2xl font-bold">{getInvoiceTitle()}</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 print:hidden"
                        >
                            🖨️ چاپ
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 print:hidden"
                        >
                            بستن
                        </button>
                    </div>
                </div>

                {/* Invoice Content - Printable */}
                <div className="p-8 print:p-12" dir="rtl">
                    {/* Company Header */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
                        <h1 className="text-3xl font-bold text-blue-600 mb-2">سیم کارت 724</h1>
                        <p className="text-sm text-gray-600">بستر خرید و فروش سیم کارت</p>
                        <p className="text-xs text-gray-500 mt-1">www.simcard724.ir</p>
                    </div>

                    {/* Invoice Info */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <h3 className="font-bold text-lg mb-3 text-gray-700">اطلاعات فاکتور</h3>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b">
                                        <td className="py-2 font-semibold text-gray-600">شماره فاکتور:</td>
                                        <td className="py-2 text-left font-mono">{invoiceNumber}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2 font-semibold text-gray-600">تاریخ صدور:</td>
                                        <td className="py-2 text-left">{formatDate(data.created_at || data.date)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 font-semibold text-gray-600">نوع فاکتور:</td>
                                        <td className="py-2 text-left">{getInvoiceTitle()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {type === 'purchase' && buyer && (
                            <div>
                                <h3 className="font-bold text-lg mb-3 text-gray-700">خریدار</h3>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="py-2 font-semibold text-gray-600">نام:</td>
                                            <td className="py-2 text-left">{buyer.name}</td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 font-semibold text-gray-600">شماره تماس:</td>
                                            <td className="py-2 text-left font-mono">{buyer.phone_number}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 font-semibold text-gray-600">ایمیل:</td>
                                            <td className="py-2 text-left text-xs">{buyer.email}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {type === 'sale' && seller && (
                            <div>
                                <h3 className="font-bold text-lg mb-3 text-gray-700">فروشنده</h3>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="py-2 font-semibold text-gray-600">نام:</td>
                                            <td className="py-2 text-left">{seller.name}</td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 font-semibold text-gray-600">شماره تماس:</td>
                                            <td className="py-2 text-left font-mono">{seller.phone_number}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 font-semibold text-gray-600">ایمیل:</td>
                                            <td className="py-2 text-left text-xs">{seller.email}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="mb-8">
                        <h3 className="font-bold text-lg mb-3 text-gray-700">جزئیات</h3>
                        <table className="w-full border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">ردیف</th>
                                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">شرح</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold">تعداد</th>
                                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">مبلغ واحد (تومان)</th>
                                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">مبلغ کل (تومان)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {type === 'purchase' && purchaseOrder && (
                                    <tr>
                                        <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            <div>خرید سیم‌کارت</div>
                                            <div className="text-xs text-gray-600 font-mono mt-1">شماره: {simCard?.number}</div>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                        <td className="border border-gray-300 px-4 py-3 text-left font-mono">{formatPrice(purchaseOrder.price)}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-left font-mono font-bold">{formatPrice(purchaseOrder.price)}</td>
                                    </tr>
                                )}

                                {type === 'sale' && purchaseOrder && (
                                    <>
                                        <tr>
                                            <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                            <td className="border border-gray-300 px-4 py-3">
                                                <div>فروش سیم‌کارت (نیابتی)</div>
                                                <div className="text-xs text-gray-600 font-mono mt-1">شماره: {simCard?.number}</div>
                                            </td>
                                            <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono">{formatPrice(purchaseOrder.price)}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono">{formatPrice(purchaseOrder.price)}</td>
                                        </tr>
                                        <tr className="bg-red-50">
                                            <td className="border border-gray-300 px-4 py-3 text-center">2</td>
                                            <td className="border border-gray-300 px-4 py-3">
                                                <div className="text-red-600">کمیسیون بستر (کسر شده)</div>
                                                <div className="text-xs text-gray-600 mt-1">کمیسیون سایت سیم کارت 724</div>
                                            </td>
                                            <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono text-red-600">-{formatPrice(purchaseOrder.commission_amount)}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono font-bold text-red-600">-{formatPrice(purchaseOrder.commission_amount)}</td>
                                        </tr>
                                    </>
                                )}

                                {type === 'commission' && commission && (
                                    <>
                                        <tr>
                                            <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                            <td className="border border-gray-300 px-4 py-3">
                                                <div>فروش سیم‌کارت</div>
                                                <div className="text-xs text-gray-600 font-mono mt-1">شماره: {commission.sim_number}</div>
                                            </td>
                                            <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono">{formatPrice(commission.sale_price)}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono">{formatPrice(commission.sale_price)}</td>
                                        </tr>
                                        <tr className="bg-green-50">
                                            <td className="border border-gray-300 px-4 py-3 text-center">2</td>
                                            <td className="border border-gray-300 px-4 py-3">
                                                <div className="text-green-600">کمیسیون بستر</div>
                                                <div className="text-xs text-gray-600 mt-1">درآمد سایت از این معامله</div>
                                            </td>
                                            <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono text-green-600">{formatPrice(commission.commission_amount)}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-left font-mono font-bold text-green-600">{formatPrice(commission.commission_amount)}</td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="flex justify-end mb-8">
                        <div className="w-80">
                            <table className="w-full">
                                <tbody>
                                    {type === 'purchase' && purchaseOrder && (
                                        <>
                                            <tr className="border-b">
                                                <td className="py-2 font-semibold text-gray-600">جمع کل:</td>
                                                <td className="py-2 text-left font-mono">{formatPrice(purchaseOrder.price)} تومان</td>
                                            </tr>
                                            <tr className="bg-blue-50">
                                                <td className="py-3 font-bold text-lg">مبلغ قابل پرداخت:</td>
                                                <td className="py-3 text-left font-mono font-bold text-lg text-blue-600">{formatPrice(purchaseOrder.price)} تومان</td>
                                            </tr>
                                        </>
                                    )}

                                    {type === 'sale' && purchaseOrder && (
                                        <>
                                            <tr className="border-b">
                                                <td className="py-2 font-semibold text-gray-600">مبلغ فروش:</td>
                                                <td className="py-2 text-left font-mono">{formatPrice(purchaseOrder.price)} تومان</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 font-semibold text-red-600">کمیسیون بستر:</td>
                                                <td className="py-2 text-left font-mono text-red-600">-{formatPrice(purchaseOrder.commission_amount)} تومان</td>
                                            </tr>
                                            <tr className="bg-green-50">
                                                <td className="py-3 font-bold text-lg">مبلغ دریافتی شما:</td>
                                                <td className="py-3 text-left font-mono font-bold text-lg text-green-600">{formatPrice(purchaseOrder.seller_received_amount)} تومان</td>
                                            </tr>
                                        </>
                                    )}

                                    {type === 'commission' && commission && (
                                        <>
                                            <tr className="border-b">
                                                <td className="py-2 font-semibold text-gray-600">مبلغ فروش:</td>
                                                <td className="py-2 text-left font-mono">{formatPrice(commission.sale_price)} تومان</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="py-2 font-semibold text-gray-600">پرداخت به فروشنده:</td>
                                                <td className="py-2 text-left font-mono">-{formatPrice(commission.seller_received_amount)} تومان</td>
                                            </tr>
                                            <tr className="bg-green-50">
                                                <td className="py-3 font-bold text-lg">کمیسیون خالص:</td>
                                                <td className="py-3 text-left font-mono font-bold text-lg text-green-600">{formatPrice(commission.commission_amount)} تومان</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notice */}
                    <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 mb-8">
                        <p className="text-sm text-gray-700">
                            <strong>توجه:</strong> این فاکتور صرفاً برای فروش نیابتی از طریق بستر سیم کارت 724 صادر شده است. 
                            سایت سیم کارت 724 تنها واسط معامله بوده و مسئولیتی در قبال کیفیت یا صحت اطلاعات سیم‌کارت ندارد.
                        </p>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t-2 border-gray-300">
                        <div className="text-center">
                            <div className="h-20 border-b-2 border-gray-400 mb-2"></div>
                            <p className="text-sm font-semibold text-gray-600">
                                {type === 'purchase' ? 'امضای خریدار' : type === 'sale' ? 'امضای فروشنده' : 'مهر و امضای مدیر'}
                            </p>
                        </div>
                        <div className="text-center">
                            {companyStampUrl ? (
                                <div className="flex flex-col items-center">
                                    <img 
                                        src={companyStampUrl} 
                                        alt="مهر شرکت" 
                                        className="h-20 w-auto object-contain mb-2"
                                    />
                                    <p className="text-sm font-semibold text-gray-600">مهر و امضای سیم کارت 724</p>
                                </div>
                            ) : (
                                <>
                                    <div className="h-20 border-b-2 border-gray-400 mb-2"></div>
                                    <p className="text-sm font-semibold text-gray-600">مهر و امضای سیم کارت 724</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 pt-6 border-t text-xs text-gray-500">
                        <p>این فاکتور به صورت الکترونیکی صادر شده و فاقد امضا و مهر فیزیکی می‌باشد.</p>
                        <p className="mt-1">برای استعلام صحت فاکتور به سایت www.simcard724.ir مراجعه نمایید.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceNew;
