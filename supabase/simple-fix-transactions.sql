-- حل ساده مشکل نمایش تراکنش‌ها

-- حذف تمام policies قدیمی
DROP POLICY IF EXISTS "users_view_own_transactions" ON transactions;
DROP POLICY IF EXISTS "admins_view_all_transactions" ON transactions;
DROP POLICY IF EXISTS "system_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "admins_update_transactions" ON transactions;
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

-- فعال کردن RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: کاربران می‌توانند تراکنش‌های خود را ببینند
CREATE POLICY "users_view_own_transactions"
ON transactions
FOR SELECT
TO authenticated
USING (user_id = (auth.uid())::text);

-- Policy 2: ادمین‌ها می‌توانند همه تراکنش‌ها را ببینند
CREATE POLICY "admins_view_all_transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
    (SELECT role FROM users WHERE id = (auth.uid())::text) = 'admin'
);

-- Policy 3: سیستم می‌تواند تراکنش ایجاد کند
CREATE POLICY "system_insert_transactions"
ON transactions
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Policy 4: ادمین‌ها می‌توانند تراکنش‌ها را ویرایش کنند
CREATE POLICY "admins_update_transactions"
ON transactions
FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM users WHERE id = (auth.uid())::text) = 'admin'
)
WITH CHECK (
    (SELECT role FROM users WHERE id = (auth.uid())::text) = 'admin'
);

-- نمایش policies جدید
SELECT 
    policyname,
    cmd as command,
    roles
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;
