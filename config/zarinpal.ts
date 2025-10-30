// ZarinPal configuration
export const ZARINPAL_CONFIG = {
  // In a real implementation, you would use the actual merchant ID
  MERCHANT_ID: '492a440e-1e9b-4581-b466-c7922341b4fa',
  
  // API endpoints
  REQUEST_URL: 'https://api.zarinpal.com/pg/v4/payment/request.json',
  VERIFY_URL: 'https://api.zarinpal.com/pg/v4/payment/verify.json',
  PAYMENT_GATEWAY_URL: 'https://www.zarinpal.com/pg/StartPay/',
  
  // Sandbox mode for testing
  SANDBOX: true,
  
  // Callback URL where users will be redirected after payment
  CALLBACK_URL: 'http://localhost:5173/#/zarinpal/callback'
};

export default ZARINPAL_CONFIG;