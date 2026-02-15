import * as settingsService from '../services/settings-service';

// Zibal Payment Gateway Configuration
export const ZIBAL_CONFIG = {
    // API Endpoints
    REQUEST_URL: 'https://gateway.zibal.ir/v1/request',
    VERIFY_URL: 'https://gateway.zibal.ir/v1/verify',
    START_URL: 'https://gateway.zibal.ir/start/',
    
    // Callback URL - برای HashRouter از صفحه واسط استفاده می‌کنیم
    // صفحه واسط query parameters را دریافت و به hash route منتقل می‌کند
    CALLBACK_URL: import.meta.env.VITE_ZIBAL_CALLBACK_URL || `${window.location.origin}/zibal-callback.html`
};

/**
 * Get Zibal configuration from database settings
 */
export const getZibalConfig = async () => {
    const [merchantId, sandbox, enabled] = await Promise.all([
        settingsService.getZibalMerchantId(),
        settingsService.isZibalSandbox(),
        settingsService.isZibalEnabled()
    ]);
    
    return {
        merchantId: merchantId || 'zibal', // default to sandbox
        sandbox,
        enabled
    };
};
