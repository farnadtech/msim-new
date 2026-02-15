# راهنمای تست درگاه پرداخت روی Localhost

## مشکل
شما درگاه اصلی را با دامنه `msim724.com` گرفته‌اید، اما می‌خواهید روی localhost تست کنید.

## راه‌حل

### 1. استفاده از حالت Sandbox (توصیه می‌شود)

برای تست، از حالت sandbox درگاه‌های پرداخت استفاده کنید:

#### زیبال (Zibal)
- Merchant ID تست: `zibal`
- در پنل ادمین → تنظیمات سایت → درگاه‌های پرداخت:
  - Merchant ID زیبال را روی `zibal` قرار دهید
  - حالت Sandbox را فعال کنید

#### زرین‌پال (ZarinPal)
- در فایل `config/zarinpal.ts`:
  - `SANDBOX: true` را تنظیم کنید
  - Merchant ID تست استفاده می‌شود

### 2. تنظیم Callback URL برای Localhost

فایل `.env` را ویرایش کنید:

```env
# برای تست روی localhost
VITE_ZIBAL_CALLBACK_URL=http://localhost:5173/#/payment/zibal/callback

# برای production (کامنت کنید)
# VITE_ZIBAL_CALLBACK_URL=https://msim724.com/#/payment/zibal/callback
```

### 3. راه‌اندازی مجدد سرور

پس از تغییر `.env`، حتماً سرور را restart کنید:

```bash
# توقف سرور (Ctrl+C)
# سپس اجرای مجدد:
npm run dev
```

## نکات مهم

### حالت Sandbox چیست؟
- در حالت sandbox، پرداخت واقعی انجام نمی‌شود
- می‌توانید با کارت‌های تست، پرداخت را شبیه‌سازی کنید
- هیچ پولی از حساب شما کم نمی‌شود

### کارت‌های تست زیبال
در حالت sandbox زیبال، می‌توانید از هر شماره کارت 16 رقمی استفاده کنید.

### کارت‌های تست زرین‌پال
- شماره کارت: `5022-2910-xxxx-xxxx` (هر 8 رقم آخر)
- CVV2: هر عددی
- تاریخ انقضا: هر تاریخ آینده

## جریان کار تست

### 1. تنظیمات اولیه
```bash
# 1. ویرایش .env
VITE_ZIBAL_CALLBACK_URL=http://localhost:5173/#/payment/zibal/callback

# 2. Restart سرور
npm run dev
```

### 2. تنظیمات پنل ادمین
1. ورود به پنل ادمین
2. تنظیمات سایت → درگاه‌های پرداخت
3. زیبال:
   - فعال: ✓
   - Merchant ID: `zibal`
   - Sandbox: ✓
4. ذخیره تنظیمات

### 3. تست پرداخت
1. ورود به پنل خریدار/فروشنده
2. کیف پول → شارژ کیف پول
3. مبلغ: 10000 تومان
4. انتخاب درگاه: زیبال
5. کلیک روی "پرداخت"
6. در صفحه زیبال، پرداخت را تکمیل کنید
7. بازگشت به سایت و بررسی موجودی

## انتقال به Production

وقتی آماده انتقال به production شدید:

### 1. تغییر .env
```env
# کامنت کردن localhost
# VITE_ZIBAL_CALLBACK_URL=http://localhost:5173/#/payment/zibal/callback

# فعال کردن production
VITE_ZIBAL_CALLBACK_URL=https://msim724.com/#/payment/zibal/callback
```

### 2. تنظیمات پنل ادمین
1. Merchant ID واقعی را وارد کنید
2. Sandbox را غیرفعال کنید

### 3. Build و Deploy
```bash
npm run build
# سپس فایل‌های dist را روی سرور آپلود کنید
```

## رفع مشکلات

### مشکل: پرداخت انجام می‌شود اما به سایت برنمی‌گردد
**علت**: Callback URL اشتباه است

**راه حل**:
1. بررسی کنید که `.env` درست تنظیم شده باشد
2. سرور را restart کنید
3. کش مرورگر را پاک کنید

### مشکل: خطای "Merchant ID نامعتبر"
**علت**: در حالت sandbox، باید از `zibal` استفاده کنید

**راه حل**:
1. پنل ادمین → تنظیمات → درگاه‌های پرداخت
2. Merchant ID زیبال را روی `zibal` قرار دهید
3. Sandbox را فعال کنید

### مشکل: خطای "process is not defined"
**علت**: این مشکل حل شده است

**راه حل**: کد به‌روزرسانی شده و از `import.meta.env` استفاده می‌کند

## استفاده از window.location.origin

اگر `VITE_ZIBAL_CALLBACK_URL` تنظیم نشود، کد به صورت خودکار از `window.location.origin` استفاده می‌کند:

```typescript
CALLBACK_URL: import.meta.env.VITE_ZIBAL_CALLBACK_URL || 
              `${window.location.origin}/#/payment/zibal/callback`
```

این یعنی:
- روی localhost: `http://localhost:5173/#/payment/zibal/callback`
- روی production: `https://msim724.com/#/payment/zibal/callback`

## خلاصه

✅ برای تست روی localhost:
- از حالت Sandbox استفاده کنید
- Merchant ID = `zibal`
- Callback URL = `http://localhost:5173/#/payment/zibal/callback`

✅ برای production:
- Merchant ID واقعی
- Sandbox غیرفعال
- Callback URL = `https://msim724.com/#/payment/zibal/callback`

✅ نکته: همیشه پس از تغییر `.env`، سرور را restart کنید!
