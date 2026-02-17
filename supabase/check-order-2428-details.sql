-- بررسی کامل سفارش 2428

-- 1. اطلاعات سفارش
SELECT 
    po.id,
    po.buyer_id,
    po.seller_id,
    po.sim_card_id,
    po.status,
    po.price,
    po.line_type,
    po.created_at,
    po.updated_at,
    -- اطلاعات سیمکارت
    sc.number as sim_number,
    sc.carrier,
    -- اطلاعات خریدار
    bu.name as buyer_name,
    bu.email as buyer_email,
    -- اطلاعات فروشنده
    su.name as seller_name,
    su.email as seller_email
FROM purchase_orders po
LEFT JOIN sim_cards sc ON po.sim_card_id = sc.id
LEFT JOIN users bu ON po.buyer_id = bu.id
LEFT JOIN users su ON po.seller_id = su.id
WHERE po.id = 2428;

-- 2. همه تراکنش‌های مرتبط با سفارش 2428
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

-- 3. بررسی activation_requests
SELECT 
    id,
    purchase_order_id,
    buyer_id,
    seller_id,
    status,
    created_at
FROM activation_requests
WHERE purchase_order_id = 2428;
