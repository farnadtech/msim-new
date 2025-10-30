import api from './services/api-supabase';

async function testZarinPal() {
  try {
    console.log('Testing ZarinPal payment creation...');
    
    // Test creating a payment
    const result = await api.createZarinPalPayment(
      'test-user-id',
      'Test User',
      10000
    );
    
    console.log('Payment creation result:', result);
    
    // Test verifying a payment
    console.log('Testing ZarinPal payment verification...');
    const verifyResult = await api.verifyZarinPalPayment(
      result.authority,
      10000
    );
    
    console.log('Payment verification result:', verifyResult);
  } catch (error) {
    console.error('Error testing ZarinPal:', error);
  }
}

testZarinPal();