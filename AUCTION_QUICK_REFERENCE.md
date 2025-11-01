# 🚀 راهنمای سریع - سیستم حراجی با ضمانت‌نامه

## فایل‌های کلیدی

```
سیستم‌دیتابیس:
  └─ supabase/add-auction-guarantee-system.sql (اجرا شود اول!)

کدهای TypeScript:
  ├─ services/auction-guarantee-system.ts (توابع اصلی)
  ├─ services/api-supabase.ts (بروزرسانی شده)
  └─ types.ts (تایپ‌های جدید)

Components:
  ├─ components/AdminAuctionParticipantsPanel.tsx (برای ادمین)
  └─ components/UserAuctionView.tsx (برای کاربران)

Hooks:
  └─ hooks/useAuctionPaymentChecker.ts (بررسی خودکار)
```

---

## ۱۰ قدم برای شروع

### ۱. اجرای SQL
```sql
-- فایل: supabase/add-auction-guarantee-system.sql
-- جایی: Supabase Dashboard → SQL Editor
-- کپی، پیست، اجرا
```

### ۲. فعال‌سازی Hooks
```typescript
// App.tsx
import useAuctionPaymentChecker from './hooks/useAuctionPaymentChecker';

export default function App() {
  useAuctionPaymentChecker(); // اضافه کنید
  return <MainApp />;
}
```

### ۳. اضافه کردن UserAuctionView
```typescript
// AuctionsPage.tsx یا SimDetailsPage.tsx
import UserAuctionView from '../components/UserAuctionView';

return (
  <div>
    <SimCard sim={sim} />
    <UserAuctionView sim={sim} /> {/* اضافه کنید */}
  </div>
);
```

### ۴. اضافه کردن AdminAuctionParticipantsPanel
```typescript
// AdminDashboard.tsx
import AdminAuctionParticipantsPanel from '../components/AdminAuctionParticipantsPanel';

return (
  <div>
    <AdminAuctionParticipantsPanel auctionId={selectedAuctionId} />
  </div>
);
```

### ۵. اضافه کردن فرم ثبت پیشنهاد
```typescript
const handlePlaceBid = async () => {
  await api.placeBidWithGuaranteeDeposit(
    sim.id,
    auctionId,
    user.id,
    bidAmount,
    basePrice
  );
};
```

### ۶. بررسی موجودی
```typescript
const { hasBalance, requiredAmount } = 
  await api.checkGuaranteeDepositBalance(userId, auctionId, basePrice);

if (!hasBalance) {
  alert(`موجودی کافی نیست. مورد نیاز: ${requiredAmount.toLocaleString('fa-IR')} تومان`);
}
```

### ۷. پایان حراجی (خودکار یا دستی)
```typescript
// خودکار (هر رفرش)
useAuctionPaymentChecker();

// یا دستی
await api.processAuctionEnding(auctionId);
```

### ۸. مدیریت پرداخت‌ها
```typescript
const { data: winners } = await supabase
  .from('auction_winner_queue')
  .select('*')
  .eq('payment_status', 'pending');

// نمایش لیست و تکمیل پرداخت
await api.processAuctionWinnerPayment(winnerQueueId, auctionId);
```

### ۹. شروع تحویل خط
```typescript
await api.completeAuctionFlow(auctionId, winnerUserId, simCardId);
```

### ۱۰. آزمایش
```typescript
// در توسعه
console.log('حق ضمانت:', basePrice * 0.05);
console.log('مبلغ پیشنهاد:', bidAmount);
console.log('کل مورد نیاز:', basePrice * 0.05 + bidAmount);
```

---

## توابع اصلی (Cheat Sheet)

```typescript
// بررسی موجودی
api.checkGuaranteeDepositBalance(userId, auctionId, basePrice)
  → { hasBalance, requiredAmount, currentBalance }

// ثبت پیشنهاد
api.placeBidWithGuaranteeDeposit(simId, auctionId, bidderId, amount, basePrice)
  → void

// پایان حراجی
api.processAuctionEnding(auctionId)
  → void

// بررسی مهلت‌ها (خودکار)
api.checkAndProcessPaymentDeadlines()
  → void

// پرداخت برنده
api.processAuctionWinnerPayment(winnerQueueId, auctionId)
  → void

// تکمیل جریان
api.completeAuctionFlow(auctionId, winnerUserId, simCardId)
  → void
```

---

## منطق کاملاً کوتاه

**۱. شرکت:**
```
موجودی >= (۵% قیمت + پیشنهاد) ✅
  ↓
حق ضمانت مسدود + پیشنهاد مسدود ✅
  ↓
اطلاع‌رسانی ✅
```

**۲. برنده شدن:**
```
پایان حراجی ✅
  ↓
۳ نفر اول → صف پرداخت ✅
  ↓
دیگری → حق ضمانت برگشت ✅
```

**۳. پرداخت:**
```
۴۸ ساعت (checkAndProcessPaymentDeadlines) ✅
  ↓
اگر پرداخت: تکمیل + کمیسیون ✅
  ↓
اگر نه: سوزاندن + برنده‌ی بعدی ✅
```

---

## مثال واقعی

```typescript
// سیمکارت: ۰۹۱۲۳۴۵۶۷۸
// قیمت پایه: ۱۰,۰۰۰,۰۰۰ تومان
// حق ضمانت: ۵۰۰,۰۰۰ تومان

// علی (شرکت‌کننده)
const { hasBalance } = await api.checkGuaranteeDepositBalance(
  'ali-id',
  auctionId,
  10000000
);
// hasBalance: true ✅

await api.placeBidWithGuaranteeDeposit(
  simCardId,
  auctionId,
  'ali-id',
  12000000, // پیشنهاد
  10000000  // قیمت پایه
);
// مسدود شد: ۵۰۰,۰۰۰ + ۱۲,۰۰۰,۰۰۰ = ۱۲,۵۰۰,۰۰۰

// پایان حراجی (خودکار)
// علی برنده شد
// اطلاع‌رسانی: "۴۸ ساعت برای پرداخت"

// ۲۴ ساعت بعد
// CheckAndProcessPaymentDeadlines
// علی هنوز پرداخت نکرده
// اطلاع‌رسانی: "حق ضمانت سوزانده شد"
// اطلاع‌رسانی سارا (برنده‌ی ۲): "نوبت شما"

// سارا پرداخت کرد
api.processAuctionWinnerPayment(winnerQueueId, auctionId)
// کمیسیون: ۲% = ۲۳۲,۰۰۰
// فروشنده دریافت: ۱۱,۷۶۸,۰۰۰
```

---

## بررسی‌لیست قبل از استقرار

- [ ] SQL Script اجرا شده
- [ ] Hook در App.tsx اضافه شده
- [ ] UserAuctionView یکپارچه شده
- [ ] AdminAuctionParticipantsPanel اضافه شده
- [ ] فرم ثبت پیشنهاد کار می‌کند
- [ ] بررسی موجودی کار می‌کند
- [ ] اطلاع‌رسانی‌ها ارسال می‌شوند
- [ ] مهلت‌ها بررسی می‌شوند
- [ ] پرداخت ثبت می‌شود
- [ ] تحویل خط شروع می‌شود

---

## مستندات دقیق‌تر

```
خواندن کنید:
  ├─ AUCTION_GUARANTEE_SYSTEM_IMPLEMENTATION.md (دقیق)
  ├─ AUCTION_GUARANTEE_INTEGRATION_GUIDE.md (کدها)
  └─ AUCTION_SYSTEM_COMPLETION_SUMMARY.md (خلاصه)
```

---

## پشتیبانی

```
سؤال؟
  ├─ چند تابع؟ → فایل: services/auction-guarantee-system.ts
  ├─ چه Types؟ → فایل: types.ts
  ├─ چه Components؟ → پوشه: components/
  └─ چه Hooks؟ → پوشه: hooks/
```

---

**آماده؟ شروع کنید! 🚀**
