-- حل مشکل RLS برای جدول carriers
-- این فایل باید در Supabase SQL Editor اجرا شود

-- غیرفعال کردن RLS برای جدول carriers
ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;

-- حذف تمام policies قبلی
DROP POLICY IF EXISTS "Anyone can view active carriers" ON carriers;
DROP POLICY IF EXISTS "Admins can manage carriers" ON carriers;

-- اطمینان از وجود داده‌های پیش‌فرض
INSERT INTO carriers (name, name_fa, is_active, display_order) VALUES
('irancell', 'ایرانسل', true, 1),
('mci', 'همراه اول', true, 2),
('rightel', 'رایتل', true, 3)
ON CONFLICT (name) DO NOTHING;

-- نمایش اپراتورهای موجود
SELECT * FROM carriers ORDER BY display_order;
