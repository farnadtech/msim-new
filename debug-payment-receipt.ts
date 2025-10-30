import { supabase } from './services/supabase';
import paymentService from './services/paymentService-supabase';

async function debugPaymentReceipt() {
  try {
    console.log('Debugging payment receipt processing...');
    
    // First, let's get a real receipt ID from the database
    const { data: receipts, error: fetchError } = await supabase
      .from('payment_receipts')
      .select('id, status')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching receipts:', fetchError);
      return;
    }
    
    if (!receipts || receipts.length === 0) {
      console.log('No receipts found in database');
      return;
    }
    
    const receipt = receipts[0];
    console.log('Found receipt:', receipt);
    
    // Try to process this receipt
    console.log('Attempting to process receipt with ID:', receipt.id);
    
    try {
      await paymentService.processPaymentReceipt(receipt.id, 'approved', 'admin');
      console.log('Receipt processed successfully');
    } catch (processError) {
      console.error('Error processing receipt:', processError);
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugPaymentReceipt();