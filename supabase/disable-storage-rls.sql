-- غیرفعال کردن RLS برای Storage Buckets
-- این باید در Supabase Dashboard > Storage > Policies اجرا بشه

-- حذف تمام سیاست‌های storage
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;

-- ایجاد سیاست عمومی برای آپلود
CREATE POLICY "Allow all uploads"
ON storage.objects
FOR INSERT
WITH CHECK (true);

-- ایجاد سیاست عمومی برای مشاهده
CREATE POLICY "Allow all access"
ON storage.objects
FOR SELECT
USING (true);

-- ایجاد سیاست عمومی برای حذف
CREATE POLICY "Allow all deletes"
ON storage.objects
FOR DELETE
USING (true);

SELECT '✅ Storage RLS policies updated' as result;
