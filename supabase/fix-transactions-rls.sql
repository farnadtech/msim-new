-- حل مشکل RLS برای جدول transactions

-- حذف پالیسی‌های قبلی
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to insert transactions" ON transactions;

-- اجازه SELECT برای کاربران (فقط تراکنش‌های خودشان)
CREATE POLICY "Users can view their transactions"
ON transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- اجازه SELECT برای ادمین‌ها (همه تراکنش‌ها)
CREATE POLICY "Admins can view all transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- اجازه INSERT برای سیستم (authenticated users)
-- این اجازه می‌دهد که تراکنش‌ها از طریق API ایجاد شوند
CREATE POLICY "Allow authenticated users to insert transactions"
ON transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- اجازه UPDATE برای ادمین‌ها
CREATE POLICY "Admins can update transactions"
ON transactions
FOR UPDATE
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
