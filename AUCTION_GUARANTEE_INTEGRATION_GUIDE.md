صورت بندی# راهنمای یکپارچه‌سازی سیستم حراجی با ضمانت‌نامه

## مرحله ۱: اجرای SQL Script

```bash
# در Supabase Dashboard:
# 1. روی "SQL Editor" کلیک کنید
# 2. محتوای فایل زیر را کپی کنید و اجرا کنید:
supabase/add-auction-guarantee-system.sql
```

## مرحله ۲: بروزرسانی صفحه AuctionsPage

```typescript
import React from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import SimCard from '../components/SimCard';
import UserAuctionView from '../components/UserAuctionView';
import useAuctionPaymentChecker from '../hooks/useAuctionPaymentChecker';

const AuctionsPage: React.FC = () => {
  const { simCards, loading } = useData();
  const { user } = useAuth();
  
  // بررسی مهلت‌های پرداخت خودکار
  useAuctionPaymentChecker();

  const auctionSims = simCards.filter(s => s.type === 'auction' && s.status === 'available');

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50">
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold mb-12">داغ ترین حراجی ها</h1>
        
        {loading ? (
          <div>در حال بارگذاری...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {auctionSims.map(sim => (
              <div key={sim.id}>
                <SimCard sim={sim} />
                {/* نمایش حق ضمانت و پیشنهادها برای کاربر عادی */}
                {user?.role !== 'admin' && <UserAuctionView sim={sim} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionsPage;
```

## مرحله ۳: اضافه کردن بخش مدیریت حراجی برای ادمین

```typescript
// در AdminDashboard.tsx یا صفحه‌ی مدیریت جدید

import AdminAuctionParticipantsPanel from '../components/AdminAuctionParticipantsPanel';

const AdminAuctionManager: React.FC = () => {
  const [selectedAuctionId, setSelectedAuctionId] = React.useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* لیست حراجی‌های فعال */}
      <div>
        <h2 className="text-2xl font-bold mb-4">مدیریت حراجی‌ها</h2>
        {/* نمایش حراجی‌های فعال */}
      </div>

      {/* پنل شرکت‌کنندگان */}
      {selectedAuctionId && (
        <AdminAuctionParticipantsPanel auctionId={selectedAuctionId} />
      )}
    </div>
  );
};

export default AdminAuctionManager;
```

## مرحله ۴: اضافه کردن گزینه‌ی ثبت پیشنهاد

```typescript
// در SimDetailsPage.tsx یا صفحه‌ی جزئیات سیمکارت

import api from '../services/api-supabase';
import { useAuth } from '../hooks/useAuth';

const SimDetailsPage: React.FC = () => {
  const { user } = useAuth();
  const [bidAmount, setBidAmount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handlePlaceBid = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // بررسی موجودی
      const balanceCheck = await api.checkGuaranteeDepositBalance(
        user.id,
        sim.auction_details?.auction_id || 0,
        sim.price
      );

      if (!balanceCheck.hasBalance) {
        setError(`موجودی کافی نیست. مورد نیاز: ${balanceCheck.requiredAmount.toLocaleString('fa-IR')} تومان`);
        return;
      }

      // ثبت پیشنهاد
      await api.placeBidWithGuaranteeDeposit(
        sim.id,
        sim.auction_details?.auction_id || 0,
        user.id,
        bidAmount,
        sim.price
      );

      alert('پیشنهاد شما با موفقیت ثبت شد!');
      setBidAmount(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* نمایش جزئیات سیمکارت */}
      
      {/* فرم ثبت پیشنهاد */}
      <div className="mt-6 bg-white p-6 rounded-lg">
        <h3 className="text-2xl font-bold mb-4">ثبت پیشنهاد جدید</h3>
        
        <input
          type="number"
          value={bidAmount}
          onChange={(e) => setBidAmount(Number(e.target.value))}
          placeholder="مبلغ پیشنهاد"
          className="w-full mb-4 p-2 border rounded"
        />

        <button
          onClick={handlePlaceBid}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'در حال ثبت...' : 'ثبت پیشنهاد'}
        </button>

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default SimDetailsPage;
```

## مرحله ۵: پردازش خودکار حراجی‌های انجام‌شده

```typescript
// در App.tsx یا یک Hook عمومی

import { useEffect } from 'react';
import api from './services/api-supabase';
import { supabase } from './services/supabase';

const useAuctionAutoProcessor = () => {
  useEffect(() => {
    const processEndedAuctions = async () => {
      try {
        // دریافت حراجی‌های انجام‌شده
        const { data: endedAuctions } = await supabase
          .from('auction_details')
          .select('id')
          .eq('status', 'active')
          .lt('end_time', new Date().toISOString());

        if (endedAuctions) {
          for (const auction of endedAuctions) {
            await api.processAuctionEnding(auction.id);
          }
        }
      } catch (error) {
        console.error('خطا در پردازش حراجی‌های انجام‌شده:', error);
      }
    };

    // بررسی هر ۱ دقیقه
    const interval = setInterval(processEndedAuctions, 60000);
    return () => clearInterval(interval);
  }, []);
};

export default useAuctionAutoProcessor;
```

## مرحله ۶: مدیریت پرداخت برندگان

```typescript
// صفحه‌ای جدید برای مدیریت پرداخت برندگان

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api-supabase';

const WinnerPaymentManager: React.FC = () => {
  const [winners, setWinners] = useState<any[]>([]);

  useEffect(() => {
    const loadPendingWinners = async () => {
      const { data } = await supabase
        .from('auction_winner_queue')
        .select('*')
        .eq('payment_status', 'pending')
        .order('payment_deadline', { ascending: true });

      setWinners(data || []);
    };

    loadPendingWinners();
    const interval = setInterval(loadPendingWinners, 30000); // هر ۳۰ ثانیه بروزرسانی
    return () => clearInterval(interval);
  }, []);

  const handlePaymentCompleted = async (winnerQueueId: number, auctionId: number) => {
    try {
      await api.processAuctionWinnerPayment(winnerQueueId, auctionId);
      alert('پرداخت ثبت شد!');
      // بروزرسانی لیست
      const { data } = await supabase
        .from('auction_winner_queue')
        .select('*')
        .eq('payment_status', 'pending');
      setWinners(data || []);
    } catch (error) {
      alert('خطا در ثبت پرداخت: ' + (error as Error).message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">مدیریت پرداخت‌های برندگان</h2>
      
      <table className="w-full">
        <thead>
          <tr>
            <th>رتبه</th>
            <th>مبلغ</th>
            <th>مهلت</th>
            <th>اقدام</th>
          </tr>
        </thead>
        <tbody>
          {winners.map((winner) => (
            <tr key={winner.id}>
              <td>{winner.winner_rank}</td>
              <td>{winner.highest_bid.toLocaleString('fa-IR')} تومان</td>
              <td>{new Date(winner.payment_deadline).toLocaleString('fa-IR')}</td>
              <td>
                <button
                  onClick={() => handlePaymentCompleted(winner.id, winner.auction_id)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  تأیید پرداخت
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WinnerPaymentManager;
```

## مرحله ۷: تنظیم Notifications

سیستم به‌طور خودکار اطلاع‌رسانی‌های زیر را ارسال می‌کند:

1. **حق ضمانت کسر شد**: هنگام ثبت اولین پیشنهاد
2. **پیشنهاد شما بالاتر شد**: برای بیدارکننده‌ی قبلی
3. **شما برنده شدید**: پس از پایان حراجی
4. **مهلت پرداخت**: یادآوری برای برنده
5. **عدم پرداخت**: اطلاع درباره‌ی سوزاندن حق ضمانت

## مرحله ۸: استقرار در تولید

```bash
# ۱. کپی و اجرای SQL Script در Supabase
# ۲. بروزرسانی کدهای React
# ۳. تست کامل سیستم
# ۴. فعال‌سازی در پیش‌فرض
```

## نکات مهم

- 🔒 حریم خصوصی: کاربران عادی لیست شرکت‌کنندگان را نمی‌بینند
- ⏰ خودکار: مهلت‌ها بدون cron بررسی می‌شوند
- 💰 ایمن: تمام مبالغ مسدود و ردیابی می‌شوند
- 📢 اطلاع‌رسانی: تمام تغییرات فوری اطلاع‌رسانی می‌شوند

## تماس‌گیری

برای سؤالات یا مشکلات، لطفاً به فایل `AUCTION_GUARANTEE_SYSTEM_IMPLEMENTATION.md` مراجعه کنید.
