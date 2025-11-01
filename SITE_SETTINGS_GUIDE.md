# 📖 راهنمای سیستم تنظیمات سایت

## مقدمه
سیستم تنظیمات سایت به مدیر اجازه می‌دهد تمام پارامترهای متغیر سیستم را بدون نیاز به تغییر کد مدیریت کند.

## 🗄️ نصب و راه‌اندازی

### مرحله 1: اجرای Migration

در Supabase SQL Editor، فایل زیر را اجرا کنید:
```
supabase/add-site-settings-table.sql
```

این migration موارد زیر را ایجاد می‌کند:
- جدول `site_settings`
- Index های بهینه‌سازی شده
- سیاست‌های امنیتی RLS
- تنظیمات پیش‌فرض
- توابع helper

### مرحله 2: دسترسی به پنل تنظیمات

1. به عنوان Admin وارد شوید
2. به **پنل مدیر** بروید
3. روی **⚙️ تنظیمات سایت** کلیک کنید

## 📋 دسته‌بندی تنظیمات

### 1️⃣ کمیسیون (Commission)
- `commission_rate`: نرخ کمیسیون سایت (به صورت اعشاری، مثلاً 0.02 برای 2%)
- `commission_applies_to_auction`: آیا کمیسیون به حراجی‌ها اعمال شود؟
- `commission_applies_to_fixed`: آیا کمیسیون به فروش مقطوع اعمال شود؟

### 2️⃣ حراجی (Auction)
- `auction_guarantee_deposit_rate`: نرخ سپرده تضمین (0.05 = 5%)
- `auction_top_winners_count`: تعداد برندگان برتر که سپرده‌شان نگه‌داشته می‌شود (پیش‌فرض: 3)
- `auction_payment_deadline_hours`: مهلت پرداخت برنده (به ساعت، پیش‌فرض: 48)
- `auction_min_base_price`: حداقل قیمت پایه حراجی (تومان)
- `auction_auto_process`: پردازش خودکار حراجی‌های پایان‌یافته

### 3️⃣ آگهی‌ها (Listing)
- `listing_auto_delete_days`: زمان حذف خودکار (روز، پیش‌فرض: 30)
- `listing_max_duration_days`: حداکثر مدت نمایش (روز)
- `listing_auto_delete_enabled`: فعال/غیرفعال کردن حذف خودکار

### 4️⃣ پرداخت (Payment)
- `zarinpal_enabled`: فعال‌سازی درگاه زرین‌پال
- `card_to_card_enabled`: فعال‌سازی کارت به کارت
- `min_deposit_amount`: حداقل مبلغ شارژ (تومان)
- `min_withdrawal_amount`: حداقل مبلغ برداشت (تومان)

### 5️⃣ رند (Rond)
- `rond_level_1_price`: هزینه رند 1 ستاره (تومان)
- `rond_level_2_price`: هزینه رند 2 ستاره (تومان)
- `rond_level_3_price`: هزینه رند 3 ستاره (تومان)
- `rond_level_4_price`: هزینه رند 4 ستاره (تومان)
- `rond_level_5_price`: هزینه رند 5 ستاره (تومان)

### 6️⃣ عمومی (General)
- `site_name`: نام سایت
- `support_phone`: شماره تماس پشتیبانی
- `support_email`: ایمیل پشتیبانی
- `maintenance_mode`: حالت تعمیر و نگهداری

## 💻 استفاده در کد

### Import کردن سرویس
```typescript
import * as settingsService from '../services/settings-service';
```

### دریافت تک تنظیم
```typescript
// دریافت نرخ کمیسیون
const commissionRate = await settingsService.getCommissionRate();

// دریافت نرخ تضمین حراجی
const guaranteeRate = await settingsService.getAuctionGuaranteeRate();

// دریافت تعداد برندگان برتر
const topWinnersCount = await settingsService.getAuctionTopWinnersCount();
```

### دریافت تنظیم خاص
```typescript
// String
const siteName = await settingsService.getSetting('site_name', 'سیم 724');

// Number
const minPrice = await settingsService.getNumberSetting('auction_min_base_price', 1000000);

// Boolean
const isEnabled = await settingsService.getBooleanSetting('listing_auto_delete_enabled', true);
```

### دریافت همه تنظیمات
```typescript
const allSettings = await settingsService.getAllSettingsAsObject();
console.log(allSettings['commission_rate']); // "0.02"
```

### دریافت قیمت‌های رند
```typescript
// یک سطح
const price = await settingsService.getRondPrice(3); // قیمت رند 3 ستاره

// همه سطوح
const allPrices = await settingsService.getAllRondPrices();
console.log(allPrices[1]); // قیمت رند 1 ستاره
```

## 🔄 Cache Management

سیستم به صورت خودکار تنظیمات را برای 1 دقیقه Cache می‌کند.

```typescript
// پاک کردن Cache (بعد از تغییرات)
settingsService.clearSettingsCache();

// Force Refresh
const settings = await settingsService.getAllSettingsAsObject(true);
```

## 📝 به‌روزرسانی تنظیمات

### از طریق UI (پیشنهادی)
1. وارد **پنل مدیر** شوید
2. **تنظیمات سایت** را باز کنید
3. تنظیم مورد نظر را تغییر دهید
4. روی **ذخیره** کلیک کنید

### از طریق کد (برای Admin)
```typescript
import { updateSetting } from '../services/settings-service';

// به‌روزرسانی نرخ کمیسیون
await updateSetting('commission_rate', '0.03', userId);

// به‌روزرسانی مهلت پرداخت حراجی
await updateSetting('auction_payment_deadline_hours', '72', userId);
```

## 🛡️ امنیت

- ✅ فقط Admin می‌تواند تنظیمات را تغییر دهد
- ✅ RLS Policies برای محافظت از داده‌ها
- ✅ تمام تغییرات Log می‌شوند (updated_by, updated_at)
- ✅ کاربران عادی فقط می‌توانند تنظیمات عمومی را ببینند

## 📊 نمونه‌های کاربردی

### 1. تغییر نرخ کمیسیون در سیستم فروش
```typescript
// قبلاً: مقدار ثابت در کد
const commission = salePrice * 0.02;

// حالا: از تنظیمات
const commissionRate = await settingsService.getCommissionRate();
const commission = salePrice * commissionRate;
```

### 2. محاسبه سپرده تضمین حراجی
```typescript
// قبلاً: مقدار ثابت
const deposit = basePrice * 0.05;

// حالا: قابل تنظیم
const depositRate = await settingsService.getAuctionGuaranteeRate();
const deposit = Math.floor(basePrice * depositRate);
```

### 3. تعیین تعداد برندگان برتر
```typescript
// قبلاً: ثابت 3 نفر
const topWinners = participants.slice(0, 3);

// حالا: قابل تنظیم
const topCount = await settingsService.getAuctionTopWinnersCount();
const topWinners = participants.slice(0, topCount);
```

### 4. بررسی حالت تعمیر و نگهداری
```typescript
const isMaintenanceMode = await settingsService.getBooleanSetting('maintenance_mode');

if (isMaintenanceMode) {
    return <MaintenancePage />;
}
```

## 🔧 اضافه کردن تنظیم جدید

### 1. به جدول اضافه کنید
```sql
INSERT INTO site_settings (setting_key, setting_value, setting_type, description, category) 
VALUES (
    'new_feature_enabled',
    'true',
    'boolean',
    'فعال‌سازی ویژگی جدید',
    'general'
);
```

### 2. تابع Helper در settings-service.ts
```typescript
export const isNewFeatureEnabled = async (): Promise<boolean> => {
    return await getBooleanSetting('new_feature_enabled', false);
};
```

### 3. Type Definition (اختیاری)
```typescript
// در types.ts
export interface SiteSettings {
    // ... existing settings
    new_feature_enabled: boolean;
}
```

## ⚠️ نکات مهم

1. **برای اعداد اعشاری**: از نقطه استفاده کنید (0.02 نه ۰.۰۲)
2. **برای بولین**: فقط 'true' یا 'false' (با حروف کوچک)
3. **Cache**: بعد از تغییرات مهم، Cache را پاک کنید
4. **مقادیر پیش‌فرض**: همیشه fallback value تعریف کنید
5. **Validation**: قبل از ذخیره، مقادیر را validate کنید

## 🚀 Performance Tips

1. از Cache استفاده کنید (پیش‌فرض 1 دقیقه)
2. برای تنظیمات پرتکرار، از `getAllSettingsAsObject` استفاده کنید
3. تنظیمات را در سطح بالاتر fetch کنید و به child components pass کنید

## 📞 پشتیبانی

در صورت بروز مشکل:
1. Log های console را بررسی کنید
2. RLS Policies را چک کنید
3. مطمئن شوید migration اجرا شده است
4. Cache را clear کنید
