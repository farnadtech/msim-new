-- راه حل نهایی برای مشکل نمایش تراکنش‌ها در پنل فروشنده و خریدار
-- این اسکریپت همه مشکلات احتمالی را بررسی و حل می‌کند

-- ==========================================
-- بخش 1: بررسی وضعیت فعلی
-- ==========================================

DO $$
DECLARE
    rls_status boolean;
    policy_count integer;
    transaction_count integer;
BEGIN
    -- بررسی وضعیت RLS
    SELECT relrowsecurity INTO rls_status
    FROM pg_class
    WHERE relname = 'transactions';
    
    RAISE NOTICE 'وضعیت RLS: %', CASE WHEN rls_status THEN 'فعال' ELSE 'غیرفعال' END;
    
    -- تعداد policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'transactions';
    
    RAISE NOTICE 'تعداد policies: %', policy_count;
    
    -- تعداد تراکنش‌ها
    SELECT COUNT(*) INTO transaction_count
    FROM transactions;
    
    RAISE NOTICE 'تعداد کل تراکنش‌ها: %', transaction_count;
END $$;

-- ==========================================
-- بخش 2: پاکسازی policies قدیمی
-- ==========================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', policy_record.policyname);
        RAISE NOTICE 'حذف policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- ==========================================
-- بخش 3: تنظیم RLS و ایجاد policies جدید
-- ==========================================

-- فعال کردن RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: کاربران می‌توانند تراکنش‌های خود را ببینند
CREATE POLICY "users_view_own_transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
    user_id = (auth.uid())::text
);

-- Policy 2: ادمین‌ها می‌توانند همه تراکنش‌ها را ببینند
CREATE POLICY "admins_view_all_transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (auth.uid())::text
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
        WHERE users.id = (auth.uid())::text
        AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (auth.uid())::text
        AND users.role = 'admin'
    )
);

-- ==========================================
-- بخش 4: ایجاد تابع helper برای دریافت تراکنش‌ها
-- ==========================================

CREATE OR REPLACE FUNCTION get_my_transactions()
RETURNS TABLE (
    id integer,
    user_id text,
    type text,
    amount numeric,
    description text,
    date timestamp with time zone,
    created_at timestamp with time zone
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.description,
        t.date,
        t.created_at
    FROM transactions t
    WHERE t.user_id = (auth.uid())::text
    ORDER BY t.created_at DESC;
END;
$$;

-- ==========================================
-- بخش 5: تست و بررسی نهایی
-- ==========================================

-- نمایش policies جدید
SELECT 
    '✅ Policies جدید' as status,
    policyname,
    cmd as command,
    roles
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- نمایش تعداد تراکنش‌های هر کاربر
SELECT 
    '📊 آمار تراکنش‌ها' as status,
    user_id,
    COUNT(*) as transaction_count,
    MAX(created_at) as last_transaction
FROM transactions
GROUP BY user_id
ORDER BY transaction_count DESC;

-- پیام نهایی
DO $$
BEGIN
    RAISE NOTICE '✅ تنظیمات با موفقیت اعمال شد!';
    RAISE NOTICE '📝 حالا کاربران می‌توانند تراکنش‌های خود را ببینند';
    RAISE NOTICE '👑 ادمین‌ها می‌توانند همه تراکنش‌ها را ببینند';
END $$;
