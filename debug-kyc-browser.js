// این کد را در Console مرورگر (F12) کپی و اجرا کنید
// وقتی در صفحه /admin/kyc-management هستید

(async function debugKYC() {
    console.log('🔍 شروع دیباگ سیستم KYC...\n');

    // دسترسی به supabase از window
    const supabase = window.supabase || (await import('./services/supabase.js')).supabase;

    // 1. بررسی کاربر فعلی
    console.log('1️⃣ بررسی کاربر فعلی:');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
        console.error('❌ خطا در دریافت کاربر:', authError);
        return;
    }
    
    if (!user) {
        console.error('❌ کاربری لاگین نیست');
        return;
    }
    
    console.log('✅ کاربر لاگین است:', user.id);

    // 2. بررسی نقش کاربر
    console.log('\n2️⃣ بررسی نقش کاربر:');
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, phone_number, role, is_verified')
        .eq('id', user.id)
        .single();

    if (userError) {
        console.error('❌ خطا در دریافت اطلاعات کاربر:', userError);
    } else {
        console.log('✅ اطلاعات کاربر:', userData);
        console.log('نقش:', userData.role);
    }

    // 3. بررسی تعداد کل درخواست‌ها
    console.log('\n3️⃣ بررسی تعداد کل درخواست‌ها:');
    const { count, error: countError } = await supabase
        .from('kyc_verifications')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ خطا در شمارش:', countError);
    } else {
        console.log('✅ تعداد کل درخواست‌ها:', count);
    }

    // 4. تلاش برای دریافت درخواست‌ها
    console.log('\n4️⃣ تلاش برای دریافت درخواست‌ها:');
    const { data: verifications, error: fetchError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (fetchError) {
        console.error('❌ خطا در دریافت درخواست‌ها:', fetchError);
        console.error('کد خطا:', fetchError.code);
        console.error('پیام:', fetchError.message);
        console.error('جزئیات:', fetchError.details);
    } else {
        console.log('✅ تعداد درخواست‌های دریافت شده:', verifications?.length || 0);
        if (verifications && verifications.length > 0) {
            console.log('نمونه اولین درخواست:', verifications[0]);
        } else {
            console.log('⚠️ هیچ درخواستی یافت نشد');
        }
    }

    // 5. خلاصه نتایج
    console.log('\n📊 خلاصه نتایج:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('کاربر لاگین:', user ? '✅' : '❌');
    console.log('نقش ادمین:', userData?.role === 'admin' ? '✅' : '❌');
    console.log('تعداد کل درخواست‌ها:', count ?? 'نامشخص');
    console.log('درخواست‌های دریافت شده:', verifications?.length ?? 0);
    console.log('خطا در دریافت:', fetchError ? '❌ بله' : '✅ خیر');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 6. راهنمایی
    if (fetchError) {
        console.log('\n🔧 راه‌حل پیشنهادی:');
        if (fetchError.code === 'PGRST116') {
            console.log('❌ جدول kyc_verifications وجود ندارد!');
            console.log('👉 اسکریپت supabase/create-kyc-verification-table.sql را اجرا کنید');
        } else if (fetchError.code === '42501' || fetchError.message.includes('permission')) {
            console.log('❌ مشکل RLS - دسترسی رد شد');
            console.log('👉 اسکریپت supabase/fix-kyc-rls.sql را اجرا کنید');
        } else {
            console.log('❌ خطای ناشناخته');
            console.log('👉 به تب Network بروید و درخواست kyc_verifications را بررسی کنید');
        }
    } else if (count === 0) {
        console.log('\n💡 نکته: هیچ درخواست KYC در دیتابیس وجود ندارد');
        console.log('👉 یک کاربر باید فرم احراز هویت را پر کند');
        console.log('👉 یا اسکریپت supabase/create-test-kyc.sql را اجرا کنید');
    } else if (verifications && verifications.length === 0 && count > 0) {
        console.log('\n⚠️ داده وجود دارد اما RLS آن را فیلتر می‌کند');
        console.log('👉 اسکریپت supabase/fix-kyc-rls.sql را اجرا کنید');
    }

    console.log('\n✅ دیباگ تمام شد');
})();
