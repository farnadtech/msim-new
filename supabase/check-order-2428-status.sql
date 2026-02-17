-- بررسی وضعیت سفارش 2428

SELECT 
    id,
    buyer_id,
    seller_id,
    sim_card_id,
    status,
    price,
    commission_amount,
    seller_received_amount,
    buyer_blocked_amount,
    line_type,
    created_at,
    updated_at
FROM purchase_orders
WHERE id = 2428;

-- بررسی تراکنش‌های مرتبط
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
ORDER BY created_at;
