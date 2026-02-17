-- افزودن تنظیمات مربوط به دریافت کد فعال‌سازی و احراز هویت

-- تنظیم فعال/غیرفعال بودن دریافت کد فعال‌سازی توسط خریدار
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('buyer_can_receive_activation_code', 'false', 'آیا خریدار می‌تواند کد فعال‌سازی دریافت کند؟ (true/false)', 'general', 'boolean')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;

-- تنظیم الزامی بودن احراز هویت
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('kyc_required', 'true', 'آیا احراز هویت برای استفاده از سایت الزامی است؟', 'general', 'boolean')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;

-- تنظیم الزامی بودن احراز هویت برای فروشندگان
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('kyc_required_for_sellers', 'true', 'آیا احراز هویت برای فروشندگان الزامی است؟', 'general', 'boolean')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;

-- تنظیم الزامی بودن احراز هویت برای خریداران
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('kyc_required_for_buyers', 'true', 'آیا احراز هویت برای خریداران الزامی است؟', 'general', 'boolean')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;

-- پیام نمایش داده شده به کاربران احراز هویت نشده
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('kyc_required_message', 'برای استفاده از امکانات سایت، لطفا ابتدا احراز هویت خود را تکمیل کنید.', 'پیام نمایش داده شده به کاربران احراز هویت نشده', 'general', 'string')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;
