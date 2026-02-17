-- حذف تراکنش تکراری deposit که بعد از sale ثبت شده

-- نمایش تراکنش قبل از حذف
SELECT 
    id,
    type,
    amount,
    description,
    created_at
FROM transactions
WHERE id = 19796;

-- حذف تراکنش تکراری
DELETE FROM transactions
WHERE id = 19796;

-- بررسی نتیجه
SELECT 
    'تراکنش‌های باقیمانده فروشنده' as info,
    id,
    type,
    amount,
    description
FROM transactions
WHERE user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
    AND description LIKE '%44444422222%'
ORDER BY created_at DESC;
