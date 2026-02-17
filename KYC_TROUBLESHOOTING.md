# راهنمای عیب‌یابی سیستم احراز هویت (KYC)

## مشکل: درخواست‌های KYC در پنل ادمین نمایش داده نمی‌شوند

### مراحل عیب‌یابی:

## 1️⃣ بررسی وجود داده در دیتابیس

در Supabase SQL Editor، اسکریپت زیر را اجرا کنید:

```sql
-- بررسی تعداد درخواست‌ها
SELECT COUNT(*) as total FROM kyc_verifications;

-- مشاهده تمام درخواست‌ها
SELECT * FROM kyc_verifications ORDER BY created_at DESC;
```

**اگر نتیجه 0 بود:**
- هیچ درخواست KYC ثبت نشده است
- باید یک کاربر وارد شود و فرم احراز هویت را پر کند

**برای ایجاد درخواست تستی:**
- فایل `supabase/create-test-kyc.sql` را باز کنید
- USER_ID_HERE را با یک user_id واقعی جایگزین کنید
- اسکریپت را در SQL Editor اجرا کنید

---

## 2️⃣ بررسی RLS Policies

RLS (Row Level Security) ممکن است مانع نمایش داده‌ها شود.

```sql
-- بررسی پالیسی‌های موجود
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'kyc_verifications';
```

**اگر پالیسی‌ای وجود ندارد یا مشکل دارد:**
- فایل `supabase/fix-kyc-rls.sql` را در SQL Editor اجرا کنید
- این فایل تمام پالیسی‌های لازم را ایجاد می‌کند

---

## 3️⃣ بررسی نقش کاربر ادمین

ادمین باید role = 'admin' داشته باشد:

```sql
-- بررسی نقش کاربر فعلی
SELECT id, phone_number, role, is_verified 
FROM users 
WHERE id = auth.uid();
```

**اگر role ادمین نیست:**

```sql
-- تبدیل کاربر به ادمین
UPDATE users 
SET role = 'admin' 
WHERE phone_number = 'شماره_تلفن_شما';
```

---

## 4️⃣ بررسی Console Browser

1. در مرورگر، F12 را بزنید
2. به تب Console بروید
3. صفحه `/admin/kyc-management` را باز کنید
4. به دنبال خطاهای قرمز بگردید

**خطاهای رایج:**
- `403 Forbidden` → مشکل RLS
- `401 Unauthorized` → کاربر لاگین نیست
- `Network Error` → مشکل اتصال به Supabase

---

## 5️⃣ بررسی Network Tab

1. در Developer Tools، به تب Network بروید
2. صفحه را رفرش کنید
3. به دنبال درخواست به `/rest/v1/kyc_verifications` بگردید
4. روی آن کلیک کنید و Response را ببینید

**اگر Response خالی است:**
- احتمالاً RLS مشکل دارد
- یا داده‌ای در دیتابیس نیست

---

## 6️⃣ غیرفعال کردن موقت RLS (فقط برای تست)

⚠️ **هشدار: فقط برای تست محلی استفاده کنید**

```sql
-- غیرفعال کردن RLS
ALTER TABLE kyc_verifications DISABLE ROW LEVEL SECURITY;

-- بعد از تست، حتماً دوباره فعال کنید
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
```

اگر بعد از غیرفعال کردن RLS، داده‌ها نمایش داده شدند، یعنی مشکل از RLS policies است.

---

## 7️⃣ بررسی Storage Bucket

اگر تصاویر نمایش داده نمی‌شوند:

1. به Supabase Dashboard بروید
2. Storage → Buckets
3. بررسی کنید که bucket با نام `kyc-documents` وجود دارد
4. بررسی کنید که Public است

**ایجاد bucket:**
- به `STORAGE_BUCKET_SETUP_GUIDE.md` مراجعه کنید

---

## 8️⃣ تست کامل سیستم

### مرحله 1: ایجاد کاربر تستی
```sql
-- ایجاد یک کاربر تستی
INSERT INTO users (id, phone_number, role, is_verified)
VALUES (
    gen_random_uuid(),
    '09123456789',
    'buyer',
    false
);
```

### مرحله 2: ثبت درخواست KYC
- با کاربر تستی لاگین کنید
- فرم احراز هویت را پر کنید
- درخواست را ارسال کنید

### مرحله 3: بررسی در پنل ادمین
- با حساب ادمین لاگین کنید
- به `/admin/kyc-management` بروید
- باید درخواست را ببینید

---

## 9️⃣ اسکریپت‌های کمکی

### بررسی کامل داده‌ها:
```bash
# در SQL Editor اجرا کنید
supabase/check-kyc-data.sql
```

### رفع مشکل RLS:
```bash
# در SQL Editor اجرا کنید
supabase/fix-kyc-rls.sql
```

### ایجاد درخواست تستی:
```bash
# در SQL Editor اجرا کنید
supabase/create-test-kyc.sql
```

---

## 🔟 چک‌لیست نهایی

- [ ] جدول `kyc_verifications` وجود دارد
- [ ] RLS فعال است و policies صحیح هستند
- [ ] حداقل یک درخواست KYC در دیتابیس وجود دارد
- [ ] کاربر فعلی role = 'admin' دارد
- [ ] Storage bucket `kyc-documents` ایجاد شده
- [ ] هیچ خطایی در Console نیست
- [ ] درخواست API موفقیت‌آمیز است (200 OK)

---

## 📞 اگر همچنان مشکل دارید

1. تمام مراحل بالا را دوباره بررسی کنید
2. لاگ‌های Console و Network را بررسی کنید
3. مطمئن شوید که با حساب ادمین لاگین کرده‌اید
4. Cache مرورگر را پاک کنید (Ctrl+Shift+Delete)
5. صفحه را Hard Refresh کنید (Ctrl+Shift+R)

---

## ✅ راه‌حل سریع (Quick Fix)

اگر عجله دارید، این اسکریپت را اجرا کنید:

```sql
-- 1. غیرفعال و فعال کردن مجدد RLS
ALTER TABLE kyc_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- 2. حذف تمام پالیسی‌ها
DROP POLICY IF EXISTS "Users can view their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can insert their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can update their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can update all KYC" ON kyc_verifications;

-- 3. ایجاد مجدد پالیسی‌ها
CREATE POLICY "Users can view their own KYC"
ON kyc_verifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own KYC"
ON kyc_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own KYC"
ON kyc_verifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all KYC"
ON kyc_verifications FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Admins can update all KYC"
ON kyc_verifications FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- 4. بررسی نتیجه
SELECT COUNT(*) FROM kyc_verifications;
```
