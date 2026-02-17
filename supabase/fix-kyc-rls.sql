-- Fix RLS policies for kyc_verifications table

-- حذف پالیسی‌های قبلی
DROP POLICY IF EXISTS "Users can view their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can insert their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can update their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can update all KYC" ON kyc_verifications;

-- فعال کردن RLS
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- کاربران می‌توانند KYC خود را مشاهده کنند
CREATE POLICY "Users can view their own KYC"
ON kyc_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- کاربران می‌توانند KYC خود را ایجاد کنند
CREATE POLICY "Users can insert their own KYC"
ON kyc_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- کاربران می‌توانند KYC خود را به‌روزرسانی کنند
CREATE POLICY "Users can update their own KYC"
ON kyc_verifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ادمین‌ها می‌توانند همه KYC ها را مشاهده کنند
CREATE POLICY "Admins can view all KYC"
ON kyc_verifications
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ادمین‌ها می‌توانند همه KYC ها را به‌روزرسانی کنند
CREATE POLICY "Admins can update all KYC"
ON kyc_verifications
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- بررسی نهایی
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
WHERE tablename = 'kyc_verifications';
