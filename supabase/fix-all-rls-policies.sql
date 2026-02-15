-- 🔧 اصلاح کامل تمام سیاست‌های RLS
-- این اسکریپت تمام مشکلات RLS را یکجا حل می‌کند

-- ========================================
-- بخش 1: sim_cards
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Sellers can manage their sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Public can view available sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Sellers can insert sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Sellers can update their sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Sellers can delete their sim cards" ON sim_cards;
DROP POLICY IF EXISTS "Anyone can view sim cards" ON sim_cards;

-- فعال‌سازی RLS
ALTER TABLE sim_cards ENABLE ROW LEVEL SECURITY;

-- همه می‌توانند سیم‌کارت‌ها را ببینند (برای نمایش در لیست)
CREATE POLICY "Anyone can view sim cards"
ON sim_cards
FOR SELECT
USING (true);

-- فروشندگان می‌توانند سیم‌کارت اضافه کنند
CREATE POLICY "Sellers can insert sim cards"
ON sim_cards
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- فروشندگان می‌توانند سیم‌کارت‌های خود را بروزرسانی کنند
CREATE POLICY "Sellers can update their sim cards"
ON sim_cards
FOR UPDATE
USING (auth.uid() = seller_id);

-- فروشندگان می‌توانند سیم‌کارت‌های خود را حذف کنند
CREATE POLICY "Sellers can delete their sim cards"
ON sim_cards
FOR DELETE
USING (auth.uid() = seller_id);

-- ========================================
-- بخش 2: purchase_orders
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

-- خریداران می‌توانند سفارشات خود را ببینند
CREATE POLICY "Buyers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (auth.uid() = buyer_id);

-- فروشندگان می‌توانند سفارشات خود را ببینند
CREATE POLICY "Sellers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (auth.uid() = seller_id);

-- ادمین‌ها می‌توانند همه سفارشات را ببینند
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

-- خریداران می‌توانند سفارش ایجاد کنند
CREATE POLICY "Buyers can create purchase orders"
ON purchase_orders
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- خریداران و فروشندگان می‌توانند سفارشات خود را بروزرسانی کنند
CREATE POLICY "Users can update their purchase orders"
ON purchase_orders
FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ========================================
-- بخش 3: activation_requests
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Buyers can view their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Sellers can view their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Sellers can update their activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Admins can view all activation requests" ON activation_requests;
DROP POLICY IF EXISTS "System can create activation requests" ON activation_requests;

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

-- سیستم می‌تواند activation_request ایجاد کند (برای purchaseSim)
CREATE POLICY "System can create activation requests"
ON activation_requests
FOR INSERT
WITH CHECK (true);

-- ========================================
-- بخش 4: transactions
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;

-- فعال‌سازی RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- کاربران می‌توانند تراکنش‌های خود را ببینند
CREATE POLICY "Users can view their transactions"
ON transactions
FOR SELECT
USING (auth.uid() = user_id);

-- ادمین‌ها می‌توانند همه تراکنش‌ها را ببینند
CREATE POLICY "Admins can view all transactions"
ON transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- سیستم می‌تواند تراکنش ایجاد کند
CREATE POLICY "System can create transactions"
ON transactions
FOR INSERT
WITH CHECK (true);

-- ========================================
-- بخش 5: users
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Public can view user names" ON users;

-- فعال‌سازی RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- کاربران می‌توانند پروفایل خود را ببینند
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
USING (auth.uid() = id);

-- کاربران می‌توانند پروفایل خود را بروزرسانی کنند
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
USING (auth.uid() = id);

-- ادمین‌ها می‌توانند همه کاربران را ببینند
CREATE POLICY "Admins can view all users"
ON users
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
);

-- ادمین‌ها می‌توانند همه کاربران را بروزرسانی کنند
CREATE POLICY "Admins can update all users"
ON users
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
);

-- همه می‌توانند نام کاربران را ببینند (برای نمایش در لیست‌ها)
CREATE POLICY "Public can view user names"
ON users
FOR SELECT
USING (true);

-- ========================================
-- بخش 6: notifications
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- فعال‌سازی RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- کاربران می‌توانند نوتیفیکیشن‌های خود را ببینند
CREATE POLICY "Users can view their notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- کاربران می‌توانند نوتیفیکیشن‌های خود را بروزرسانی کنند (برای علامت‌گذاری به عنوان خوانده شده)
CREATE POLICY "Users can update their notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- سیستم می‌تواند نوتیفیکیشن ایجاد کند
CREATE POLICY "System can create notifications"
ON notifications
FOR INSERT
WITH CHECK (true);

-- ========================================
-- بخش 7: auction_details
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Anyone can view auction details" ON auction_details;
DROP POLICY IF EXISTS "System can manage auction details" ON auction_details;

-- فعال‌سازی RLS
ALTER TABLE auction_details ENABLE ROW LEVEL SECURITY;

-- همه می‌توانند جزئیات حراجی را ببینند
CREATE POLICY "Anyone can view auction details"
ON auction_details
FOR SELECT
USING (true);

-- سیستم می‌تواند جزئیات حراجی را مدیریت کند
CREATE POLICY "System can manage auction details"
ON auction_details
FOR ALL
USING (true);

-- ========================================
-- بخش 8: bids
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Anyone can view bids" ON bids;
DROP POLICY IF EXISTS "Users can create bids" ON bids;

-- فعال‌سازی RLS
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- همه می‌توانند پیشنهادات را ببینند
CREATE POLICY "Anyone can view bids"
ON bids
FOR SELECT
USING (true);

-- کاربران می‌توانند پیشنهاد ثبت کنند
CREATE POLICY "Users can create bids"
ON bids
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- بخش 9: payment_receipts
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their payment receipts" ON payment_receipts;
DROP POLICY IF EXISTS "Admins can view all payment receipts" ON payment_receipts;
DROP POLICY IF EXISTS "Admins can update payment receipts" ON payment_receipts;
DROP POLICY IF EXISTS "Users can create payment receipts" ON payment_receipts;

-- فعال‌سازی RLS
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- کاربران می‌توانند رسیدهای خود را ببینند
CREATE POLICY "Users can view their payment receipts"
ON payment_receipts
FOR SELECT
USING (auth.uid() = user_id);

-- ادمین‌ها می‌توانند همه رسیدها را ببینند
CREATE POLICY "Admins can view all payment receipts"
ON payment_receipts
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ادمین‌ها می‌توانند رسیدها را بروزرسانی کنند (تایید/رد)
CREATE POLICY "Admins can update payment receipts"
ON payment_receipts
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- کاربران می‌توانند رسید ایجاد کنند
CREATE POLICY "Users can create payment receipts"
ON payment_receipts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- بخش 10: support_messages
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view messages for their orders" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages" ON support_messages;

-- فعال‌سازی RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- کاربران می‌توانند پیام‌های مربوط به سفارشات خود را ببینند
CREATE POLICY "Users can view messages for their orders"
ON support_messages
FOR SELECT
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- کاربران می‌توانند پیام ارسال کنند
CREATE POLICY "Users can create messages"
ON support_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- ========================================
-- بخش 11: packages
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Anyone can view packages" ON packages;
DROP POLICY IF EXISTS "Admins can manage packages" ON packages;

-- فعال‌سازی RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- همه می‌توانند پکیج‌ها را ببینند
CREATE POLICY "Anyone can view packages"
ON packages
FOR SELECT
USING (true);

-- ادمین‌ها می‌توانند پکیج‌ها را مدیریت کنند
CREATE POLICY "Admins can manage packages"
ON packages
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ========================================
-- بخش 12: commissions
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Admins can view all commissions" ON commissions;
DROP POLICY IF EXISTS "System can create commissions" ON commissions;

-- فعال‌سازی RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- ادمین‌ها می‌توانند همه کمیسیون‌ها را ببینند
CREATE POLICY "Admins can view all commissions"
ON commissions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- سیستم می‌تواند کمیسیون ایجاد کند
CREATE POLICY "System can create commissions"
ON commissions
FOR INSERT
WITH CHECK (true);

-- ========================================
-- بخش 13: secure_payments
-- ========================================

-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their secure payments" ON secure_payments;
DROP POLICY IF EXISTS "Admins can view all secure payments" ON secure_payments;
DROP POLICY IF EXISTS "System can manage secure payments" ON secure_payments;

-- فعال‌سازی RLS
ALTER TABLE secure_payments ENABLE ROW LEVEL SECURITY;

-- کاربران می‌توانند پرداخت‌های امن خود را ببینند
CREATE POLICY "Users can view their secure payments"
ON secure_payments
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ادمین‌ها می‌توانند همه پرداخت‌های امن را ببینند
CREATE POLICY "Admins can view all secure payments"
ON secure_payments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- سیستم می‌تواند پرداخت‌های امن را مدیریت کند
CREATE POLICY "System can manage secure payments"
ON secure_payments
FOR ALL
USING (true);

-- ========================================
-- ✅ تمام!
-- ========================================

SELECT '✅ تمام سیاست‌های RLS با موفقیت اعمال شدند!' as result;

-- نمایش تعداد سیاست‌های هر جدول
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
