-- بررسی و حذف تراکنش‌های تکراری خریدار

-- نمایش همه تراکنش‌های خریدار برای این حراجی
SELECT 
    id,
    type,
    amount,
    description,
    created_at
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
    AND (description LIKE '%44444422222%' OR description LIKE '%2414%')
ORDER BY created_at;

-- حذف تراکنش‌های تکراری (نگه داشتن فقط آخرین تراکنش purchase)
-- اگه بیشتر از یک تراکنش با همون مبلغ و description مشابه داری، قدیمی‌ها رو پاک کن
DELETE FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
    AND (description LIKE '%44444422222%' OR description LIKE '%2414%')
    AND type IN ('debit_blocked', 'withdrawal')
    AND id NOT IN (
        SELECT MAX(id)
        FROM transactions
        WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
            AND (description LIKE '%44444422222%' OR description LIKE '%2414%')
            AND type = 'purchase'
    );

-- نمایش نتیجه نهایی
SELECT 
    'تراکنش‌های باقیمانده خریدار' as info,
    id,
    type,
    amount,
    description,
    created_at
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
    AND (description LIKE '%44444422222%' OR description LIKE '%2414%')
ORDER BY created_at;
