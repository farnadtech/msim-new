-- غیرفعال کردن احراز هویت برای تمام کاربران فعلی (به جز ادمین)
-- این اسکریپت تمام کاربران غیر ادمین را مجبور می‌کند که احراز هویت کنند

-- مرحله 1: تنظیم is_verified به false برای تمام کاربران غیر ادمین
UPDATE users
SET 
    is_verified = false,
    kyc_submitted_at = NULL
WHERE role != 'admin';

-- مرحله 2: حذف تمام درخواست‌های KYC قبلی (اختیاری - اگر می‌خواهید از صفر شروع کنند)
-- اگر می‌خواهید درخواست‌های قبلی را نگه دارید، این بخش را کامنت کنید
DELETE FROM kyc_verifications WHERE user_id IN (
    SELECT id FROM users WHERE role != 'admin'
);

-- گزارش نتیجه
SELECT 
    role,
    COUNT(*) as total_users,
    SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as verified_users,
    SUM(CASE WHEN is_verified = false OR is_verified IS NULL THEN 1 ELSE 0 END) as unverified_users
FROM users
GROUP BY role
ORDER BY role;

-- نمایش پیام موفقیت
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count FROM users WHERE role != 'admin' AND is_verified = false;
    RAISE NOTICE 'تعداد % کاربر غیر ادمین به حالت احراز نشده تغییر یافتند', affected_count;
END $$;
