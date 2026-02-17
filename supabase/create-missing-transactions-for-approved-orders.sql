-- ایجاد تراکنش‌های گمشده برای سفارشات 2428 و 2429

-- بررسی وضعیت سفارشات
SELECT 
    po.id,
    po.status,
    po.buyer_id,
    po.seller_id,
    po.price,
    po.seller_received_amount,
    ar.status as activation_status
FROM purchase_orders po
LEFT JOIN activation_requests ar ON ar.purchase_order_id = po.id
WHERE po.id IN (2428, 2429);

-- اگه سفارشات هنوز completed نیستن، باید وضعیتشون رو تغییر بدیم و تراکنش‌ها رو ایجاد کنیم

-- برای سفارش 2428
DO $$
DECLARE
    v_order RECORD;
BEGIN
    -- دریافت اطلاعات سفارش
    SELECT * INTO v_order FROM purchase_orders WHERE id = 2428;
    
    IF v_order.status != 'completed' THEN
        -- تغییر وضعیت به completed
        UPDATE purchase_orders SET status = 'completed', updated_at = NOW() WHERE id = 2428;
        
        -- کم کردن blocked_balance خریدار
        UPDATE users 
        SET blocked_balance = blocked_balance - v_order.buyer_blocked_amount
        WHERE id = v_order.buyer_id;
        
        -- افزایش wallet_balance فروشنده
        UPDATE users 
        SET wallet_balance = wallet_balance + v_order.seller_received_amount
        WHERE id = v_order.seller_id;
        
        -- ایجاد تراکنش purchase برای خریدار
        INSERT INTO transactions (user_id, type, amount, description, date)
        VALUES (
            v_order.buyer_id,
            'purchase',
            -v_order.price,
            'خرید سیمکارت (سفارش #2428)',
            NOW()
        );
        
        -- ایجاد تراکنش sale برای فروشنده
        INSERT INTO transactions (user_id, type, amount, description, date)
        VALUES (
            v_order.seller_id,
            'sale',
            v_order.seller_received_amount,
            'فروش سیمکارت (سفارش #2428)',
            NOW()
        );
        
        -- تغییر وضعیت سیمکارت به sold
        UPDATE sim_cards 
        SET status = 'sold', sold_date = NOW()
        WHERE id = v_order.sim_card_id;
        
        RAISE NOTICE 'سفارش 2428 تکمیل شد و تراکنش‌ها ایجاد شدند';
    ELSE
        RAISE NOTICE 'سفارش 2428 قبلاً تکمیل شده است';
    END IF;
END $$;

-- برای سفارش 2429
DO $$
DECLARE
    v_order RECORD;
BEGIN
    -- دریافت اطلاعات سفارش
    SELECT * INTO v_order FROM purchase_orders WHERE id = 2429;
    
    IF v_order.status != 'completed' THEN
        -- تغییر وضعیت به completed
        UPDATE purchase_orders SET status = 'completed', updated_at = NOW() WHERE id = 2429;
        
        -- کم کردن blocked_balance خریدار
        UPDATE users 
        SET blocked_balance = blocked_balance - v_order.buyer_blocked_amount
        WHERE id = v_order.buyer_id;
        
        -- افزایش wallet_balance فروشنده
        UPDATE users 
        SET wallet_balance = wallet_balance + v_order.seller_received_amount
        WHERE id = v_order.seller_id;
        
        -- ایجاد تراکنش purchase برای خریدار
        INSERT INTO transactions (user_id, type, amount, description, date)
        VALUES (
            v_order.buyer_id,
            'purchase',
            -v_order.price,
            'خرید سیمکارت (سفارش #2429)',
            NOW()
        );
        
        -- ایجاد تراکنش sale برای فروشنده
        INSERT INTO transactions (user_id, type, amount, description, date)
        VALUES (
            v_order.seller_id,
            'sale',
            v_order.seller_received_amount,
            'فروش سیمکارت (سفارش #2429)',
            NOW()
        );
        
        -- تغییر وضعیت سیمکارت به sold
        UPDATE sim_cards 
        SET status = 'sold', sold_date = NOW()
        WHERE id = v_order.sim_card_id;
        
        RAISE NOTICE 'سفارش 2429 تکمیل شد و تراکنش‌ها ایجاد شدند';
    ELSE
        RAISE NOTICE 'سفارش 2429 قبلاً تکمیل شده است';
    END IF;
END $$;

-- بررسی نتیجه
SELECT 
    'سفارش' as type,
    id,
    status,
    updated_at
FROM purchase_orders 
WHERE id IN (2428, 2429);

SELECT 
    'تراکنش‌های خریدار' as type,
    id,
    type,
    amount,
    description
FROM transactions
WHERE description LIKE '%2428%' OR description LIKE '%2429%'
ORDER BY created_at;
