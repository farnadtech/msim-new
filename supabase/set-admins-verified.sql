-- تنظیم ادمین‌ها به عنوان احراز هویت شده
-- ادمین‌ها نیازی به احراز هویت ندارند

UPDATE users
SET is_verified = true
WHERE role = 'admin';

-- گزارش نتیجه
SELECT 
    'ادمین‌ها' as category,
    COUNT(*) as total,
    SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as verified
FROM users
WHERE role = 'admin';

-- پیام موفقیت
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    RAISE NOTICE '✅ تعداد % ادمین به عنوان احراز هویت شده تنظیم شدند', admin_count;
END $$;
