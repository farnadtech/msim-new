-- بررسی سفارش 1445

-- بررسی activation_request
SELECT 
    ar.id,
    ar.purchase_order_id,
    ar.sim_number,
    ar.delivery_method,
    ar.activation_code,
    ar.status,
    ar.delivery_address,
    ar.delivery_city,
    ar.buyer_phone
FROM activation_requests ar
WHERE ar.purchase_order_id = 1445;

-- بررسی purchase_order
SELECT 
    po.id,
    po.status,
    po.line_type,
    po.buyer_id,
    po.seller_id
FROM purchase_orders po
WHERE po.id = 1445;
