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
        console.error('Error fetching settings:', error);
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
        console.warn(`Setting not found: ${key}, using default: ${defaultValue}`);
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
        console.error('Error fetching settings:', error);
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
        console.error('Error updating setting:', error);
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
