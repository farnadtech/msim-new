-- غیرفعال کردن کامل RLS برای تست
ALTER TABLE kyc_verifications DISABLE ROW LEVEL SECURITY;

-- بررسی
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'kyc_verifications';

-- نمایش تمام رکوردها
SELECT 
    id,
    user_id,
    full_name,
    status,
    created_at
FROM kyc_verifications
ORDER BY created_at DESC;
