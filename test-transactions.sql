-- بررسی تراکنش‌های موجود
SELECT 
    t.id,
    t.user_id,
    u.email,
    u.role,
    t.type,
    t.amount,
    t.description,
    t.date
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.date DESC
LIMIT 20;

-- بررسی RLS policies برای transactions
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
WHERE tablename = 'transactions';

-- تعداد تراکنش‌ها به تفکیک نوع
SELECT 
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM transactions
GROUP BY type;
