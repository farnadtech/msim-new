import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api-supabase';
import { useAuth } from '../hooks/useAuth';

const ZarinPalCallbackPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | 'processing'>('processing');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      // Get query parameters from URL
      const queryParams = new URLSearchParams(location.search);
      const authority = queryParams.get('Authority');
      const statusParam = queryParams.get('Status');
      
      // Check if payment was cancelled
      if (statusParam !== 'OK' || !authority) {
        setStatus('error');
        setMessage('پرداخت لغو شد یا با خطا مواجه شد.');
        setLoading(false);
        return;
      }
      
      try {
        // Get the amount from the payment receipt using the authority code
        const { data: receipt, error: receiptError } = await api.getPaymentReceiptByAuthority(authority);
        
        if (receiptError || !receipt) {
          setStatus('error');
          setMessage('اطلاعات پرداخت یافت نشد. لطفاً با پشتیبانی تماس بگیرید.');
          setLoading(false);
          return;
        }
        
        // Verify payment with ZarinPal
        const result = await api.verifyZarinPalPayment(authority, receipt.amount);
        
        if (result.success) {
          setStatus('success');
          setMessage(`پرداخت با موفقیت انجام شد. کد رهگیری: ${result.refId}`);
          // Refresh user data to show updated wallet balance
          await refreshUser();
        } else {
          setStatus('error');
          setMessage('خطا در تأیید پرداخت. لطفاً با پشتیبانی تماس بگیرید.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('خطا در پردازش پرداخت. لطفاً با پشتیبانی تماس بگیرید.');
      } finally {
        setLoading(false);
      }
    };
    
    verifyPayment();
  }, [location.search, refreshUser]);

  const handleReturn = () => {
    navigate('/seller/wallet');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">در حال پردازش پرداخت...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'success' ? (
          <div className="text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4">پرداخت موفق</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
          </div>
        ) : (
          <div className="text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4">پرداخت ناموفق</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
          </div>
        )}
        
        <button
          onClick={handleReturn}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
        >
          بازگشت به کیف پول
        </button>
      </div>
    </div>
  );
};

export default ZarinPalCallbackPage;