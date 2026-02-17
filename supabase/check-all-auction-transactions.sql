-- بررسی همه تراکنش‌های مرتبط با حراجی 44444422222

-- همه تراکنش‌های خریدار
SELECT 
    id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
    AND (
        description LIKE '%44444422222%'
        OR description LIKE '%2414%'
    )
ORDER BY created_at DESC;

-- همه تراکنش‌های فروشنده
SELECT 
    id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
    AND (
        description LIKE '%44444422222%'
        OR description LIKE '%2414%'
    )
ORDER BY created_at DESC;
