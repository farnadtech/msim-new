-- ایجاد کمیسیون‌های گذشته از سفارشات تکمیل شده
-- این اسکریپت را در Supabase SQL Editor اجرا کنید

-- مرحله 1: اضافه کردن ستون purchase_order_id اگر وجود ندارد
ALTER TABLE commissions 
ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id);

-- ایجاد index برای بهبود عملکرد
CREATE INDEX IF NOT EXISTS idx_commissions_purchase_order_id ON commissions(purchase_order_id);

-- حذف constraint قدیمی و اضافه کردن constraint جدید با inquiry
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_sale_type_check;
ALTER TABLE commissions ADD CONSTRAINT commissions_sale_type_check 
CHECK (sale_type IN ('fixed', 'auction', 'inquiry'));

-- مرحله 2: بررسی کنیم چند سفارش completed داریم
SELECT COUNT(*) as total_completed_orders 
FROM purchase_orders 
WHERE status = 'completed';

-- بررسی کنیم چند کمیسیون داریم
SELECT COUNT(*) as total_commissions 
FROM commissions;

-- مرحله 3: پیدا کردن سفارشات completed که کمیسیون ندارند
SELECT po.id, po.seller_id, po.price, po.commission_amount, sc.number
FROM purchase_orders po
LEFT JOIN commissions c ON c.purchase_order_id = po.id
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE po.status = 'completed' 
AND c.id IS NULL
ORDER BY po.created_at DESC;

-- مرحله 4: ایجاد کمیسیون‌های گذشته
INSERT INTO commissions (
    purchase_order_id, 
    sim_card_id,
    seller_id, 
    seller_name,
    sim_number, 
    sale_price, 
    commission_amount,
    commission_percentage,
    seller_received_amount,
    sale_type,
    buyer_id,
    buyer_name,
    date,
    created_at
)
SELECT 
    po.id,
    po.sim_card_id,
    po.seller_id,
    COALESCE(seller.email, 'نامشخص'),
    COALESCE(sc.number, ''),
    po.price,
    po.commission_amount,
    2, -- درصد کمیسیون پیش‌فرض
    po.seller_received_amount,
    COALESCE(sc.type, 'fixed'),
    po.buyer_id,
    COALESCE(buyer.email, 'نامشخص'),
    po.updated_at,
    po.updated_at
FROM purchase_orders po
LEFT JOIN commissions c ON c.purchase_order_id = po.id
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
LEFT JOIN users seller ON seller.id = po.seller_id
LEFT JOIN users buyer ON buyer.id = po.buyer_id
WHERE po.status = 'completed' 
AND c.id IS NULL
AND po.commission_amount > 0;

-- مرحله 5: بررسی نتیجه
SELECT COUNT(*) as total_commissions_after 
FROM commissions;

-- نمایش آخرین کمیسیون‌ها
SELECT 
    c.*,
    po.status as order_status
FROM commissions c
LEFT JOIN purchase_orders po ON po.id = c.purchase_order_id
ORDER BY c.created_at DESC 
LIMIT 20;
