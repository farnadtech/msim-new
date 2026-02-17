-- اصلاح پرداخت حراجی 44444422222

-- مرحله 1: حذف تراکنش‌های تکراری (نگه داشتن فقط اولین تراکنش)
DELETE FROM transactions
WHERE id IN (
    18340, 18329, 18312, 18308, 18300, 18279, 18275, 18254, 18247, 18245, 18221, 18204, 18074
);
-- فقط تراکنش 5343 باقی می‌ماند

-- مرحله 2: اصلاح blocked_balance خریدار
-- باید 44,200,000 - 52,000,000 = -7,800,000 شود (13 تراکنش اضافی × 4,000,000)
-- یعنی باید blocked_balance را 52,000,000 کم کنیم
UPDATE users
SET blocked_balance = blocked_balance - 52000000
WHERE id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- مرحله 3: کم کردن پول از wallet خریدار
UPDATE users
SET wallet_balance = wallet_balance - 4000000
WHERE id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- مرحله 4: اضافه کردن پول به wallet فروشنده
UPDATE users
SET wallet_balance = wallet_balance + 3920000
WHERE id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';

-- مرحله 5: ثبت تراکنش withdrawal برای خریدار
INSERT INTO transactions (user_id, type, amount, description, date)
VALUES (
    '5f4488db-9bed-4162-8925-d187f8bb423d',
    'withdrawal',
    -4000000,
    'پرداخت نهایی حراجی سیمکارت 44444422222',
    NOW()
);

-- مرحله 6: ثبت تراکنش deposit برای فروشنده
INSERT INTO transactions (user_id, type, amount, description, date)
VALUES (
    'd8841504-fb63-41d1-91b0-8cf66f8edf48',
    'deposit',
    3920000,
    'دریافت پول از فروش حراجی سیمکارت 44444422222',
    NOW()
);

-- مرحله 7: ثبت کمیسیون سایت
INSERT INTO commissions (
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
    date
)
SELECT 
    sc.id,
    'd8841504-fb63-41d1-91b0-8cf66f8edf48',
    seller.phone_number,
    '44444422222',
    4000000,
    80000,
    2,
    3920000,
    'auction',
    '5f4488db-9bed-4162-8925-d187f8bb423d',
    buyer.phone_number,
    NOW()
FROM sim_cards sc
CROSS JOIN users seller
CROSS JOIN users buyer
WHERE sc.number = '44444422222'
    AND seller.id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
    AND buyer.id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- مرحله 8: بررسی نتیجه
SELECT 
    'خریدار' as user_type,
    phone_number,
    wallet_balance,
    blocked_balance
FROM users
WHERE id = '5f4488db-9bed-4162-8925-d187f8bb423d'
UNION ALL
SELECT 
    'فروشنده' as user_type,
    phone_number,
    wallet_balance,
    blocked_balance
FROM users
WHERE id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';

-- مرحله 9: بررسی تراکنش‌ها
SELECT 
    t.type,
    t.amount,
    t.description,
    u.phone_number
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE t.description LIKE '%44444422222%'
ORDER BY t.created_at DESC
LIMIT 5;
