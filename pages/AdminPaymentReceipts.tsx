import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useNotification } from '../contexts/NotificationContext';
import api, { PaymentReceipt } from '../services/api-supabase';
import paymentService from '../services/paymentService-supabase';
import { supabase } from '../services/supabase';

const AdminPaymentReceipts: React.FC = () => {
  const { users } = useData();
  const { showNotification } = useNotification();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const fetchedReceipts = await api.getAllPaymentReceipts();
        setReceipts(fetchedReceipts);
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
      // Get the receipt to get user info and amount
      const receipt = receipts.find(r => r.id === receiptId);
      if (!receipt) {
        throw new Error('رسید یافت نشد');
      }
      
      // Update the receipt status to 'approved'
      console.log('Processing receipt approval:', { receiptId, status: 'approved' });
      await paymentService.processPaymentReceipt(receiptId, 'approved', null);
      
      // Update user's wallet balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', receipt.user_id)
        .single();
      
      if (userError) {
        throw new Error(userError.message);
      }
      
      const newBalance = (userData.wallet_balance || 0) + receipt.amount;
      
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ 
          wallet_balance: newBalance
        })
        .eq('id', receipt.user_id);
      
      if (updateUserError) {
        console.error('Error updating user balance:', updateUserError);
        throw new Error(updateUserError.message);
      }
      
      // Add a transaction record
      const transactionData = {
        user_id: receipt.user_id,
        type: 'deposit' as const,
        amount: receipt.amount,
        description: `شارژ کیف پول از طریق کارت به کارت - کد پیگیری: ${receipt.tracking_code}`,
        date: new Date().toISOString()
      };
      
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData]);
      
      if (transactionError) {
        console.error('Error inserting transaction:', transactionError);
        throw new Error(transactionError.message);
      }
      
      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId ? {...receipt, status: 'approved'} : receipt
      ));
      
      showNotification('رسید با موفقیت تایید شد و موجودی کاربر افزایش یافت.', 'success');
    } catch (error) {
      showNotification(`خطا در تایید رسید: ${error instanceof Error ? error.message : 'خطای نامشخص'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (receiptId: string) => {
    setProcessing(true);
    try {
      // Update the receipt status to 'rejected'
      console.log('Processing receipt rejection:', { receiptId, status: 'rejected' });
      await paymentService.processPaymentReceipt(receiptId, 'rejected', null);
      
      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId ? {...receipt, status: 'rejected'} : receipt
      ));
      
      showNotification('رسید با موفقیت رد شد.', 'success');
    } catch (error) {
      showNotification(`خطا در رد رسید: ${error instanceof Error ? error.message : 'خطای نامشخص'}`, 'error');
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
                <th className="p-3">رسید</th>
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
                    {receipt.receipt_image_url ? (
                      <button 
                        onClick={() => window.open(receipt.receipt_image_url!, '_blank')}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                      >
                        مشاهده رسید
                      </button>
                    ) : (
                      <span className="text-gray-500 text-sm">بدون تصویر</span>
                    )}
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