-- اضافه کردن تنظیمات Pattern ID های ملی‌پیامک

-- Pattern ID کد ورود (OTP)
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description)
VALUES (
    'sms_pattern_login_otp',
    '389569',
    'string',
    'sms',
    'Pattern ID ملی‌پیامک برای کد ورود به سایت'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- Pattern ID احراز هویت خط فعال
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description)
VALUES (
    'sms_pattern_sim_verification',
    '389569',
    'string',
    'sms',
    'Pattern ID ملی‌پیامک برای احراز هویت خط فعال'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- Pattern ID کد فعال‌سازی خط صفر
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description)
VALUES (
    'sms_pattern_activation_code',
    '389571',
    'string',
    'sms',
    'Pattern ID ملی‌پیامک برای کد فعال‌سازی خطوط صفر'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;
