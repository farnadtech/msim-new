// ZarinPal configuration
export const ZARINPAL_CONFIG = {
  // In a real implementation, you would use the actual merchant ID
  MERCHANT_ID: '27086335-7570-4d2b-8eb9-895a4e7f8e56',
  
  // API endpoints
  REQUEST_URL: 'https://api.zarinpal.com/pg/v4/payment/request.json',
  VERIFY_URL: 'https://api.zarinpal.com/pg/v4/payment/verify.json',
  PAYMENT_GATEWAY_URL: 'https://www.zarinpal.com/pg/StartPay/',
  
  // Sandbox mode for testing
  SANDBOX: true,
  
  // Callback URL where users will be redirected after payment
  CALLBACK_URL: 'http://msim724.com/#/zarinpal/callback'
};

export default ZARINPAL_CONFIG;