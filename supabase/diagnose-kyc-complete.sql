-- ========================================
-- تشخیص کامل مشکل KYC
-- ========================================

-- 1. بررسی وجود جدول
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'kyc_verifications';

-- 2. بررسی ساختار جدول
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'kyc_verifications'
ORDER BY ordinal_position;

-- 3. بررسی تعداد کل رکوردها (بدون RLS)
SELECT COUNT(*) as total_records FROM kyc_verifications;

-- 4. بررسی رکوردها به تفکیک status
SELECT 
    status,
    COUNT(*) as count
FROM kyc_verifications
GROUP BY status;

-- 5. نمایش تمام رکوردها
SELECT 
    id,
    user_id,
    full_name,
    national_code,
    status,
    created_at
FROM kyc_verifications
ORDER BY created_at DESC;

-- 6. بررسی کاربر ادمین
SELECT 
    id,
    phone_number,
    role,
    is_verified
FROM users
WHERE id = 'fbac052d-6f34-41ed-bb00-45902597e18a';

-- 7. بررسی تمام ادمین‌ها
SELECT 
    id,
    phone_number,
    role
FROM users
WHERE role = 'admin';

-- 8. بررسی وضعیت RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'kyc_verifications';

-- 9. بررسی تمام policies موجود
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'kyc_verifications'
ORDER BY policyname;

-- 10. تست دسترسی با auth.uid() فعلی
-- این کوئری نشان می‌دهد که آیا auth.uid() مقدار دارد یا نه
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM users WHERE id = auth.uid()) as current_user_role;

-- 11. بررسی اینکه آیا policy ادمین کار می‌کند
SELECT 
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    ) as is_admin;

-- 12. تست مستقیم query که در React استفاده می‌شود
SELECT *
FROM kyc_verifications
ORDER BY created_at DESC;
