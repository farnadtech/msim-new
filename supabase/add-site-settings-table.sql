-- Create site_settings table for managing all configurable parameters
CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL, -- 'number', 'boolean', 'string', 'json'
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'commission', 'auction', 'listing', 'general'
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_site_settings_category ON site_settings(category);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all settings
CREATE POLICY "Allow admins to read settings"
ON site_settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Allow admins to update settings
CREATE POLICY "Allow admins to update settings"
ON site_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Allow public to read non-sensitive settings (for display purposes)
CREATE POLICY "Allow public to read public settings"
ON site_settings
FOR SELECT
TO public
USING (category NOT IN ('internal', 'sensitive'));

-- Insert default settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description, category) VALUES
-- Commission Settings
('commission_rate', '0.02', 'number', 'نرخ کمیسیون سایت (به صورت اعشاری، مثلاً 0.02 برای 2%)', 'commission'),
('commission_applies_to_auction', 'true', 'boolean', 'آیا کمیسیون به حراجی‌ها هم اعمال شود؟', 'commission'),
('commission_applies_to_fixed', 'true', 'boolean', 'آیا کمیسیون به فروش مقطوع هم اعمال شود؟', 'commission'),

-- Auction Settings
('auction_guarantee_deposit_rate', '0.05', 'number', 'نرخ سپرده تضمین حراجی (5% = 0.05)', 'auction'),
('auction_top_winners_count', '3', 'number', 'تعداد برندگان برتر که سپرده‌شان نگه‌داشته می‌شود', 'auction'),
('auction_payment_deadline_hours', '48', 'number', 'مهلت پرداخت برنده حراجی (به ساعت)', 'auction'),
('auction_min_base_price', '1000000', 'number', 'حداقل قیمت پایه حراجی (تومان)', 'auction'),
('auction_auto_process', 'true', 'boolean', 'پردازش خودکار حراجی‌های پایان‌یافته', 'auction'),

-- Listing Settings
('listing_auto_delete_days', '30', 'number', 'مدت زمان حذف خودکار آگهی‌های منقضی شده (روز)', 'listing'),
('listing_max_duration_days', '90', 'number', 'حداکثر مدت نمایش هر آگهی (روز)', 'listing'),
('listing_auto_delete_enabled', 'true', 'boolean', 'فعال‌سازی حذف خودکار آگهی‌ها', 'listing'),

-- Payment Settings
('zarinpal_enabled', 'true', 'boolean', 'فعال‌سازی درگاه زرین‌پال', 'payment'),
('card_to_card_enabled', 'true', 'boolean', 'فعال‌سازی کارت به کارت', 'payment'),
('min_deposit_amount', '10000', 'number', 'حداقل مبلغ شارژ کیف پول (تومان)', 'payment'),
('min_withdrawal_amount', '50000', 'number', 'حداقل مبلغ برداشت از کیف پول (تومان)', 'payment'),

-- Round Settings
('rond_level_1_price', '5000', 'number', 'هزینه رند 1 ستاره (تومان)', 'rond'),
('rond_level_2_price', '10000', 'number', 'هزینه رند 2 ستاره (تومان)', 'rond'),
('rond_level_3_price', '15000', 'number', 'هزینه رند 3 ستاره (تومان)', 'rond'),
('rond_level_4_price', '20000', 'number', 'هزینه رند 4 ستاره (تومان)', 'rond'),
('rond_level_5_price', '25000', 'number', 'هزینه رند 5 ستاره (تومان)', 'rond'),

-- General Settings
('site_name', 'سیم 724', 'string', 'نام سایت', 'general'),
('support_phone', '02112345678', 'string', 'شماره تماس پشتیبانی', 'general'),
('support_email', 'support@sim724.com', 'string', 'ایمیل پشتیبانی', 'general'),
('maintenance_mode', 'false', 'boolean', 'حالت تعمیر و نگهداری', 'general')
ON CONFLICT (setting_key) DO NOTHING;

-- Create a function to get setting value
CREATE OR REPLACE FUNCTION get_setting(key TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT setting_value INTO result
    FROM site_settings
    WHERE setting_key = key;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update setting
CREATE OR REPLACE FUNCTION update_setting(
    key TEXT,
    value TEXT,
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT (role = 'admin') INTO is_admin
    FROM users
    WHERE id = user_id;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'فقط مدیر می‌تواند تنظیمات را تغییر دهد';
    END IF;
    
    -- Update the setting
    UPDATE site_settings
    SET setting_value = value,
        updated_at = NOW(),
        updated_by = user_id
    WHERE setting_key = key;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE site_settings IS 'جدول تنظیمات سایت - شامل تمام پارامترهای قابل تنظیم';
COMMENT ON FUNCTION get_setting IS 'دریافت مقدار یک تنظیم بر اساس کلید';
COMMENT ON FUNCTION update_setting IS 'به‌روزرسانی مقدار یک تنظیم (فقط برای مدیر)';
