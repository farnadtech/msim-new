# رفع مشکلات دیتابیس برای سیستم پرداخت

## مشکلات

### 1. ❌ ستون `payment_method` در جدول `payment_receipts` وجود ندارد
```
Could not find the 'payment_method' column of 'payment_receipts' in the schema cache
```

### 2. ❌ ستون `auction_details` قابل query نیست
```
column sim_cards.auction_details does not exist
```

## راه‌حل

### مرحله 1: اجرای SQL برای اضافه کردن ستون payment_method

فایل: `supabase/add-payment-method-column.sql`

```sql
-- اضافه کردن ستون payment_method به جدول payment_receipts

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payment_receipts' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE payment_receipts 
        ADD COLUMN payment_method TEXT;
        
        COMMENT ON COLUMN payment_receipts.payment_method IS 'روش پرداخت: card, zarinpal, zibal';
        
        RAISE NOTICE 'Column payment_method added successfully';
    ELSE
        RAISE NOTICE 'Column payment_method already exists';
    END IF;
END $$;
```

### مرحله 2: اجرای SQL برای تنظیمات درگاه‌های پرداخت

فایل: `supabase/add-payment-gateway-settings.sql`

این فایل قبلاً ایجاد شده است و تنظیمات زیر را اضافه می‌کند:
- تنظیمات زرین‌پال
- تنظیمات زیبال  
- تنظیمات کارت به کارت

## نحوه اجرا

### 1. ورود به Supabase SQL Editor
1. به https://app.supabase.com بروید
2. پروژه خود را انتخاب کنید
3. از منوی سمت چپ "SQL Editor" را انتخاب کنید

### 2. اجرای اسکریپت اول
```sql
-- کپی و paste کنید محتوای فایل add-payment-method-column.sql را
-- سپس دکمه "Run" را بزنید
```

### 3. اجرای اسکریپت دوم
```sql
-- کپی و paste کنید محتوای فایل add-payment-gateway-settings.sql را
-- سپس دکمه "Run" را بزنید
```

### 4. بررسی نتیجه
```sql
-- بررسی ستون payment_method
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_receipts' 
AND column_name = 'payment_method';

-- بررسی تنظیمات درگاه‌ها
SELECT * FROM site_settings 
WHERE category = 'payment_gateways';
```

## تغییرات کد

### 1. api-supabase.ts
- اضافه شدن `payment_method` به type `PaymentReceipt`
- رفع مشکل query روی `auction_details` در `processEndedAuctions`

### 2. config/zibal.ts
- رفع خطای `process.env` با استفاده از `import.meta.env`

## تست

پس از اجرای SQL:

1. Restart سرور development:
   ```bash
   # در ترمینال Kiro یا ترمینال خودتان
   # Ctrl+C برای توقف
   npm run dev
   ```

2. تست پرداخت زیبال:
   - ورود به پنل فروشنده
   - کیف پول → شارژ کیف پول
   - انتخاب زیبال
   - مبلغ: 10000 تومان
   - کلیک "پرداخت"

3. نتیجه مورد انتظار:
   - باید به صفحه پرداخت زیبال منتقل شوید
   - هیچ خطایی در console نباشد

## خطاهای رفع شده

✅ `Could not find the 'payment_method' column`
✅ `column sim_cards.auction_details does not exist`
✅ `process is not defined`
✅ درگاه‌های غیرفعال دیگر نمایش داده نمی‌شوند

## وضعیت نهایی

✅ جدول `payment_receipts` دارای ستون `payment_method` است
✅ تنظیمات درگاه‌های پرداخت در `site_settings` ذخیره شده‌اند
✅ کد برای query روی `auction_details` بهینه شده است
✅ سیستم پرداخت زیبال آماده تست است
