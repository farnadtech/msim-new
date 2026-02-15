-- 🔍 تشخیص دقیق مشکل - مرحله به مرحله
-- این کوئری‌ها را یکی یکی اجرا کنید و نتیجه هر کدام را برای من بفرستید

-- ========================================
-- مرحله 1: بررسی سفارش 58
-- ========================================
SELECT '=== مرحله 1: بررسی سفارش 58 ===' as step;

SELECT 
    id,
    sim_card_id,
    buyer_id,
    seller_id,
    status,
    line_type,
    price,
    created_at
FROM purchase_orders 
WHERE id = 58;

-- ========================================
-- مرحله 2: بررسی اطلاعات فروشنده
-- ========================================
SELECT '=== مرحله 2: اطلاعات فروشنده ===' as step;

SELECT 
    id,
    name,
    email,
    role,
    phone_number
FROM users 
WHERE id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';

-- ========================================
-- مرحله 3: بررسی سیم‌کارت
-- ========================================
SELECT '=== مرحله 3: اطلاعات سیم‌کارت ===' as step;

SELECT 
    sc.id,
    sc.number,
    sc.seller_id,
    sc.status,
    sc.is_active
FROM sim_cards sc
WHERE sc.id = 131;

-- ========================================
-- مرحله 4: بررسی سیاست‌های RLS
-- ========================================
SELECT '=== مرحله 4: سیاست‌های purchase_orders ===' as step;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has condition'
        ELSE 'No condition'
    END as has_condition
FROM pg_policies 
WHERE tablename = 'purchase_orders'
ORDER BY cmd, policyname;

-- ========================================
-- مرحله 5: تست دسترسی مستقیم
-- ========================================
SELECT '=== مرحله 5: تست دسترسی مستقیم ===' as step;

-- این کوئری باید سفارش را برگرداند (بدون RLS)
SELECT COUNT(*) as total_orders
FROM purchase_orders 
WHERE seller_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';

-- ========================================
-- مرحله 6: بررسی activation_request
-- ========================================
SELECT '=== مرحله 6: activation_request ===' as step;

SELECT 
    id,
    purchase_order_id,
    seller_id,
    buyer_id,
    status,
    sim_number
FROM activation_requests 
WHERE purchase_order_id = 58;

-- ========================================
-- مرحله 7: بررسی RLS فعال است یا نه
-- ========================================
SELECT '=== مرحله 7: وضعیت RLS ===' as step;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('purchase_orders', 'sim_cards', 'activation_requests');

-- ========================================
-- مرحله 8: تست کوئری با JOIN (مثل کد)
-- ========================================
SELECT '=== مرحله 8: تست کوئری با JOIN ===' as step;

SELECT 
    po.id,
    po.seller_id,
    po.buyer_id,
    po.status,
    sc.number as sim_number
FROM purchase_orders po
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE po.id = 58;

-- ========================================
-- ✅ نتیجه‌گیری
-- ========================================
SELECT '=== ✅ اگر همه مراحل بالا نتیجه دادند، مشکل از کد است نه دیتابیس ===' as conclusion;
