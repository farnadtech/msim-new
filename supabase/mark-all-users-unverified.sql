-- فقط علامت‌گذاری کاربران به عنوان احراز نشده (بدون حذف درخواست‌های قبلی)
-- این اسکریپت درخواست‌های KYC قبلی را حفظ می‌کند

-- تنظیم is_verified به false برای تمام کاربران غیر ادمین
UPDATE users
SET is_verified = false
WHERE role != 'admin';

-- گزارش نتیجه
SELECT 
    'کاربران' as category,
    role,
    COUNT(*) as total,
    SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as verified,
    SUM(CASE WHEN is_verified = false OR is_verified IS NULL THEN 1 ELSE 0 END) as unverified
FROM users
GROUP BY role
ORDER BY role;

-- نمایش آمار KYC
SELECT 
    'درخواست‌های KYC' as category,
    status,
    COUNT(*) as count
FROM kyc_verifications
GROUP BY status
ORDER BY status;

-- پیام موفقیت
DO $$
DECLARE
    affected_count INTEGER;
    pending_kyc INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count FROM users WHERE role != 'admin';
    SELECT COUNT(*) INTO pending_kyc FROM kyc_verifications WHERE status = 'pending';
    
    RAISE NOTICE '✅ تعداد % کاربر غیر ادمین به حالت احراز نشده تغییر یافتند', affected_count;
    RAISE NOTICE 'ℹ️  تعداد % درخواست KYC در انتظار بررسی', pending_kyc;
    RAISE NOTICE '💡 کاربران باید مجددا احراز هویت کنند یا درخواست قبلی آن‌ها تایید شود';
END $$;
