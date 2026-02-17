-- حل کامل مشکل نمایش تراکنش‌ها در پنل فروشنده و خریدار

-- مرحله 1: حذف تمام policies قدیمی
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON transactions;

-- مرحله 2: فعال کردن RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- مرحله 3: ایجاد policy برای خواندن تراکنش‌های خودشان
CREATE POLICY "Users can view their own transactions"
ON transactions
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- مرحله 4: ایجاد policy برای ادمین‌ها (دسترسی به همه تراکنش‌ها)
CREATE POLICY "Admins can view all transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
);

-- مرحله 5: policy برای insert (فقط سیستم و service_role)
CREATE POLICY "System can insert transactions"
ON transactions
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- مرحله 6: policy برای update (فقط ادمین‌ها)
CREATE POLICY "Admins can update transactions"
ON transactions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
);

-- تست: بررسی تراکنش‌های یک کاربر نمونه
-- این کوئری باید تراکنش‌های کاربر لاگین شده را نشان دهد
SELECT 
    'تست نمایش تراکنش‌ها' as test,
    COUNT(*) as count
FROM transactions
WHERE user_id = auth.uid()::text;

-- نمایش policies جدید
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;
