import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { getPendingPaymentReceipts, processPaymentReceipt } from '../services/paymentService';
import { PaymentReceipt } from '../types';

const AdminPaymentReceipts: React.FC = () => {
  const { user } = useAuth();
  const { fetchData } = useData();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const pendingReceipts = await getPendingPaymentReceipts();
        setReceipts(pendingReceipts);
      } catch (error) {
        console.error('Error fetching payment receipts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchReceipts();
    }
  }, [user]);

  const handleProcessReceipt = async (receiptId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    
    setProcessing(receiptId);
    try {
      await processPaymentReceipt(receiptId, status, user.id);
      // Refresh the list
      const updatedReceipts = receipts.filter(receipt => receipt.id !== receiptId);
      setReceipts(updatedReceipts);
      // Refresh data context to update user balances if approved
      if (status === 'approved') {
        await fetchData();
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('خطا در پردازش رسید پرداخت.');
    } finally {
      setProcessing(null);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="text-center py-20">دسترسی محدود شده است.</div>;
  }

  if (loading) {
    return <div className="text-center py-20">در حال بارگذاری...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">رسیدهای پرداخت در انتظار تأیید</h2>
      
      {receipts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">رسید پرداخت در انتظار تأیید وجود ندارد.</div>
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
                <th className="p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(receipt => (
                <tr key={receipt.id} className="border-b dark:border-gray-700">
                  <td className="p-3">{receipt.user_name}</td>
                  <td className="p-3">{receipt.amount.toLocaleString('fa-IR')} تومان</td>
                  <td className="p-3" style={{ direction: 'ltr' }}>{receipt.card_number}</td>
                  <td className="p-3">{receipt.tracking_code}</td>
                  <td className="p-3">{new Date(receipt.created_at).toLocaleDateString('fa-IR')}</td>
                  <td className="p-3">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleProcessReceipt(receipt.id, 'approved')}
                        disabled={processing === receipt.id}
                        className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {processing === receipt.id ? 'در حال پردازش...' : 'تأیید'}
                      </button>
                      <button
                        onClick={() => handleProcessReceipt(receipt.id, 'rejected')}
                        disabled={processing === receipt.id}
                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                      >
                        {processing === receipt.id ? 'در حال پردازش...' : 'رد'}
                      </button>
                      <a
                        href={receipt.receipt_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                      >
                        مشاهده رسید
                      </a>
                    </div>
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