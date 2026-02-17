# 📦 راهنمای ایجاد Storage Bucket برای KYC

## ⚠️ مهم: نمی‌توانید Bucket را از SQL Editor ایجاد کنید!

Storage Bucket باید از Supabase Dashboard ایجاد شود.

## مرحله 1: ایجاد Bucket از Dashboard

### گام به گام:

1. **وارد Supabase Dashboard شوید**
   - به https://app.supabase.com بروید
   - پروژه خود را انتخاب کنید

2. **به بخش Storage بروید**
   - از منوی سمت چپ، روی "Storage" کلیک کنید
   - یا از URL: `https://app.supabase.com/project/YOUR_PROJECT_ID/storage/buckets`

3. **ایجاد Bucket جدید**
   - روی دکمه "New bucket" کلیک کنید
   - یا روی "Create a new bucket" کلیک کنید

4. **تنظیمات Bucket**
   
   در فرم باز شده، موارد زیر را وارد کنید:
   
   ```
   Name: kyc-documents
   
   Public bucket: ✓ (تیک بزنید)
   
   File size limit: 10 MB
   
   Allowed MIME types:
   - image/jpeg
   - image/jpg
   - image/png
   - image/webp
   ```

5. **ایجاد Bucket**
   - روی دکمه "Create bucket" کلیک کنید
   - منتظر بمانید تا Bucket ایجاد شود

## مرحله 2: تنظیم RLS Policies

پس از ایجاد Bucket، باید RLS Policies را تنظیم کنید:

1. **به SQL Editor بروید**
   - از منوی سمت چپ، "SQL Editor" را انتخاب کنید

2. **اجرای اسکریپت**
   - محتوای فایل `supabase/create-kyc-storage-bucket.sql` را کپی کنید
   - در SQL Editor پیست کنید
   - روی "Run" کلیک کنید

## بررسی موفقیت‌آمیز بودن

### بررسی Bucket:
```sql
SELECT * FROM storage.buckets WHERE id = 'kyc-documents';
```

باید یک ردیف با اطلاعات زیر ببینید:
- id: kyc-documents
- name: kyc-documents
- public: true

### بررسی Policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%KYC%';
```

باید 5 policy ببینید:
1. Users can upload their own KYC documents
2. Users can view their own KYC documents
3. Admins can view all KYC documents
4. Users can update their own KYC documents
5. Users can delete their own KYC documents

## تست Bucket

### تست آپلود (از کد):
```typescript
const { data, error } = await supabase.storage
  .from('kyc-documents')
  .upload('test/test.jpg', file);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}
```

### تست دسترسی:
1. با یک کاربر عادی وارد شوید
2. سعی کنید یک فایل آپلود کنید
3. بررسی کنید که فایل در پوشه user_id ذخیره شود
4. سعی کنید فایل کاربر دیگری را ببینید (نباید بتوانید)
5. با ادمین وارد شوید و همه فایل‌ها را ببینید

## مشکلات رایج و راه حل

### مشکل 1: "Bucket not found"
**راه حل**: 
- بررسی کنید نام Bucket دقیقا `kyc-documents` باشد
- بررسی کنید Bucket ایجاد شده باشد

### مشکل 2: "Permission denied"
**راه حل**:
- بررسی کنید RLS Policies اجرا شده باشند
- بررسی کنید کاربر authenticate شده باشد

### مشکل 3: "File too large"
**راه حل**:
- حجم فایل باید کمتر از 10MB باشد
- در Dashboard تنظیمات Bucket را بررسی کنید

### مشکل 4: "Invalid MIME type"
**راه حل**:
- فقط فرمت‌های JPEG, PNG, WebP مجاز هستند
- فرمت فایل را بررسی کنید

## تنظیمات پیشرفته (اختیاری)

### تغییر حجم مجاز:
1. به Storage > Buckets بروید
2. روی bucket `kyc-documents` کلیک کنید
3. روی "Settings" کلیک کنید
4. "File size limit" را تغییر دهید
5. "Save" کنید

### افزودن فرمت جدید:
1. به Storage > Buckets بروید
2. روی bucket `kyc-documents` کلیک کنید
3. روی "Settings" کلیک کنید
4. در "Allowed MIME types" فرمت جدید اضافه کنید
5. "Save" کنید

## نکات امنیتی

### ✅ انجام شده:
- RLS فعال است
- کاربران فقط فایل‌های خود را می‌بینند
- ادمین‌ها همه فایل‌ها را می‌بینند
- محدودیت حجم فایل
- محدودیت نوع فایل

### ⚠️ توصیه‌ها:
- فایل‌ها را به صورت دوره‌ای Backup بگیرید
- لاگ دسترسی‌ها را بررسی کنید
- فایل‌های قدیمی را پاک کنید (KYC های رد شده)

## کوئری‌های مفید

### تعداد فایل‌ها:
```sql
SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'kyc-documents';
```

### حجم کل:
```sql
SELECT 
  COUNT(*) as total_files,
  SUM(metadata->>'size')::bigint / 1024 / 1024 as total_size_mb
FROM storage.objects 
WHERE bucket_id = 'kyc-documents';
```

### فایل‌های هر کاربر:
```sql
SELECT 
  (storage.foldername(name))[1] as user_id,
  COUNT(*) as file_count
FROM storage.objects 
WHERE bucket_id = 'kyc-documents'
GROUP BY user_id;
```

## پشتیبانی

اگر مشکلی داشتید:
1. Supabase Dashboard را بررسی کنید
2. لاگ‌های Console را بررسی کنید
3. RLS Policies را بررسی کنید
4. به مستندات Supabase مراجعه کنید: https://supabase.com/docs/guides/storage

---

**✅ پس از تکمیل این مراحل، Storage شما آماده است!**
