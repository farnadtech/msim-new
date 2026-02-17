-- تست نوع user_id در transactions

SELECT 
    'نمونه تراکنش' as info,
    id,
    user_id,
    pg_typeof(user_id) as user_id_type,
    type,
    amount,
    description
FROM transactions
LIMIT 5;

-- بررسی تراکنش‌های یک کاربر خاص
SELECT 
    'تراکنش‌های کاربر خاص' as info,
    COUNT(*) as count
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'::uuid;
