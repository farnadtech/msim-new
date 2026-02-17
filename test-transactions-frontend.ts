// اسکریپت تست برای بررسی مشکل نمایش تراکنش‌ها

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTransactions() {
    console.log('🔍 شروع تست تراکنش‌ها...\n');

    // 1. بررسی وضعیت لاگین
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        console.error('❌ کاربر لاگین نیست:', authError?.message);
        return;
    }
    
    console.log('✅ کاربر لاگین شده:', user.id);
    console.log('📧 ایمیل:', user.email);
    console.log('');

    // 2. دریافت تراکنش‌ها (مثل فرانت)
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*');
    
    if (txError) {
        console.error('❌ خطا در دریافت تراکنش‌ها:', txError.message);
        console.error('جزئیات:', txError);
        return;
    }
    
    console.log('📊 تعداد تراکنش‌های دریافت شده:', transactions?.length || 0);
    
    if (transactions && transactions.length > 0) {
        console.log('\n📝 نمونه تراکنش‌ها:');
        transactions.slice(0, 5).forEach((t: any) => {
            console.log(`  - ${t.description} | ${t.amount} تومان | ${t.type} | ${new Date(t.date).toLocaleDateString('fa-IR')}`);
        });
    } else {
        console.log('⚠️ هیچ تراکنشی یافت نشد!');
        
        // 3. بررسی مستقیم در دیتابیس (بدون RLS)
        console.log('\n🔍 بررسی تراکنش‌های موجود در دیتابیس...');
        
        const { data: allTx, error: allError } = await supabase
            .rpc('get_user_transactions', { p_user_id: user.id });
        
        if (allError) {
            console.log('⚠️ تابع RPC موجود نیست - این طبیعی است');
        } else {
            console.log('📊 تراکنش‌های موجود:', allTx?.length || 0);
        }
    }
    
    // 4. بررسی RLS policies
    console.log('\n🔐 بررسی RLS policies...');
    const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'transactions');
    
    if (!policyError && policies) {
        console.log('📋 Policies فعال:', policies.length);
        policies.forEach((p: any) => {
            console.log(`  - ${p.policyname} (${p.cmd})`);
        });
    }
}

// اجرای تست
testTransactions().catch(console.error);
