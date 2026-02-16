-- غیرفعال کردن کامل RLS برای جدول transactions

-- حذف تمام policies
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to insert transactions" ON transactions;

-- غیرفعال کردن RLS
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- یا اگر می‌خواهید RLS فعال بماند ولی همه دسترسی داشته باشند:
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow all operations for authenticated users"
-- ON transactions
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);
