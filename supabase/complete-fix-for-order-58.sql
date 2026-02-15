-- راه حل کامل برای نمایش سفارش 58 به فروشنده
-- این اسکریپت تمام مشکلات را یکجا حل می‌کند

-- ========================================
-- بخش 1: اصلاح سیاست‌های RLS برای purchase_orders
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their own purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Buyers can view their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Sellers can view their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Admins can view all purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Buyers can create purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can update their purchase orders" ON purchase_orders;

-- فعال‌سازی RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- سیاست برای خریداران (مشاهده سفارشات خود)
CREATE POLICY "Buyers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (auth.uid() = buyer_id);

-- سیاست برای فروشندگان (مشاهده سفارشات خود)
CREATE POLICY "Sellers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (auth.uid() = seller_id);

-- سیاست برای ادمین‌ها (مشاهده همه سفارشات)
CREATE POLICY "Admins can view all purchase orders"
ON purchase_orders
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- سیاست برای ایجاد سفارش (خریداران)
CREATE POLICY "Buyers can create purchase orders"
ON purchase_orders
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- سیاست برای بروزرسانی سفارش
CREATE POLICY "Users can update their purchase orders"
ON purchase_orders
FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ========================================
-- بخش 2: اصلاح سیاست‌های RLS برای sim_cards
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Sellers can manage their sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Public can view available sim cards" ON sim_cards;

-- فعال‌سازی RLS
ALTER TABLE sim_cards ENABLE ROW LEVEL SECURITY;

-- همه می‌توانند سیم‌کارت‌های موجود را ببینند
CREATE POLICY "Public can view available sim cards"
ON sim_cards
FOR SELECT
USING (true);

-- فروشندگان می‌توانند سیم‌کارت‌های خود را مدیریت کنند
CREATE POLICY "Sellers can manage their sim cards"
ON sim_cards
FOR ALL
USING (auth.uid() = seller_id);

-- ========================================
-- بخش 3: اصلاح سیاست‌های RLS برای activation_requests
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Buyers can view their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Sellers can view their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Sellers can update their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Admins can view all activation requests" ON activation_requests;

-- فعال‌سازی RLS
ALTER TABLE activation_requests ENABLE ROW LEVEL SECURITY;

-- خریداران می‌توانند درخواست‌های خود را ببینند
CREATE POLICY "Buyers can view their activation requests"
ON activation_requests
FOR SELECT
USING (auth.uid() = buyer_id);

-- فروشندگان می‌توانند درخواست‌های خود را ببینند
CREATE POLICY "Sellers can view their activation requests"
ON activation_requests
FOR SELECT
USING (auth.uid() = seller_id);

-- فروشندگان می‌توانند درخواست‌های خود را بروزرسانی کنند
CREATE POLICY "Sellers can update their activation requests"
ON activation_requests
FOR UPDATE
USING (auth.uid() = seller_id);

-- ادمین‌ها می‌توانند همه درخواست‌ها را ببینند
CREATE POLICY "Admins can view all activation requests"
ON activation_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ========================================
-- بخش 4: ایجاد activation_request برای سفارش 58
-- ========================================

-- ایجاد activation_request اگر وجود ندارد
INSERT INTO activation_requests (
    purchase_order_id,
    sim_card_id,
    buyer_id,
    seller_id,
    sim_number,
    buyer_name,
    seller_name,
    status
)
SELECT 
    po.id,
    po.sim_card_id,
    po.buyer_id,
    po.seller_id,
    sc.number,
    u_buyer.name,
    u_seller.name,
    'pending'
FROM purchase_orders po
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
LEFT JOIN users u_buyer ON u_buyer.id = po.buyer_id
LEFT JOIN users u_seller ON u_seller.id = po.seller_id
WHERE po.id = 58
AND NOT EXISTS (
    SELECT 1 FROM activation_requests WHERE purchase_order_id = 58
);

-- ========================================
-- بخش 5: بررسی نتیجه
-- ========================================

-- نمایش سیاست‌های purchase_orders
SELECT 'purchase_orders policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'purchase_orders';

-- نمایش سیاست‌های sim_cards
SELECT 'sim_cards policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'sim_cards';

-- نمایش سیاست‌های activation_requests
SELECT 'activation_requests policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'activation_requests';

-- بررسی سفارش 58
SELECT 'Order 58 details:' as info;
SELECT 
    po.id,
    po.buyer_id,
    po.seller_id,
    po.status,
    po.line_type,
    sc.number as sim_number,
    u_buyer.name as buyer_name,
    u_seller.name as seller_name
FROM purchase_orders po
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
LEFT JOIN users u_buyer ON u_buyer.id = po.buyer_id
LEFT JOIN users u_seller ON u_seller.id = po.seller_id
WHERE po.id = 58;

-- بررسی activation_request
SELECT 'Activation request for order 58:' as info;
SELECT * FROM activation_requests WHERE purchase_order_id = 58;

-- ========================================
-- ✅ تمام!
-- ========================================
-- حالا از حساب فروشنده خارج شوید و دوباره وارد شوید
-- سپس به داشبورد فروشنده > خطوط صفر - سفارشات بروید
-- باید سفارش 58 را ببینید
