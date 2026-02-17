-- اضافه کردن تراکنش‌های گمشده برای سیم‌کارت‌های صفر

-- 1. اضافه کردن تراکنش‌های فروشنده که وجود ندارند
INSERT INTO transactions (user_id, type, amount, description, date)
SELECT 
    po.seller_id,
    'sale',
    po.seller_received_amount,
    'فروش سیمکارت صفر ' || sc.number || ' (سفارش #' || po.id || ')',
    po.updated_at
FROM purchase_orders po
INNER JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE po.line_type = 'inactive'
  AND po.status = 'completed'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = po.seller_id
        AND t.type = 'sale'
        AND t.description LIKE '%سفارش #' || po.id || '%'
  );

-- 2. اضافه کردن تراکنش‌های خریدار که وجود ندارند
INSERT INTO transactions (user_id, type, amount, description, date)
SELECT 
    po.buyer_id,
    'purchase',
    -po.price,
    'خرید سیمکارت صفر ' || sc.number || ' (سفارش #' || po.id || ')',
    po.updated_at
FROM purchase_orders po
INNER JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE po.line_type = 'inactive'
  AND po.status = 'completed'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = po.buyer_id
        AND t.type = 'purchase'
        AND t.description LIKE '%سفارش #' || po.id || '%'
  );

-- 3. نمایش نتایج
SELECT 
    'تراکنش‌های اضافه شده' as status,
    COUNT(*) as count
FROM transactions
WHERE description LIKE '%سیمکارت صفر%'
  AND date > NOW() - INTERVAL '1 minute';
