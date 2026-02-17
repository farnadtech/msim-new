-- ========================================
-- راه‌حل نهایی و کامل برای مشکل KYC
-- این اسکریپت تمام مشکلات را حل می‌کند
-- ========================================

-- قدم 1: بررسی وضعیت فعلی
SELECT '=== قدم 1: بررسی وضعیت فعلی ===' as step;

SELECT 
    'Total KYC Records' as info,
    COUNT(*) as count
FROM kyc_verifications;

-- قدم 2: غیرفعال کردن RLS
SELECT '=== قدم 2: غیرفعال کردن RLS ===' as step;

ALTER TABLE kyc_verifications DISABLE ROW LEVEL SECURITY;

-- قدم 3: حذف تمام policies
SELECT '=== قدم 3: حذف policies قبلی ===' as step;

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'kyc_verifications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON kyc_verifications';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- قدم 4: فعال کردن RLS
SELECT '=== قدم 4: فعال کردن RLS ===' as step;

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- قدم 5: ایجاد policy برای ادمین
SELECT '=== قدم 5: ایجاد policy ادمین ===' as step;

CREATE POLICY "admin_full_access"
ON kyc_verifications
FOR ALL
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

-- قدم 6: ایجاد policies برای کاربران عادی
SELECT '=== قدم 6: ایجاد policies کاربران ===' as step;

-- مشاهده
CREATE POLICY "users_view_own"
ON kyc_verifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- درج
CREATE POLICY "users_insert_own"
ON kyc_verifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- به‌روزرسانی (فقط وقتی pending است)
CREATE POLICY "users_update_own_pending"
ON kyc_verifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid());

-- قدم 7: بررسی policies ایجاد شده
SELECT '=== قدم 7: بررسی policies ===' as step;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%admin%' THEN 'Admin Policy'
        WHEN policyname LIKE '%users%' THEN 'User Policy'
        ELSE 'Other'
    END as policy_type
FROM pg_policies
WHERE tablename = 'kyc_verifications'
ORDER BY policyname;

-- قدم 8: تست دسترسی
SELECT '=== قدم 8: تست دسترسی ===' as step;

-- این کوئری باید بدون خطا اجرا شود
SELECT COUNT(*) as accessible_records
FROM kyc_verifications;

-- قدم 9: بررسی کاربر ادمین
SELECT '=== قدم 9: بررسی ادمین‌ها ===' as step;

SELECT 
    id,
    phone_number,
    role,
    is_verified
FROM users
WHERE role = 'admin';

-- قدم 10: ایجاد یک درخواست تستی (اگر هیچ درخواستی وجود ندارد)
SELECT '=== قدم 10: ایجاد داده تستی ===' as step;

DO $$
DECLARE
    test_user_id UUID;
    kyc_count INTEGER;
BEGIN
    -- بررسی تعداد درخواست‌های موجود
    SELECT COUNT(*) INTO kyc_count FROM kyc_verifications;
    
    IF kyc_count = 0 THEN
        -- پیدا کردن یک کاربر غیر ادمین
        SELECT id INTO test_user_id
        FROM users
        WHERE role != 'admin'
        LIMIT 1;
        
        -- اگر کاربری نبود، یکی بساز
        IF test_user_id IS NULL THEN
            INSERT INTO users (id, phone_number, role, is_verified, wallet_balance)
            VALUES (
                gen_random_uuid(),
                '09111111111',
                'buyer',
                false,
                0
            )
            RETURNING id INTO test_user_id;
        END IF;
        
        -- ایجاد درخواست KYC
        INSERT INTO kyc_verifications (
            user_id,
            full_name,
            national_code,
            birth_date,
            phone_number,
            address,
            city,
            postal_code,
            national_card_front_url,
            national_card_back_url,
            status,
            submitted_at,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            'کاربر تستی',
            '0123456789',
            '1995-01-01',
            '09111111111',
            'تهران، خیابان تست',
            'تهران',
            '1234567890',
            'https://via.placeholder.com/300',
            'https://via.placeholder.com/300',
            'pending',
            NOW(),
            NOW(),
            NOW()
        );
        
        UPDATE users SET kyc_submitted_at = NOW() WHERE id = test_user_id;
        
        RAISE NOTICE 'درخواست KYC تستی ایجاد شد';
    ELSE
        RAISE NOTICE 'درخواست‌های KYC موجود هستند: %', kyc_count;
    END IF;
END $$;

-- قدم 11: خلاصه نهایی
SELECT '=== قدم 11: خلاصه نهایی ===' as step;

SELECT 
    'Summary' as info,
    (SELECT COUNT(*) FROM kyc_verifications) as total_kyc,
    (SELECT COUNT(*) FROM kyc_verifications WHERE status = 'pending') as pending,
    (SELECT COUNT(*) FROM kyc_verifications WHERE status = 'approved') as approved,
    (SELECT COUNT(*) FROM kyc_verifications WHERE status = 'rejected') as rejected,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'kyc_verifications') as total_policies;

-- قدم 12: نمایش آخرین درخواست‌ها
SELECT '=== قدم 12: آخرین درخواست‌ها ===' as step;

SELECT 
    id,
    user_id,
    full_name,
    national_code,
    status,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM kyc_verifications
ORDER BY created_at DESC
LIMIT 5;

SELECT '=== ✅ تمام مراحل با موفقیت انجام شد ===' as final_message;
