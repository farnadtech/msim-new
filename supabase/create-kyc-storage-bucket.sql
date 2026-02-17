-- ⚠️ توجه: این فایل شامل دستورات دستی است که باید از Supabase Dashboard اجرا شوند
-- برای ایجاد Storage Bucket از مراحل زیر استفاده کنید:

/*
===========================================
مرحله 1: ایجاد Bucket از Dashboard
===========================================

1. به Supabase Dashboard بروید
2. از منوی سمت چپ، Storage را انتخاب کنید
3. روی "New bucket" کلیک کنید
4. تنظیمات زیر را وارد کنید:
   - Name: kyc-documents
   - Public bucket: ✓ (فعال)
   - File size limit: 10 MB
   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
5. روی "Create bucket" کلیک کنید

===========================================
مرحله 2: تنظیم RLS Policies (اجرا در SQL Editor)
===========================================
*/

-- حذف پالیسی‌های قبلی (اگر وجود دارند)
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;

-- کاربران می‌توانند مدارک خود را آپلود کنند
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- کاربران می‌توانند مدارک خود را ببینند
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'kyc-documents' AND
    (
        auth.uid()::text = (storage.foldername(name))[1] OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    )
);

-- ادمین‌ها می‌توانند تمام مدارک را ببینند
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'kyc-documents' AND
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- کاربران می‌توانند مدارک خود را به‌روزرسانی کنند (فقط اگر KYC آن‌ها pending باشد)
CREATE POLICY "Users can update their own KYC documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    auth.uid() IN (
        SELECT user_id FROM kyc_verifications WHERE status = 'pending'
    )
)
WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- کاربران می‌توانند مدارک خود را حذف کنند (فقط اگر KYC آن‌ها pending باشد)
CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    auth.uid() IN (
        SELECT user_id FROM kyc_verifications WHERE status = 'pending'
    )
);

-- ✅ پایان - RLS Policies با موفقیت ایجاد شدند
