import { supabase } from './supabase';
import { SiteSetting } from '../types';

// Cache for settings to avoid repeated database calls
let settingsCache: Record<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute

/**
 * Get all site settings from database
 */
export const getAllSettings = async (): Promise<SiteSetting[]> => {
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('category', { ascending: true });
    
    if (error) {
        throw error;
    }
    
    return data || [];
};

/**
 * Get a single setting value by key
 */
export const getSetting = async (key: string, defaultValue?: string): Promise<string> => {
    // Check cache first
    const now = Date.now();
    if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return settingsCache[key] || defaultValue || '';
    }
    
    const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();
    
    if (error || !data) {
        return defaultValue || '';
    }
    
    return data.setting_value;
};

/**
 * Get a number setting
 */
export const getNumberSetting = async (key: string, defaultValue: number = 0): Promise<number> => {
    const value = await getSetting(key, String(defaultValue));
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Get a boolean setting
 */
export const getBooleanSetting = async (key: string, defaultValue: boolean = false): Promise<boolean> => {
    const value = await getSetting(key, String(defaultValue));
    return value.toLowerCase() === 'true';
};

/**
 * Get all settings as a key-value object (cached)
 */
export const getAllSettingsAsObject = async (forceRefresh: boolean = false): Promise<Record<string, string>> => {
    const now = Date.now();
    
    // Return cache if valid and not forcing refresh
    if (!forceRefresh && settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return settingsCache;
    }
    
    const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');
    
    if (error) {
        return settingsCache || {};
    }
    
    const settings: Record<string, string> = {};
    (data || []).forEach(item => {
        settings[item.setting_key] = item.setting_value;
    });
    
    // Update cache
    settingsCache = settings;
    cacheTimestamp = now;
    
    return settings;
};

/**
 * Update a setting value (admin only)
 */
export const updateSetting = async (key: string, value: string, userId: string): Promise<void> => {
    const { error } = await supabase
        .from('site_settings')
        .update({
            setting_value: value,
            updated_at: new Date().toISOString(),
            updated_by: userId
        })
        .eq('setting_key', key);
    
    if (error) {
        throw error;
    }
    
    // Clear cache to force refresh
    settingsCache = null;
};

/**
 * Get commission rate
 */
export const getCommissionRate = async (): Promise<number> => {
    return await getNumberSetting('commission_rate', 0.02);
};

/**
 * Get auction guarantee deposit rate
 */
export const getAuctionGuaranteeRate = async (): Promise<number> => {
    return await getNumberSetting('auction_guarantee_deposit_rate', 0.05);
};

/**
 * Get number of top winners to keep deposit
 */
export const getAuctionTopWinnersCount = async (): Promise<number> => {
    return await getNumberSetting('auction_top_winners_count', 3);
};

/**
 * Get auction payment deadline in hours
 */
export const getAuctionPaymentDeadlineHours = async (): Promise<number> => {
    return await getNumberSetting('auction_payment_deadline_hours', 48);
};

/**
 * Get listing auto-delete days
 */
export const getListingAutoDeleteDays = async (): Promise<number> => {
    return await getNumberSetting('listing_auto_delete_days', 30);
};

/**
 * Check if auto-delete is enabled
 */
export const isAutoDeleteEnabled = async (): Promise<boolean> => {
    return await getBooleanSetting('listing_auto_delete_enabled', true);
};

/**
 * Get minimum auction base price
 */
export const getMinAuctionBasePrice = async (): Promise<number> => {
    return await getNumberSetting('auction_min_base_price', 1000000);
};

/**
 * Get rond level price
 */
export const getRondPrice = async (level: 1 | 2 | 3 | 4 | 5): Promise<number> => {
    const key = `rond_level_${level}_price`;
    const defaultPrices = [5000, 10000, 15000, 20000, 25000];
    return await getNumberSetting(key, defaultPrices[level - 1]);
};

/**
 * Get all rond prices at once
 */
export const getAllRondPrices = async (): Promise<Record<number, number>> => {
    const settings = await getAllSettingsAsObject();
    return {
        1: parseFloat(settings['rond_level_1_price'] || '5000'),
        2: parseFloat(settings['rond_level_2_price'] || '10000'),
        3: parseFloat(settings['rond_level_3_price'] || '15000'),
        4: parseFloat(settings['rond_level_4_price'] || '20000'),
        5: parseFloat(settings['rond_level_5_price'] || '25000')
    };
};

/**
 * Clear settings cache (useful after updates)
 */
export const clearSettingsCache = (): void => {
    settingsCache = null;
    cacheTimestamp = 0;
};

// --- Payment Gateway Settings ---

/**
 * Check if ZarinPal is enabled
 */
export const isZarinPalEnabled = async (): Promise<boolean> => {
    return await getBooleanSetting('zarinpal_enabled', true);
};

/**
 * Get ZarinPal merchant ID
 */
export const getZarinPalMerchantId = async (): Promise<string> => {
    return await getSetting('zarinpal_merchant_id', '');
};

/**
 * Check if ZarinPal is in sandbox mode
 */
export const isZarinPalSandbox = async (): Promise<boolean> => {
    return await getBooleanSetting('zarinpal_sandbox', true);
};

/**
 * Check if Zibal is enabled
 */
export const isZibalEnabled = async (): Promise<boolean> => {
    return await getBooleanSetting('zibal_enabled', true);
};

/**
 * Get Zibal merchant ID
 */
export const getZibalMerchantId = async (): Promise<string> => {
    return await getSetting('zibal_merchant_id', 'zibal');
};

/**
 * Check if Zibal is in sandbox mode
 */
export const isZibalSandbox = async (): Promise<boolean> => {
    return await getBooleanSetting('zibal_sandbox', true);
};

/**
 * Check if card-to-card is enabled
 */
export const isCardToCardEnabled = async (): Promise<boolean> => {
    return await getBooleanSetting('card_to_card_enabled', true);
};

/**
 * Get card-to-card number
 */
export const getCardToCardNumber = async (): Promise<string> => {
    return await getSetting('card_to_card_number', '6037-99XX-XXXX-XXXX');
};

/**
 * Get card-to-card bank name
 */
export const getCardToCardBankName = async (): Promise<string> => {
    return await getSetting('card_to_card_bank_name', 'بانک ملی ایران');
};

/**
 * Get all enabled payment gateways
 */
export const getEnabledPaymentGateways = async (): Promise<{
    zarinpal: boolean;
    zibal: boolean;
    cardToCard: boolean;
}> => {
    const [zarinpal, zibal, cardToCard] = await Promise.all([
        isZarinPalEnabled(),
        isZibalEnabled(),
        isCardToCardEnabled()
    ]);
    
    return { zarinpal, zibal, cardToCard };
};

/**
 * Get payment gateway configuration
 */
export const getPaymentGatewayConfig = async (gateway: 'zarinpal' | 'zibal'): Promise<{
    enabled: boolean;
    merchantId: string;
    sandbox: boolean;
}> => {
    if (gateway === 'zarinpal') {
        const [enabled, merchantId, sandbox] = await Promise.all([
            isZarinPalEnabled(),
            getZarinPalMerchantId(),
            isZarinPalSandbox()
        ]);
        return { enabled, merchantId, sandbox };
    } else {
        const [enabled, merchantId, sandbox] = await Promise.all([
            isZibalEnabled(),
            getZibalMerchantId(),
            isZibalSandbox()
        ]);
        return { enabled, merchantId, sandbox };
    }
};

/**
 * Get company stamp URL
 */
export const getCompanyStampUrl = async (): Promise<string> => {
    return await getSetting('company_stamp_url', '');
};

// --- SMS Pattern Settings ---

/**
 * Get SMS pattern for login OTP
 */
export const getSmsPatternLoginOtp = async (): Promise<string> => {
    return await getSetting('sms_pattern_login_otp', 'کد ورود شما: {code}');
};

/**
 * Get SMS pattern for SIM verification
 */
export const getSmsPatternSimVerification = async (): Promise<string> => {
    return await getSetting('sms_pattern_sim_verification', 'کد احراز هویت خط: {code}');
};

/**
 * Get SMS pattern for activation code
 */
export const getSmsPatternActivationCode = async (): Promise<string> => {
    return await getSetting('sms_pattern_activation_code', 'کد فعال‌سازی خط: {code}');
};

/**
 * Format SMS message with pattern
 */
export const formatSmsMessage = (pattern: string, code: string): string => {
    return pattern.replace('{code}', code);
};
