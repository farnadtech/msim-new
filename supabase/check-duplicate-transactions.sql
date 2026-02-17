-- بررسی تراکنش‌های تکراری برای حراجی 44444422222

-- تراکنش‌های خریدار
SELECT 
    id,
    user_id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE description LIKE '%44444422222%'
    AND user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
ORDER BY created_at;

-- تراکنش‌های فروشنده
SELECT 
    id,
    user_id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE description LIKE '%44444422222%'
    AND user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
ORDER BY created_at;

-- بررسی سفارش #2414
SELECT 
    id,
    user_id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE description LIKE '%2414%'
ORDER BY created_at;
