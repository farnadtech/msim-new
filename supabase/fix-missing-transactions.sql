-- اضافه کردن تراکنش‌های گمشده برای سفارشات تکمیل شده

-- ابتدا بررسی کنیم چند سفارش completed بدون تراکنش داریم
SELECT 
    'سفارشات completed بدون تراکنش' as description,
    COUNT(*) as count
FROM purchase_orders po
WHERE po.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.description LIKE '%سفارش #' || po.id || '%'
);

-- اضافه کردن تراکنش‌های گمشده
INSERT INTO transactions (user_id, type, amount, description, date, created_at)
SELECT 
    po.buyer_id,
    'purchase',
    -po.price,
    'خرید سیمکارت (سفارش #' || po.id || ')',
    po.updated_at,
    po.updated_at
FROM purchase_orders po
WHERE po.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.user_id = po.buyer_id
    AND t.description LIKE '%سفارش #' || po.id || '%'
)
UNION ALL
SELECT 
    po.seller_id,
    'sale',
    po.seller_received_amount,
    'فروش سیمکارت (سفارش #' || po.id || ') - بعد از کسر 2% کمیسیون',
    po.updated_at,
    po.updated_at
FROM purchase_orders po
WHERE po.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.user_id = po.seller_id
    AND t.description LIKE '%سفارش #' || po.id || '%'
);

-- نمایش نتیجه
SELECT 
    'تراکنش‌های اضافه شده' as description,
    COUNT(*) as count
FROM transactions t
WHERE t.created_at > NOW() - INTERVAL '1 minute';
