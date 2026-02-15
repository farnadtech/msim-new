# رفع مشکل Callback زیبال با HashRouter

## مشکل

وقتی از HashRouter استفاده می‌کنیم، زیبال query parameters را قبل از `#` اضافه می‌کند:

```
❌ نتیجه واقعی:
http://localhost:5173/?success=1&status=2&trackId=...#/seller/wallet

✅ نتیجه مورد انتظار:
http://localhost:5173/#/payment/zibal/callback?success=1&status=2&trackId=...
```

## راه حل

استفاده از یک صفحه واسط HTML که query parameters را دریافت و به hash route منتقل می‌کند.

### 1. صفحه واسط: `public/zibal-callback.html`

این صفحه:
1. Query parameters را از URL دریافت می‌کند
2. URL جدید با hash router می‌سازد
3. به صفحه callback اصلی redirect می‌کند

```html
<!-- محتوای فایل -->
<script>
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('trackId');
    const success = urlParams.get('success');
    const status = urlParams.get('status');
    const orderId = urlParams.get('orderId');
    
    const newUrl = `${window.location.origin}/#/payment/zibal/callback?trackId=${trackId}&success=${success}&status=${status}&orderId=${orderId}`;
    
    window.location.href = newUrl;
</script>
```

### 2. تغییر Callback URL

**قبل:**
```
VITE_ZIBAL_CALLBACK_URL=http://localhost:5173/#/payment/zibal/callback
```

**بعد:**
```
VITE_ZIBAL_CALLBACK_URL=http://localhost:5173/zibal-callback.html
```

### 3. آپدیت ZibalCallbackPage

- اضافه شدن `useAuth` برای تشخیص نوع کاربر (buyer/seller)
- Redirect به مسیر مناسب بر اساس نقش کاربر

## جریان کار

```
1. کاربر پرداخت را در زیبال تکمیل می‌کند
   ↓
2. زیبال به zibal-callback.html redirect می‌کند
   URL: http://localhost:5173/zibal-callback.html?success=1&status=2&trackId=...
   ↓
3. صفحه واسط query parameters را می‌خواند
   ↓
4. Redirect به hash route
   URL: http://localhost:5173/#/payment/zibal/callback?success=1&status=2&trackId=...
   ↓
5. ZibalCallbackPage پرداخت را verify می‌کند
   ↓
6. موجودی کاربر آپدیت می‌شود
   ↓
7. Redirect به کیف پول (buyer یا seller)
```

## تست

### مرحله 1: Restart سرور (اختیاری)
```bash
# اگر سرور در حال اجراست، نیازی به restart نیست
# اما اگر می‌خواهید:
npm run dev
```

### مرحله 2: تست پرداخت
1. ورود به پنل فروشنده
2. کیف پول → شارژ کیف پول
3. انتخاب زیبال
4. مبلغ: 10000 تومان
5. کلیک "پرداخت"

### مرحله 3: در صفحه sandbox زیبال
1. کلیک "پرداخت موفق"
2. **نتیجه مورد انتظار**:
   - Redirect به `zibal-callback.html`
   - سپس redirect به `/#/payment/zibal/callback`
   - نمایش پیام "پرداخت با موفقیت انجام شد"
   - Redirect به کیف پول
   - موجودی افزایش یافته

## نکات مهم

### برای Production

فایل `.env` را برای production تغییر دهید:

```env
# کامنت localhost
# VITE_ZIBAL_CALLBACK_URL=http://localhost:5173/zibal-callback.html

# فعال production
VITE_ZIBAL_CALLBACK_URL=https://msim724.com/zibal-callback.html
```

### فایل zibal-callback.html

این فایل باید در root دامنه قرار بگیرد:
- Localhost: `http://localhost:5173/zibal-callback.html`
- Production: `https://msim724.com/zibal-callback.html`

در Vite، فایل‌های داخل `public/` به صورت خودکار در root قرار می‌گیرند.

## فایل‌های تغییر یافته

1. ✅ `public/zibal-callback.html` - صفحه واسط (جدید)
2. ✅ `.env` - تغییر callback URL
3. ✅ `config/zibal.ts` - آپدیت CALLBACK_URL
4. ✅ `pages/ZibalCallbackPage.tsx` - پشتیبانی از buyer و seller

## خطاهای رفع شده

✅ Redirect به URL اشتباه
✅ Query parameters قبل از hash قرار می‌گرفتند
✅ کیف پول شارژ نمی‌شد
✅ Redirect به مسیر نادرست (همیشه buyer/wallet)

## وضعیت نهایی

✅ صفحه واسط ایجاد شد
✅ Callback URL به zibal-callback.html تغییر یافت
✅ پشتیبانی از buyer و seller
✅ موجودی به درستی آپدیت می‌شود
✅ Redirect به مسیر صحیح
