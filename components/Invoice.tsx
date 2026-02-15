import React, { useRef } from 'react';
import { Commission, PurchaseOrder, SimCard, User } from '../types';
import { useAuth } from '../hooks/useAuth';

interface InvoiceProps {
    type: 'purchase' | 'sale' | 'commission';
    data: Commission | PurchaseOrder;
    simCard?: SimCard;
    buyer?: User;
    seller?: User;
    invoiceNumber?: string;
    onClose?: () => void;
}

const Invoice: React.FC<InvoiceProps> = ({ type, data, simCard, buyer, seller, invoiceNumber, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    // Check permissions
    const canView = () => {
        if (!user) return false;
        if (user.role === 'admin' && type === 'commission') return true;
        if (type === 'purchase' && 'buyer_id' in data && data.buyer_id === user.id) return true;
        if (type === 'sale' && 'seller_id' in data && data.seller_id === user.id) return true;
        return false;
    };

    if (!canView()) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                    <h2 className="text-xl font-bold text-red-600 mb-4">⛔ دسترسی غیرمجاز</h2>
                    <p className="text-gray-700 dark:text-gray-300 mb-6">
                        شما مجاز به مشاهده این فاکتور نیستید.
                    </p>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                        >
                            بستن
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="fa">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>فاکتور - ${invoiceNumber || 'N/A'}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Tahoma', 'Arial', sans-serif;
                        direction: rtl;
                        padding: 20px;
                        background: white;
                    }
                    .invoice-container {
                        max-width: 800px;
                        margin: 0 auto;
                        background: white;
                        border: 2px solid #333;
                        padding: 30px;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px solid #333;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        font-size: 28px;
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .header p {
                        font-size: 14px;
                        color: #666;
                    }
                    .invoice-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 30px;
                        padding: 15px;
                        background: #f5f5f5;
                        border-radius: 8px;
                    }
                    .invoice-info div {
                        flex: 1;
                    }
                    .invoice-info strong {
                        display: block;
                        margin-bottom: 5px;
                        color: #333;
                    }
                    .parties {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .party-box {
                        border: 1px solid #ddd;
                        padding: 15px;
                        border-radius: 8px;
                        background: #fafafa;
                    }
                    .party-box h3 {
                        font-size: 16px;
                        margin-bottom: 10px;
                        color: #333;
                        border-bottom: 2px solid #333;
                        padding-bottom: 5px;
                    }
                    .party-box p {
                        margin: 5px 0;
                        font-size: 14px;
                        color: #555;
                    }
                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    .items-table th,
                    .items-table td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: center;
                    }
                    .items-table th {
                        background: #333;
                        color: white;
                        font-weight: bold;
                    }
                    .items-table tr:nth-child(even) {
                        background: #f9f9f9;
                    }
                    .totals {
                        margin-top: 20px;
                        padding: 20px;
                        background: #f5f5f5;
                        border-radius: 8px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        font-size: 16px;
                    }
                    .total-row.final {
                        border-top: 2px solid #333;
                        margin-top: 10px;
                        padding-top: 15px;
                        font-size: 20px;
                        font-weight: bold;
                        color: #333;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 2px solid #ddd;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                    .signature-section {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 40px;
                        margin-top: 50px;
                        padding-top: 30px;
                        border-top: 1px dashed #ccc;
                    }
                    .signature-box {
                        text-align: center;
                    }
                    .signature-line {
                        border-top: 1px solid #333;
                        margin-top: 60px;
                        padding-top: 10px;
                        font-size: 14px;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('fa-IR');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getInvoiceTitle = () => {
        if (type === 'purchase') return 'فاکتور خرید';
        if (type === 'sale') return 'فاکتور فروش';
        return 'فاکتور کمیسیون';
    };

    const renderCommissionInvoice = (commission: Commission) => (
        <>
            <div className="parties">
                <div className="party-box">
                    <h3>🛒 خریدار</h3>
                    <p><strong>نام:</strong> {commission.buyer_name}</p>
                    <p><strong>شناسه:</strong> {commission.buyer_id}</p>
                </div>
                <div className="party-box">
                    <h3>🏪 فروشنده</h3>
                    <p><strong>نام:</strong> {commission.seller_name}</p>
                    <p><strong>شناسه:</strong> {commission.seller_id}</p>
                </div>
            </div>

            <table className="items-table">
                <thead>
                    <tr>
                        <th>ردیف</th>
                        <th>شرح</th>
                        <th>شماره سیم‌کارت</th>
                        <th>نوع فروش</th>
                        <th>مبلغ (تومان)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>فروش سیم‌کارت</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold' }}>
                            {commission.sim_number}
                        </td>
                        <td>{commission.sale_type === 'auction' ? '🏆 حراجی' : '💰 قیمت ثابت'}</td>
                        <td>{formatPrice(commission.sale_price)}</td>
                    </tr>
                </tbody>
            </table>

            <div className="totals">
                <div className="total-row">
                    <span>مبلغ فروش:</span>
                    <span>{formatPrice(commission.sale_price)} تومان</span>
                </div>
                <div className="total-row">
                    <span>کمیسیون سایت ({commission.commission_percentage}%):</span>
                    <span className="text-red-600">- {formatPrice(commission.commission_amount)} تومان</span>
                </div>
                <div className="total-row final">
                    <span>مبلغ دریافتی فروشنده:</span>
                    <span>{formatPrice(commission.seller_received_amount)} تومان</span>
                </div>
            </div>
        </>
    );

    const renderPurchaseInvoice = (order: PurchaseOrder) => (
        <>
            <div className="parties">
                <div className="party-box">
                    <h3>🛒 خریدار</h3>
                    <p><strong>نام:</strong> {buyer?.name || 'نامشخص'}</p>
                    <p><strong>شناسه:</strong> {order.buyer_id}</p>
                </div>
                <div className="party-box">
                    <h3>🏪 فروشنده</h3>
                    <p><strong>نام:</strong> {seller?.name || 'نامشخص'}</p>
                    <p><strong>شناسه:</strong> {order.seller_id}</p>
                </div>
            </div>

            <table className="items-table">
                <thead>
                    <tr>
                        <th>ردیف</th>
                        <th>شرح</th>
                        <th>شماره سیم‌کارت</th>
                        <th>نوع خط</th>
                        <th>مبلغ (تومان)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>خرید سیم‌کارت</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold' }}>
                            {simCard?.number || 'نامشخص'}
                        </td>
                        <td>{order.line_type === 'active' ? '✅ خط فعال' : '❌ خط غیرفعال'}</td>
                        <td>{formatPrice(order.price)}</td>
                    </tr>
                </tbody>
            </table>

            <div className="totals">
                <div className="total-row">
                    <span>مبلغ خرید:</span>
                    <span>{formatPrice(order.price)} تومان</span>
                </div>
                <div className="total-row">
                    <span>وضعیت:</span>
                    <span>{getStatusLabel(order.status)}</span>
                </div>
                <div className="total-row final">
                    <span>مبلغ قابل پرداخت:</span>
                    <span>{formatPrice(order.price)} تومان</span>
                </div>
            </div>
        </>
    );

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            'pending': '⏳ در انتظار',
            'code_sent': '📥 کد ارسال شده',
            'code_verified': '✅ کد تایید شده',
            'document_pending': '📄 در انتظار مدارک',
            'document_submitted': '📋 مدارک ارسال شده',
            'verified': '✅ تایید شده',
            'completed': '✅ تکمیل شده',
            'cancelled': '❌ لغو شده'
        };
        return statusMap[status] || status;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
                {/* Header with close button */}
                <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {getInvoiceTitle()}
                    </h2>
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <span>🖨️</span>
                            <span>چاپ فاکتور</span>
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                بستن
                            </button>
                        )}
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                    <div ref={printRef}>
                        <div className="invoice-container">
                            {/* Header */}
                            <div className="header">
                                <h1>🏪 سیستم مدیریت سیم‌کارت MSIM724</h1>
                                <p>فاکتور رسمی خرید و فروش سیم‌کارت</p>
                            </div>

                            {/* Invoice Info */}
                            <div className="invoice-info">
                                <div>
                                    <strong>شماره فاکتور:</strong>
                                    <span>{invoiceNumber || `INV-${data.id}`}</span>
                                </div>
                                <div>
                                    <strong>تاریخ صدور:</strong>
                                    <span>{formatDate(data.created_at || new Date().toISOString())}</span>
                                </div>
                                <div>
                                    <strong>نوع فاکتور:</strong>
                                    <span>{getInvoiceTitle()}</span>
                                </div>
                            </div>

                            {/* Render based on type */}
                            {type === 'commission' && 'sale_price' in data && renderCommissionInvoice(data as Commission)}
                            {(type === 'purchase' || type === 'sale') && 'buyer_id' in data && renderPurchaseInvoice(data as PurchaseOrder)}

                            {/* Signature Section */}
                            <div className="signature-section">
                                <div className="signature-box">
                                    <div className="signature-line">
                                        امضای خریدار
                                    </div>
                                </div>
                                <div className="signature-box">
                                    <div className="signature-line">
                                        امضای فروشنده
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="footer">
                                <p>این فاکتور به صورت الکترونیکی صادر شده و دارای اعتبار قانونی می‌باشد.</p>
                                <p style={{ marginTop: '10px' }}>
                                    📞 پشتیبانی: 021-12345678 | 📧 ایمیل: support@msim724.com | 🌐 وب‌سایت: www.msim724.com
                                </p>
                                <p style={{ marginTop: '10px', fontSize: '11px', color: '#999' }}>
                                    تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} - {new Date().toLocaleTimeString('fa-IR')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Invoice;
