-- ========================================
-- حل کامل مشکل RLS برای KYC
-- ========================================

-- مرحله 1: غیرفعال کردن RLS
ALTER TABLE kyc_verifications DISABLE ROW LEVEL SECURITY;

-- مرحله 2: حذف تمام policies قبلی
DROP POLICY IF EXISTS "Users can view their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can insert their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can update their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can update their own pending KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can update all KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admin full access" ON kyc_verifications;
DROP POLICY IF EXISTS "Users own KYC" ON kyc_verifications;

-- مرحله 3: فعال کردن مجدد RLS
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- مرحله 4: ایجاد policy جدید برای ادمین (با استفاده از service_role)
-- این policy به ادمین‌ها اجازه می‌دهد همه چیز را ببینند و تغییر دهند
CREATE POLICY "admin_all_access"
ON kyc_verifications
FOR ALL
TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- مرحله 5: ایجاد policy برای کاربران عادی - مشاهده
CREATE POLICY "users_select_own"
ON kyc_verifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- مرحله 6: ایجاد policy برای کاربران عادی - درج
CREATE POLICY "users_insert_own"
ON kyc_verifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- مرحله 7: ایجاد policy برای کاربران عادی - به‌روزرسانی
CREATE POLICY "users_update_own"
ON kyc_verifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- مرحله 8: بررسی نهایی
SELECT 
    'Policies Created' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'kyc_verifications';

-- مرحله 9: نمایش تمام policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'kyc_verifications'
ORDER BY policyname;

-- مرحله 10: تست دسترسی
SELECT 
    'Test Query' as test,
    COUNT(*) as total_records
FROM kyc_verifications;
