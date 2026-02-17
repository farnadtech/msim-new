-- بررسی داده‌های جدول kyc_verifications

-- 1. تعداد کل درخواست‌ها
SELECT 
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
FROM kyc_verifications;

-- 2. لیست تمام درخواست‌ها
SELECT 
    id,
    user_id,
    full_name,
    national_code,
    phone_number,
    status,
    created_at,
    submitted_at,
    reviewed_at
FROM kyc_verifications
ORDER BY created_at DESC;

-- 3. بررسی کاربران که KYC ثبت کرده‌اند
SELECT 
    u.id,
    u.phone_number,
    u.role,
    u.is_verified,
    u.kyc_submitted_at,
    k.status as kyc_status,
    k.full_name
FROM users u
LEFT JOIN kyc_verifications k ON u.id = k.user_id
WHERE u.kyc_submitted_at IS NOT NULL
ORDER BY u.kyc_submitted_at DESC;

-- 4. بررسی RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'kyc_verifications';

-- 5. بررسی دسترسی‌های جدول
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'kyc_verifications';
