-- بررسی سفارش 2428 و تراکنش‌های مرتبط

-- اطلاعات سفارش
SELECT 
    id,
    buyer_id,
    seller_id,
    sim_card_id,
    status,
    price,
    line_type,
    created_at
FROM purchase_orders
WHERE id = 2428;

-- تراکنش‌های مرتبط با سفارش 2428
SELECT 
    id,
    user_id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE description LIKE '%2428%'
ORDER BY created_at DESC;

-- فیکس تراکنش‌های debit_blocked که مبلغشون مثبته (باید منفی باشن)
UPDATE transactions
SET amount = -ABS(amount)
WHERE type = 'debit_blocked' 
    AND amount > 0
    AND description LIKE '%بلوک پول برای خرید سیمکارت%';

-- نمایش تراکنش‌های فیکس شده
SELECT 
    id,
    user_id,
    type,
    amount,
    description,
    date
FROM transactions
WHERE type = 'debit_blocked'
    AND description LIKE '%بلوک پول برای خرید سیمکارت%'
ORDER BY created_at DESC
LIMIT 20;
