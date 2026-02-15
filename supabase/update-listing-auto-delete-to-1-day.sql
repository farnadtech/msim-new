-- Update listing auto-delete setting to 1 day
-- This will make sold listings automatically delete after 1 day instead of 30 days

UPDATE site_settings 
SET setting_value = '1', 
    description = 'مدت زمان حذف خودکار آگهی‌های فروخته شده (1 روز بعد از فروش)'
WHERE setting_key = 'listing_auto_delete_days';

-- Verify the update
SELECT setting_key, setting_value, description 
FROM site_settings 
WHERE setting_key = 'listing_auto_delete_days';
