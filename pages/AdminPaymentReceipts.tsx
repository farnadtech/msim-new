import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useNotification } from '../contexts/NotificationContext';
import api, { PaymentReceipt } from '../services/api-supabase';

const AdminPaymentReceipts: React.FC = () => {
  const { users } = useData();
  const { showNotification } = useNotification();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        // In a real implementation, you would fetch receipts from the database
        // For now, we'll simulate with mock data
        const mockReceipts: PaymentReceipt[] = [
          {
            id: '1',
            user_id: 'user1',
            user_name: 'احمد محمدی',
            amount: 50000,
            card_number: '6037991234567890',
            tracking_code: 'TRK123456789',
            receipt_image_url: 'https://example.com/receipt1.jpg',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            user_id: 'user2',
            user_name: 'مریم رضوی',
            amount: 100000,
            card_number: '6104331234567890',
            tracking_code: 'TRK987654321',
            receipt_image_url: 'https://example.com/receipt2.jpg',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setReceipts(mockReceipts);
      } catch (error) {
        showNotification('خطا در دریافت لیست رسیدها.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [showNotification]);

  const handleApprove = async (receiptId: string) => {
    setProcessing(true);
    try {
      // In a real implementation, you would:
      // 1. Update the receipt status to 'approved'
      // 2. Update the user's wallet balance
      // 3. Add a transaction record
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId ? {...receipt, status: 'approved'} : receipt
      ));
      
      showNotification('رسید با موفقیت تایید شد.', 'success');
    } catch (error) {
      showNotification('خطا در تایید رسید.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (receiptId: string) => {
    setProcessing(true);
    try {
      // In a real implementation, you would:
      // 1. Update the receipt status to 'rejected'
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId ? {...receipt, status: 'rejected'} : receipt
      ));
      
      showNotification('رسید با موفقیت رد شد.', 'success');
    } catch (error) {
      showNotification('خطا در رد رسید.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20">در حال بارگذاری...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">مدیریت رسیدهای پرداخت کارت به کارت</h2>
      
      {receipts.length === 0 ? (
        <p className="text-gray-500 text-center py-10">هیچ رسید پرداختی یافت نشد.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-3">کاربر</th>
                <th className="p-3">مبلغ</th>
                <th className="p-3">شماره کارت</th>
                <th className="p-3">کد پیگیری</th>
                <th className="p-3">تاریخ</th>
                <th className="p-3">وضعیت</th>
                <th className="p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(receipt => (
                <tr key={receipt.id} className="border-b dark:border-gray-700">
                  <td className="p-3">{receipt.user_name}</td>
                  <td className="p-3">{receipt.amount.toLocaleString('fa-IR')} تومان</td>
                  <td className="p-3" style={{ direction: 'ltr' }}>{receipt.card_number}</td>
                  <td className="p-3" style={{ direction: 'ltr' }}>{receipt.tracking_code}</td>
                  <td className="p-3">{new Date(receipt.created_at).toLocaleDateString('fa-IR')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      receipt.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                      receipt.status === 'approved' ? 'bg-green-200 text-green-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {receipt.status === 'pending' ? 'در انتظار' :
                       receipt.status === 'approved' ? 'تایید شده' :
                       'رد شده'}
                    </span>
                  </td>
                  <td className="p-3">
                    {receipt.status === 'pending' && (
                      <div className="flex space-x-2 space-x-reverse">
                        <button 
                          onClick={() => handleApprove(receipt.id)}
                          disabled={processing}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400"
                        >
                          تایید
                        </button>
                        <button 
                          onClick={() => handleReject(receipt.id)}
                          disabled={processing}
                          className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm disabled:bg-gray-400"
                        >
                          رد
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentReceipts;