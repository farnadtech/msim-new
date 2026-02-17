-- بررسی مجدد همه تراکنش‌های سفارش 2428

-- 1. وضعیت سفارش
SELECT 
    id,
    status,
    buyer_id,
    seller_id,
    price,
    created_at,
    updated_at
FROM purchase_orders
WHERE id = 2428;

-- 2. همه تراکنش‌های خریدار
SELECT 
    id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
    AND (description LIKE '%2428%' OR created_at > '2026-02-17 09:51:00')
ORDER BY created_at DESC;

-- 3. همه تراکنش‌های فروشنده
SELECT 
    id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
    AND (description LIKE '%2428%' OR created_at > '2026-02-17 09:51:00')
ORDER BY created_at DESC;

-- 4. بررسی کمیسیون
SELECT 
    id,
    purchase_order_id,
    sale_price,
    commission_amount,
    seller_received_amount,
    created_at
FROM commissions
WHERE purchase_order_id = 2428;
