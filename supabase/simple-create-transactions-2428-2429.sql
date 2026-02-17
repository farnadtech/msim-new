-- ایجاد ساده تراکنش‌ها برای سفارشات 2428 و 2429

-- سفارش 2428
-- خریدار: 5f4488db-9bed-4162-8925-d187f8bb423d
-- فروشنده: d8841504-fb63-41d1-91b0-8cf66f8edf48
-- قیمت: 78887887

INSERT INTO transactions (user_id, type, amount, description, date)
VALUES 
    ('5f4488db-9bed-4162-8925-d187f8bb423d', 'purchase', -78887887, 'خرید سیمکارت (سفارش #2428)', NOW()),
    ('d8841504-fb63-41d1-91b0-8cf66f8edf48', 'sale', 77310129, 'فروش سیمکارت (سفارش #2428)', NOW());

-- سفارش 2429  
-- خریدار: 5f4488db-9bed-4162-8925-d187f8bb423d
-- فروشنده: d8841504-fb63-41d1-91b0-8cf66f8edf48
-- قیمت: 8888888

INSERT INTO transactions (user_id, type, amount, description, date)
VALUES 
    ('5f4488db-9bed-4162-8925-d187f8bb423d', 'purchase', -8888888, 'خرید سیمکارت (سفارش #2429)', NOW()),
    ('d8841504-fb63-41d1-91b0-8cf66f8edf48', 'sale', 8711110, 'فروش سیمکارت (سفارش #2429)', NOW());

-- بررسی نتیجه
SELECT 
    id,
    user_id,
    type,
    amount,
    description,
    date
FROM transactions
WHERE description LIKE '%2428%' OR description LIKE '%2429%'
ORDER BY created_at;
