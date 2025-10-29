import { supabase } from './supabase';
import { PaymentReceipt } from '../types';

// ZarinPal payment gateway configuration
const ZARINPAL_CONFIG = {
  MERCHANT_ID: 'YOUR_MERCHANT_ID_HERE', // Replace with actual merchant ID
  CALLBACK_URL: 'http://localhost:5179/payment/callback', // Update with your actual domain
  DESCRIPTION: 'شارژ کیف پول Msim724'
};

// Card to card payment configuration
const CARD_TO_CARD_CONFIG = {
  CARD_NUMBER: '6037-99XX-XXXX-XXXX', // Replace with actual card number
  BANK_NAME: 'بانک ملی ایران'
};

// Function to initiate ZarinPal payment
export const initiateZarinPalPayment = async (amount: number, userId: string, userName: string): Promise<string> => {
  try {
    // In a real implementation, you would make an API call to ZarinPal
    // For now, we'll simulate the process and return a mock payment URL
    
    // Create a payment record in the database
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        user_name: userName,
        amount: amount,
        type: 'zarinpal',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // In a real implementation, you would redirect to ZarinPal
    // For simulation, we'll return a mock URL
    return `https://sandbox.zarinpal.com/pg/StartPay/${data[0].id}`;
  } catch (error) {
    console.error('Error initiating ZarinPal payment:', error);
    throw new Error('خطا در ایجاد پرداخت. لطفاً دوباره تلاش کنید.');
  }
};

// Function to handle ZarinPal callback
export const handleZarinPalCallback = async (Authority: string, Status: string): Promise<void> => {
  try {
    // In a real implementation, you would verify the payment with ZarinPal
    // For now, we'll simulate the process
    
    if (Status === 'OK') {
      // Payment was successful, update user's wallet
      // This would be implemented based on your actual ZarinPal integration
      console.log('Payment successful for Authority:', Authority);
    } else {
      // Payment failed or was cancelled
      console.log('Payment failed or cancelled for Authority:', Authority);
    }
  } catch (error) {
    console.error('Error handling ZarinPal callback:', error);
    throw new Error('خطا در پردازش پرداخت.');
  }
};

// Function to submit card to card payment receipt
export const submitCardToCardReceipt = async (
  userId: string, 
  userName: string, 
  amount: number, 
  cardNumber: string, 
  trackingCode: string, 
  receiptImageUrl: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('payment_receipts')
      .insert({
        user_id: userId,
        user_name: userName,
        amount: amount,
        card_number: cardNumber,
        tracking_code: trackingCode,
        receipt_image_url: receiptImageUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error submitting card to card receipt:', error);
    throw new Error('خطا در ثبت رسید پرداخت. لطفاً دوباره تلاش کنید.');
  }
};

// Function to get pending payment receipts for admin
export const getPendingPaymentReceipts = async (): Promise<PaymentReceipt[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data as PaymentReceipt[];
  } catch (error) {
    console.error('Error fetching pending payment receipts:', error);
    throw new Error('خطا در دریافت رسیدهای پرداخت.');
  }
};

// Function to process payment receipt (approve/reject)
export const processPaymentReceipt = async (
  receiptId: string, 
  status: 'approved' | 'rejected', 
  processedBy: string | null = null
): Promise<void> => {
  try {
    const updateData: any = {
      status: status,
      processed_at: new Date().toISOString()
    };
    
    // Only add processed_by if it's provided and is a valid UUID
    if (processedBy && processedBy.length > 0) {
      // Validate that processedBy is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(processedBy)) {
        updateData.processed_by = processedBy;
      }
    }
    
    const { error } = await supabase
      .from('payment_receipts')
      .update(updateData)
      .eq('id', receiptId);
    
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error processing payment receipt:', error);
    throw new Error('خطا در پردازش رسید پرداخت.');
  }
};

// Function to get card to card payment configuration
export const getCardToCardConfig = () => {
  return CARD_TO_CARD_CONFIG;
};

export default {
  initiateZarinPalPayment,
  handleZarinPalCallback,
  submitCardToCardReceipt,
  getPendingPaymentReceipts,
  processPaymentReceipt,
  getCardToCardConfig
};