-- اضافه کردن تنظیمات درگاه‌های پرداخت به جدول site_settings

-- تنظیمات زرین‌پال
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('zarinpal_enabled', 'true', 'فعال/غیرفعال بودن درگاه زرین‌پال', 'payment_gateways', 'boolean'),
  ('zarinpal_merchant_id', '', 'Merchant ID زرین‌پال', 'payment_gateways', 'string'),
  ('zarinpal_sandbox', 'true', 'حالت تست زرین‌پال', 'payment_gateways', 'boolean')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;

-- تنظیمات زیبال
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('zibal_enabled', 'true', 'فعال/غیرفعال بودن درگاه زیبال', 'payment_gateways', 'boolean'),
  ('zibal_merchant_id', 'zibal', 'Merchant ID زیبال (برای تست از zibal استفاده کنید)', 'payment_gateways', 'string'),
  ('zibal_sandbox', 'true', 'حالت تست زیبال', 'payment_gateways', 'boolean')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;

-- تنظیمات کارت به کارت
INSERT INTO site_settings (setting_key, setting_value, description, category, setting_type)
VALUES 
  ('card_to_card_enabled', 'true', 'فعال/غیرفعال بودن کارت به کارت', 'payment_gateways', 'boolean'),
  ('card_to_card_number', '6037-99XX-XXXX-XXXX', 'شماره کارت برای کارت به کارت', 'payment_gateways', 'string'),
  ('card_to_card_bank_name', 'بانک ملی ایران', 'نام بانک', 'payment_gateways', 'string')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  setting_type = EXCLUDED.setting_type;
