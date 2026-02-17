import { supabase } from './services/supabase';

async function debugKYCIssue() {
    console.log('🔍 شروع دیباگ سیستم KYC...\n');

    // 1. بررسی کاربر فعلی
    console.log('1️⃣ بررسی کاربر فعلی:');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
        console.error('❌ خطا در دریافت کاربر:', authError);
        return;
    }
    
    if (!authUser) {
        console.error('❌ کاربری لاگین نیست');
        return;
    }
    
    console.log('✅ کاربر لاگین است:', authUser.id);

    // 2. بررسی نقش کاربر
    console.log('\n2️⃣ بررسی نقش کاربر:');
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, phone_number, role, is_verified')
        .eq('id', authUser.id)
        .single();

    if (userError) {
        console.error('❌ خطا در دریافت اطلاعات کاربر:', userError);
        return;
    }

    console.log('✅ اطلاعات کاربر:', userData);
    
    if (userData.role !== 'admin') {
        console.error('❌ کاربر ادمین نیست! نقش فعلی:', userData.role);
        return;
    }
    
    console.log('✅ کاربر ادمین است');

    // 3. بررسی تعداد کل درخواست‌ها (بدون فیلتر RLS)
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
        console.error('جزئیات خطا:', JSON.stringify(fetchError, null, 2));
    } else {
        console.log('✅ تعداد درخواست‌های دریافت شده:', verifications?.length || 0);
        if (verifications && verifications.length > 0) {
            console.log('نمونه اولین درخواست:', verifications[0]);
        }
    }

    // 5. بررسی RLS policies
    console.log('\n5️⃣ بررسی RLS policies:');
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
        sql: `
            SELECT policyname, cmd, qual 
            FROM pg_policies 
            WHERE tablename = 'kyc_verifications'
        `
    }).catch(() => {
        console.log('⚠️ نمی‌توان policies را از طریق RPC بررسی کرد');
        return { data: null, error: null };
    });

    if (policies) {
        console.log('✅ Policies:', policies);
    }

    // 6. تست مستقیم با فیلتر pending
    console.log('\n6️⃣ تست با فیلتر pending:');
    const { data: pendingData, error: pendingError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (pendingError) {
        console.error('❌ خطا در دریافت pending:', pendingError);
    } else {
        console.log('✅ تعداد pending:', pendingData?.length || 0);
    }

    // 7. خلاصه نتایج
    console.log('\n📊 خلاصه نتایج:');
    console.log('- کاربر لاگین:', authUser ? '✅' : '❌');
    console.log('- نقش ادمین:', userData?.role === 'admin' ? '✅' : '❌');
    console.log('- تعداد کل درخواست‌ها:', count || 0);
    console.log('- درخواست‌های دریافت شده:', verifications?.length || 0);
    console.log('- خطا در دریافت:', fetchError ? '❌' : '✅');

    if (fetchError) {
        console.log('\n🔧 راه‌حل پیشنهادی:');
        console.log('1. اسکریپت supabase/fix-kyc-rls.sql را در SQL Editor اجرا کنید');
        console.log('2. مطمئن شوید که جدول kyc_verifications وجود دارد');
        console.log('3. Cache مرورگر را پاک کنید');
    }

    if (count === 0) {
        console.log('\n💡 نکته: هیچ درخواست KYC در دیتابیس وجود ندارد');
        console.log('برای ایجاد درخواست تستی، اسکریپت supabase/create-test-kyc.sql را اجرا کنید');
    }
}

// اجرای دیباگ
debugKYCIssue().catch(console.error);
