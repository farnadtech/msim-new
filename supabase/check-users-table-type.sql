-- بررسی نوع ستون id در جدول users

SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name IN ('users', 'transactions')
    AND column_name IN ('id', 'user_id')
ORDER BY table_name, column_name;
