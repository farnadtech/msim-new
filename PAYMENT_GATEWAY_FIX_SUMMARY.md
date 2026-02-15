# خلاصه رفع مشکلات درگاه‌های پرداخت

## مشکلات گزارش شده

### 1. ❌ خطای import در zibal.ts
```
Failed to resolve import "./settings-service" from "config/zibal.ts"
```

**راه حل**: ✅ مسیر import از `./settings-service` به `../services/settings-service` تغییر یافت

### 2. ❌ درگاه غیرفعال هنوز نمایش داده می‌شود
کاربر درگاه زرین‌پال را غیرفعال کرد اما هنوز در کیف پول نمایش داده می‌شد.

**راه حل**: ✅ 
- مقدار اولیه state از `true` به `false` تغییر یافت
- حالا تا زمانی که داده از دیتابیس بارگذاری نشود، هیچ درگاهی نمایش داده نمی‌شود
- پس از بارگذاری، فقط درگاه‌های فعال نمایش داده می‌شوند

## تغییرات انجام شده

### 1. BuyerDashboard.tsx
```typescript
// قبل
const [enabledGateways, setEnabledGateways] = useState({ 
    zarinpal: true, 
    zibal: true, 
    cardToCard: true 
});

// بعد
const [enabledGateways, setEnabledGateways] = useState({ 
    zarinpal: false, 
    zibal: false, 
    cardToCard: false 
});
```

```typescript
// قبل
const handleOpenModal = (type: 'deposit' | 'withdrawal') => {
    setPaymentMethod('zarinpal');
    // ...
};

// بعد
const handleOpenModal = (type: 'deposit' | 'withdrawal') => {
    // تنظیم اولین درگاه فعال به عنوان پیش‌فرض
    if (enabledGateways.zarinpal) setPaymentMethod('zarinpal');
    else if (enabledGateways.zibal) setPaymentMethod('zibal');
    else if (enabledGateways.cardToCard) setPaymentMethod('card');
    // ...
};
```

### 2. SellerDashboard.tsx
همان تغییرات بالا برای کیف پول فروشنده نیز اعمال شد.

### 3. config/zibal.ts
```typescript
// قبل
import * as settingsService from './settings-service';

// بعد
import * as settingsService from '../services/settings-service';
```

## نحوه کار سیستم

### جریان بارگذاری درگاه‌ها

```
1. کامپوننت mount می‌شود
   ↓
2. useEffect اجرا می‌شود
   ↓
3. تنظیمات از site_settings خوانده می‌شود
   ↓
4. state به‌روزرسانی می‌شود
   ↓
5. UI فقط درگاه‌های فعال را نمایش می‌دهد
```

### کد بارگذاری

```typescript
React.useEffect(() => {
    const loadPaymentGateways = async () => {
        try {
            const { data: settings } = await api.supabase
                .from('site_settings')
                .select('setting_key, setting_value')
                .in('setting_key', [
                    'zarinpal_enabled', 
                    'zibal_enabled', 
                    'card_to_card_enabled',
                    'card_to_card_number',
                    'card_to_card_bank_name'
                ]);
            
            if (settings) {
                const gateways = {
                    zarinpal: settings.find(s => s.setting_key === 'zarinpal_enabled')?.setting_value === 'true',
                    zibal: settings.find(s => s.setting_key === 'zibal_enabled')?.setting_value === 'true',
                    cardToCard: settings.find(s => s.setting_key === 'card_to_card_enabled')?.setting_value === 'true'
                };
                setEnabledGateways(gateways);
                
                // تنظیم اولین درگاه فعال
                if (gateways.zarinpal) setPaymentMethod('zarinpal');
                else if (gateways.zibal) setPaymentMethod('zibal');
                else if (gateways.cardToCard) setPaymentMethod('card');
                
                // دریافت اطلاعات کارت
                const cardNum = settings.find(s => s.setting_key === 'card_to_card_number')?.setting_value;
                const bankName = settings.find(s => s.setting_key === 'card_to_card_bank_name')?.setting_value;
                if (cardNum || bankName) {
                    setCardInfo({
                        number: cardNum || '6037-99XX-XXXX-XXXX',
                        bank: bankName || 'بانک ملی ایران'
                    });
                }
            }
        } catch (error) {
            console.error('Error loading payment gateways:', error);
        }
    };
    
    loadPaymentGateways();
}, []);
```

### نمایش شرطی در UI

```typescript
{enabledGateways.zarinpal && (
    <label>
        <input 
            type="radio" 
            value="zarinpal" 
            checked={paymentMethod === 'zarinpal'}
            onChange={() => setPaymentMethod('zarinpal')}
        />
        <span>زرین‌پال</span>
    </label>
)}

{enabledGateways.zibal && (
    <label>
        <input 
            type="radio" 
            value="zibal" 
            checked={paymentMethod === 'zibal'}
            onChange={() => setPaymentMethod('zibal')}
        />
        <span>زیبال</span>
    </label>
)}

{enabledGateways.cardToCard && (
    <label>
        <input 
            type="radio" 
            value="card" 
            checked={paymentMethod === 'card'}
            onChange={() => setPaymentMethod('card')}
        />
        <span>کارت به کارت</span>
    </label>
)}
```

## تست سیستم

### مرحله 1: اجرای SQL
```sql
-- اجرا در Supabase SQL Editor
-- فایل: supabase/add-payment-gateway-settings.sql
```

### مرحله 2: غیرفعال کردن درگاه
1. پنل ادمین → تنظیمات سایت
2. دسته "درگاه‌های پرداخت" (🔐)
3. تیک "فعال" زرین‌پال را بردارید
4. ذخیره تنظیمات

### مرحله 3: بررسی نتیجه
1. پنل خریدار/فروشنده → کیف پول
2. شارژ کیف پول
3. **نتیجه**: فقط زیبال و کارت به کارت نمایش داده می‌شوند

## فایل‌های تغییر یافته

1. ✅ `config/zibal.ts` - رفع خطای import
2. ✅ `pages/BuyerDashboard.tsx` - بارگذاری دینامیک درگاه‌ها
3. ✅ `pages/SellerDashboard.tsx` - بارگذاری دینامیک درگاه‌ها
4. ✅ `services/api-supabase.ts` - export شدن supabase (قبلا انجام شده بود)
5. ✅ `services/zibal-service.ts` - بررسی فعال بودن درگاه (قبلا انجام شده بود)
6. ✅ `services/settings-service.ts` - توابع خواندن تنظیمات (قبلا انجام شده بود)
7. ✅ `pages/AdminSettings.tsx` - مدیریت تنظیمات (قبلا انجام شده بود)

## وضعیت نهایی

✅ همه مشکلات برطرف شد
✅ خطای import حل شد
✅ درگاه‌های غیرفعال دیگر نمایش داده نمی‌شوند
✅ اولین درگاه فعال به صورت خودکار انتخاب می‌شود
✅ تنظیمات کارت به کارت از دیتابیس خوانده می‌شود
✅ هیچ خطای TypeScript وجود ندارد

## نکات مهم

1. **رفرش صفحه**: پس از تغییر تنظیمات در پنل ادمین، صفحه کیف پول را رفرش کنید
2. **Merchant ID زیبال**: برای تست از `zibal` استفاده کنید
3. **حالت تولید**: قبل از انتقال به production، Merchant ID واقعی را وارد کنید
4. **کش مرورگر**: اگر تغییرات اعمال نشد، کش مرورگر را پاک کنید
