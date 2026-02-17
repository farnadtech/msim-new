// Debug اسکریپت برای بررسی مشکل تراکنش‌ها

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ متغیرهای محیطی یافت نشدند!');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'موجود' : 'خالی');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'موجود' : 'خالی');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTransactions() {
    console.log('🔍 شروع debug تراکنش‌ها...\n');

    // 1. بررسی کاربر لاگین شده
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        console.error('❌ کاربر لاگین نیست');
        return;
    }
    
    console.log('✅ کاربر لاگین شده:');
    console.log('   ID:', user.id);
    console.log('   Type:', typeof user.id);
    console.log('   Email:', user.email);
    console.log('');

    // 2. دریافت تراکنش‌ها
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*');
    
    if (txError) {
        console.error('❌ خطا در دریافت تراکنش‌ها:', txError.message);
        return;
    }
    
    console.log('📊 تعداد کل تراکنش‌ها:', transactions?.length || 0);
    
    if (transactions && transactions.length > 0) {
        // نمایش نمونه تراکنش
        const sample = transactions[0];
        console.log('\n📝 نمونه تراکنش:');
        console.log('   user_id:', sample.user_id);
        console.log('   user_id type:', typeof sample.user_id);
        console.log('   amount:', sample.amount);
        console.log('   description:', sample.description);
        
        // فیلتر کردن تراکنش‌های کاربر
        const myTransactions = transactions.filter((t: any) => {
            const txUserId = typeof t.user_id === 'string' ? t.user_id : String(t.user_id);
            const match = txUserId === user.id;
            
            if (!match && transactions.indexOf(t) < 3) {
                console.log(`\n   ⚠️ تراکنش ${t.id} match نشد:`);
                console.log(`      t.user_id: "${txUserId}" (${typeof t.user_id})`);
                console.log(`      user.id: "${user.id}" (${typeof user.id})`);
            }
            
            return match;
        });
        
        console.log('\n✅ تراکنش‌های کاربر فعلی:', myTransactions.length);
        
        if (myTransactions.length > 0) {
            console.log('\n📋 لیست تراکنش‌های کاربر:');
            myTransactions.slice(0, 5).forEach((t: any) => {
                console.log(`   - ${t.description} | ${t.amount} تومان | ${new Date(t.date).toLocaleDateString('fa-IR')}`);
            });
        } else {
            console.log('\n⚠️ هیچ تراکنشی برای این کاربر یافت نشد!');
            
            // نمایش user_id های موجود
            const uniqueUserIds = [...new Set(transactions.map((t: any) => String(t.user_id)))];
            console.log('\n📋 user_id های موجود در تراکنش‌ها:');
            uniqueUserIds.slice(0, 5).forEach(id => {
                console.log(`   - ${id}`);
            });
        }
    } else {
        console.log('⚠️ هیچ تراکنشی در دیتابیس وجود ندارد!');
    }
}

debugTransactions().catch(console.error);
