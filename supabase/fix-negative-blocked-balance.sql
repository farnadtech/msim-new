-- اصلاح blocked_balance منفی خریدار

-- مرحله 1: بررسی وضعیت فعلی
SELECT 
    'قبل از اصلاح' as status,
    phone_number,
    wallet_balance,
    blocked_balance
FROM users
WHERE id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- مرحله 2: اصلاح blocked_balance به صفر
-- blocked_balance فعلی: -7,800,000
-- باید به 0 برسد
UPDATE users
SET blocked_balance = 0
WHERE id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- مرحله 3: بررسی وضعیت بعد از اصلاح
SELECT 
    'بعد از اصلاح' as status,
    phone_number,
    wallet_balance,
    blocked_balance
FROM users
WHERE id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- مرحله 4: بررسی تراکنش‌های ثبت شده
SELECT 
    t.id,
    t.type,
    t.amount,
    t.description,
    t.created_at,
    u.phone_number
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE t.description LIKE '%44444422222%'
ORDER BY t.created_at DESC;

-- مرحله 5: بررسی کمیسیون ثبت شده
SELECT 
    id,
    sim_number,
    sale_price,
    commission_amount,
    seller_received_amount,
    seller_name,
    buyer_name,
    created_at
FROM commissions
WHERE sim_number = '44444422222'
ORDER BY created_at DESC;
