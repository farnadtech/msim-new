-- بررسی کامل سفارش 1445

-- 1. بررسی activation_request
SELECT 
    'Activation Request' as table_name,
    ar.id,
    ar.purchase_order_id,
    ar.sim_number,
    ar.delivery_method,
    ar.activation_code,
    ar.status,
    ar.delivery_address,
    ar.delivery_city,
    ar.delivery_postal_code,
    ar.buyer_phone
FROM activation_requests ar
WHERE ar.purchase_order_id = 1445;

-- 2. بررسی purchase_order
SELECT 
    'Purchase Order' as table_name,
    po.id,
    po.status,
    po.line_type,
    po.buyer_id,
    po.seller_id,
    po.price
FROM purchase_orders po
WHERE po.id = 1445;

-- 3. اگر delivery_method برابر با physical_card است، کد فعال‌سازی نباید به خریدار نشون داده بشه
-- اگر delivery_method برابر با activation_code است، کد فعال‌سازی باید به خریدار نشون داده بشه
