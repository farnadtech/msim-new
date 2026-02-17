-- حل مشکل سفارشات تکراری برای شماره 44444422222

-- 1. بررسی تمام سفارشات این شماره
SELECT 
    po.id,
    po.sim_card_id,
    po.buyer_id,
    po.seller_id,
    po.status,
    po.created_at,
    sc.number as sim_number
FROM purchase_orders po
JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE sc.number = '44444422222'
ORDER BY po.created_at DESC;

-- 2. نگه داشتن فقط اولین سفارش و حذف بقیه
-- ابتدا ID اولین سفارش را پیدا می‌کنیم
WITH first_order AS (
    SELECT po.id
    FROM purchase_orders po
    JOIN sim_cards sc ON sc.id = po.sim_card_id
    WHERE sc.number = '44444422222'
    ORDER BY po.created_at ASC
    LIMIT 1
)
-- حذف activation_requests مربوط به سفارشات تکراری
DELETE FROM activation_requests
WHERE purchase_order_id IN (
    SELECT po.id
    FROM purchase_orders po
    JOIN sim_cards sc ON sc.id = po.sim_card_id
    WHERE sc.number = '44444422222'
    AND po.id NOT IN (SELECT id FROM first_order)
);

-- 3. حذف سفارشات تکراری
WITH first_order AS (
    SELECT po.id
    FROM purchase_orders po
    JOIN sim_cards sc ON sc.id = po.sim_card_id
    WHERE sc.number = '44444422222'
    ORDER BY po.created_at ASC
    LIMIT 1
)
DELETE FROM purchase_orders
WHERE id IN (
    SELECT po.id
    FROM purchase_orders po
    JOIN sim_cards sc ON sc.id = po.sim_card_id
    WHERE sc.number = '44444422222'
    AND po.id NOT IN (SELECT id FROM first_order)
);

-- 4. بررسی نتیجه
SELECT 
    po.id,
    po.status,
    po.created_at,
    sc.number as sim_number
FROM purchase_orders po
JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE sc.number = '44444422222';
