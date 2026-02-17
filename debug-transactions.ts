import api from './services/api-supabase';

// اسکریپت دیباگ برای بررسی تراکنش‌ها

async function debugTransactions() {
    try {
        console.log('🔍 شروع دیباگ تراکنش‌ها...');
        
        // دریافت تمام تراکنش‌ها
        const allTransactions = await api.getTransactions();
        console.log('📊 تعداد کل تراکنش‌ها:', allTransactions.length);
        
        // فیلتر تراکنش‌های خریدار
        const buyerTransactions = allTransactions.filter(
            t => t.user_id === '5f4488db-9bed-4162-8925-d187f8bb423d'
        );
        console.log('👤 تراکنش‌های خریدار (09155060867):', buyerTransactions.length);
        console.log('تراکنش‌های خریدار:', buyerTransactions);
        
        // فیلتر تراکنش‌های فروشنده
        const sellerTransactions = allTransactions.filter(
            t => t.user_id === 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
        );
        console.log('👤 تراکنش‌های فروشنده (09236963201):', sellerTransactions.length);
        console.log('تراکنش‌های فروشنده:', sellerTransactions);
        
        // تراکنش‌های مربوط به حراجی 44444422222
        const auctionTransactions = allTransactions.filter(
            t => t.description && t.description.includes('44444422222')
        );
        console.log('🏆 تراکنش‌های حراجی 44444422222:', auctionTransactions.length);
        console.log('تراکنش‌های حراجی:', auctionTransactions);
        
    } catch (error) {
        console.error('❌ خطا در دیباگ:', error);
    }
}

debugTransactions();
