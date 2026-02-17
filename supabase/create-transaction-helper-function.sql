-- ایجاد تابع helper برای دریافت تراکنش‌های کاربر (برای تست و debug)

-- حذف تابع قدیمی اگر وجود داشته باشد
DROP FUNCTION IF EXISTS get_user_transactions(text);

-- ایجاد تابع جدید
CREATE OR REPLACE FUNCTION get_user_transactions(p_user_id text)
RETURNS TABLE (
    id integer,
    user_id text,
    type text,
    amount numeric,
    description text,
    date timestamp with time zone,
    created_at timestamp with time zone
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.description,
        t.date,
        t.created_at
    FROM transactions t
    WHERE t.user_id = p_user_id
    ORDER BY t.created_at DESC;
END;
$$;

-- تست تابع با یک user_id نمونه
SELECT * FROM get_user_transactions('5f4488db-9bed-4162-8925-d187f8bb423d') LIMIT 5;
