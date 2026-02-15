# راهنمای رفع مشکل نمایش سفارشات فروشنده

## 🔍 تشخیص مشکل

مشکل از **Row Level Security (RLS)** در Supabase است. سیاست‌های امنیتی جدول `purchase_orders` اجازه نمی‌دهند فروشنده سفارشات خود را ببیند.

## ✅ راه حل

### مرحله 1: بررسی سیاست‌های RLS

1. وارد پنل Supabase شوید
2. به بخش **SQL Editor** بروید
3. کوئری زیر را اجرا کنید:

```sql
-- بررسی سیاست‌های موجود
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'purchase_orders';
```

### مرحله 2: اصلاح سیاست‌های RLS

فایل `supabase/fix-purchase-orders-rls.sql` را در SQL Editor اجرا کنید:

```sql
-- حذف سیاست‌های قبلی
DROP POLICY IF EXISTS "Users can view their own purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Buyers can view their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Sellers can view their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Admins can view all purchase orders" ON purchase_orders;

-- فعال‌سازی RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- سیاست برای خریداران
CREATE POLICY "Buyers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (
    auth.uid() = buyer_id
);

-- سیاست برای فروشندگان
CREATE POLICY "Sellers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (
    auth.uid() = seller_id
);

-- سیاست برای ادمین‌ها
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

-- سیاست برای ایجاد سفارش
CREATE POLICY "Buyers can create purchase orders"
ON purchase_orders
FOR INSERT
WITH CHECK (
    auth.uid() = buyer_id
);

-- سیاست برای بروزرسانی سفارش
CREATE POLICY "Users can update their purchase orders"
ON purchase_orders
FOR UPDATE
USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
);
```

### مرحله 3: بررسی جدول sim_cards

همچنین باید مطمئن شوید که جدول `sim_cards` هم سیاست‌های RLS مناسب دارد:

```sql
-- بررسی سیاست‌های sim_cards
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'sim_cards';

-- اگر سیاست مناسب ندارد، این را اجرا کنید:
DROP POLICY IF EXISTS "Users can view sim cards" ON sim_cards;

CREATE POLICY "Users can view sim cards"
ON sim_cards
FOR SELECT
USING (true);  -- همه می‌توانند سیم‌کارت‌ها را ببینند

CREATE POLICY "Sellers can manage their sim cards"
ON sim_cards
FOR ALL
USING (auth.uid() = seller_id);
```

### مرحله 4: ایجاد activation_request

برای سفارش شماره 58، باید یک `activation_request` ایجاد شود:

```sql
-- بررسی اینکه آیا activation_request وجود دارد
SELECT * FROM activation_requests WHERE purchase_order_id = 58;

-- اگر وجود ندارد، آن را ایجاد کنید:
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
```

### مرحله 5: بررسی سیاست‌های activation_requests

```sql
-- بررسی سیاست‌های activation_requests
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'activation_requests';

-- اگر سیاست مناسب ندارد:
DROP POLICY IF EXISTS "Users can view their activation requests" ON activation_requests;

CREATE POLICY "Buyers can view their activation requests"
ON activation_requests
FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their activation requests"
ON activation_requests
FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their activation requests"
ON activation_requests
FOR UPDATE
USING (auth.uid() = seller_id);
```

## 🧪 تست

بعد از اجرای کوئری‌های بالا:

1. از حساب فروشنده خارج شوید
2. دوباره وارد شوید
3. به داشبورد فروشنده بروید
4. به بخش "خطوط صفر - سفارشات" بروید
5. باید سفارش شماره 58 را ببینید

## 📝 نکات مهم

- **RLS** یک لایه امنیتی است که دسترسی به داده‌ها را کنترل می‌کند
- بدون سیاست‌های مناسب، حتی با کوئری صحیح، داده‌ها نمایش داده نمی‌شوند
- هر جدول باید سیاست‌های مناسب برای SELECT, INSERT, UPDATE, DELETE داشته باشد
- `auth.uid()` شناسه کاربر لاگین شده را برمی‌گرداند

## 🔧 اگر هنوز کار نکرد

اگر بعد از اجرای کوئری‌های بالا هنوز سفارش نمایش داده نشد:

1. کنسول مرورگر را باز کنید (F12)
2. به تب Console بروید
3. لاگ‌های زیر را بررسی کنید:
   - `🔍 Fetching purchase orders`
   - `📦 Purchase orders fetched`
4. اگر خطایی دیدید، آن را برای من ارسال کنید

## 📞 پشتیبانی

اگر مشکل حل نشد، خروجی این کوئری را برای من ارسال کنید:

```sql
-- بررسی کامل
SELECT 
    'Order' as type,
    po.id,
    po.buyer_id,
    po.seller_id,
    po.status,
    sc.number as sim_number
FROM purchase_orders po
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE po.id = 58

UNION ALL

SELECT 
    'Activation Request' as type,
    ar.id,
    ar.buyer_id,
    ar.seller_id,
    ar.status,
    ar.sim_number
FROM activation_requests ar
WHERE ar.purchase_order_id = 58

UNION ALL

SELECT 
    'Seller User' as type,
    u.id,
    NULL,
    NULL,
    u.role,
    u.name
FROM users u
WHERE u.id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';
```
