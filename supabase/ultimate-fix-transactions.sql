-- حل نهایی با پشتیبانی از هر دو نوع UUID و TEXT

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
-- استفاده از CAST برای تبدیل UUID به TEXT
CREATE POLICY "users_view_own_transactions"
ON transactions
FOR SELECT
TO authenticated
USING (user_id = CAST(auth.uid() AS TEXT));

-- Policy 2: ادمین‌ها می‌توانند همه تراکنش‌ها را ببینند
CREATE POLICY "admins_view_all_transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE CAST(users.id AS TEXT) = CAST(auth.uid() AS TEXT)
        AND users.role = 'admin'
    )
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
    EXISTS (
        SELECT 1 FROM users 
        WHERE CAST(users.id AS TEXT) = CAST(auth.uid() AS TEXT)
        AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE CAST(users.id AS TEXT) = CAST(auth.uid() AS TEXT)
        AND users.role = 'admin'
    )
);

-- نمایش policies جدید
SELECT 
    policyname,
    cmd as command,
    roles
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;
