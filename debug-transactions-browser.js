// این کد رو توی Browser Console کپی کن و اجرا کن
// (F12 -> Console)

(async function debugTransactions() {
    console.log('🔍 شروع debug تراکنش‌ها...\n');

    // دریافت supabase client از window
    const supabase = window.supabase || (await import('./services/api-supabase.ts')).default;
    
    // 1. بررسی کاربر از localStorage
    const authData = localStorage.getItem('sb-' + window.location.hostname.split('.')[0] + '-auth-token');
    if (authData) {
        const parsed = JSON.parse(authData);
        console.log('✅ کاربر لاگین شده:');
        console.log('   ID:', parsed.user?.id);
        console.log('   Type:', typeof parsed.user?.id);
        console.log('   Email:', parsed.user?.email);
    }

    // 2. دریافت تراکنش‌ها از DataContext
    console.log('\n📊 بررسی تراکنش‌ها از DataContext...');
    
    // اگه React DevTools داری، می‌تونی DataContext رو ببینی
    console.log('برای دیدن تراکنش‌ها:');
    console.log('1. React DevTools رو باز کن');
    console.log('2. DataProvider رو پیدا کن');
    console.log('3. transactions رو توی state ببین');
    
    console.log('\nیا این کد رو اجرا کن:');
    console.log('window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).getCurrentFiber()');
})();
