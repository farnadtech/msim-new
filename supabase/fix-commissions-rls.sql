-- رفع مشکل RLS برای جدول commissions
-- این اسکریپت را در Supabase SQL Editor اجرا کنید

-- حذف policy های قبلی
DROP POLICY IF EXISTS "Admins can view all commissions" ON commissions;
DROP POLICY IF EXISTS "System can create commissions" ON commissions;
DROP POLICY IF EXISTS "Authenticated users can view commissions" ON commissions;
DROP POLICY IF EXISTS "System can insert commissions" ON commissions;

-- غیرفعال کردن RLS (ساده‌ترین راه حل)
ALTER TABLE commissions DISABLE ROW LEVEL SECURITY;

-- یا اگر می‌خواهید RLS فعال بماند، از این policy استفاده کنید:
-- ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Anyone can view commissions"
-- ON commissions
-- FOR SELECT
-- USING (true);
-- 
-- CREATE POLICY "Anyone can insert commissions"
-- ON commissions
-- FOR INSERT
-- WITH CHECK (true);

-- بررسی تعداد رکوردها
SELECT COUNT(*) as total_commissions FROM commissions;

-- نمایش 10 رکورد اول
SELECT * FROM commissions ORDER BY created_at DESC LIMIT 10;
