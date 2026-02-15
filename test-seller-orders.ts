import { supabase } from './services/supabase';

async function testSellerOrders() {
    console.log('🔍 شروع تست نمایش سفارشات فروشنده...\n');
    
    const sellerId = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';
    const orderId = 58;
    
    // Test 1: Check current user
    console.log('📋 مرحله 1: بررسی کاربر فعلی');
    console.log('─────────────────────────────────');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
        console.error('❌ خطا:', userError.message);
        console.log('⚠️  شما لاگین نیستید! لطفاً ابتدا وارد شوید.\n');
        return;
    }
    
    if (!user) {
        console.log('⚠️  هیچ کاربری لاگین نیست!\n');
        return;
    }
    
    console.log('✅ کاربر فعلی:', user.id);
    console.log('📧 ایمیل:', user.email);
    
    if (user.id !== sellerId) {
        console.log('⚠️  توجه: شما با حساب فروشنده لاگین نیستید!');
        console.log('   کاربر فعلی:', user.id);
        console.log('   فروشنده مورد نظر:', sellerId);
        console.log('   لطفاً با حساب فروشنده وارد شوید.\n');
    } else {
        console.log('✅ شما با حساب فروشنده لاگین هستید!\n');
    }
    
    // Test 2: Get user profile
    console.log('📋 مرحله 2: بررسی پروفایل کاربر');
    console.log('─────────────────────────────────');
    const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', user.id)
        .single();
    
    if (profileError) {
        console.error('❌ خطا:', profileError.message);
    } else {
        console.log('✅ نام:', profile.name);
        console.log('✅ نقش:', profile.role);
    }
    console.log('');
    
    // Test 3: Direct query for order 58
    console.log('📋 مرحله 3: کوئری مستقیم سفارش 58');
    console.log('─────────────────────────────────');
    const { data: directOrder, error: directError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', orderId);
    
    if (directError) {
        console.error('❌ خطا:', directError.message);
    } else {
        console.log('✅ تعداد نتایج:', directOrder?.length || 0);
        if (directOrder && directOrder.length > 0) {
            console.log('📦 سفارش:', JSON.stringify(directOrder[0], null, 2));
        } else {
            console.log('⚠️  RLS این سفارش را مسدود کرده است!');
        }
    }
    console.log('');
    
    // Test 4: Query with seller_id filter
    console.log('📋 مرحله 4: کوئری با فیلتر seller_id');
    console.log('─────────────────────────────────');
    const { data: sellerOrders, error: sellerError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('seller_id', user.id);
    
    if (sellerError) {
        console.error('❌ خطا:', sellerError.message);
    } else {
        console.log('✅ تعداد سفارشات فروشنده:', sellerOrders?.length || 0);
        if (sellerOrders && sellerOrders.length > 0) {
            console.log('📦 اولین سفارش:', JSON.stringify(sellerOrders[0], null, 2));
        }
    }
    console.log('');
    
    // Test 5: Query with OR filter (like getPurchaseOrders)
    console.log('📋 مرحله 5: کوئری با OR (مثل تابع getPurchaseOrders)');
    console.log('─────────────────────────────────');
    const { data: orOrders, error: orError } = await supabase
        .from('purchase_orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    
    if (orError) {
        console.error('❌ خطا:', orError.message);
    } else {
        console.log('✅ تعداد سفارشات (با OR):', orOrders?.length || 0);
        if (orOrders && orOrders.length > 0) {
            console.log('📦 اولین سفارش:', JSON.stringify(orOrders[0], null, 2));
        }
    }
    console.log('');
    
    // Test 6: Query with JOIN (exactly like getPurchaseOrders)
    console.log('📋 مرحله 6: کوئری با JOIN (دقیقاً مثل کد اصلی)');
    console.log('─────────────────────────────────');
    const { data: joinOrders, error: joinError } = await supabase
        .from('purchase_orders')
        .select(`
            *,
            sim_cards!inner(number)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    
    if (joinError) {
        console.error('❌ خطا:', joinError.message);
        console.log('⚠️  مشکل احتمالاً از JOIN است!');
    } else {
        console.log('✅ تعداد سفارشات (با JOIN):', joinOrders?.length || 0);
        if (joinOrders && joinOrders.length > 0) {
            console.log('📦 اولین سفارش:', JSON.stringify(joinOrders[0], null, 2));
        } else {
            console.log('⚠️  JOIN هیچ نتیجه‌ای برنگرداند!');
            console.log('   این می‌تواند به دلیل RLS روی جدول sim_cards باشد.');
        }
    }
    console.log('');
    
    // Test 7: Check activation_requests
    console.log('📋 مرحله 7: بررسی activation_requests');
    console.log('─────────────────────────────────');
    const { data: activationReqs, error: activationError } = await supabase
        .from('activation_requests')
        .select('*')
        .eq('seller_id', user.id);
    
    if (activationError) {
        console.error('❌ خطا:', activationError.message);
    } else {
        console.log('✅ تعداد درخواست‌های فعال‌سازی:', activationReqs?.length || 0);
        if (activationReqs && activationReqs.length > 0) {
            console.log('📦 اولین درخواست:', JSON.stringify(activationReqs[0], null, 2));
        }
    }
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 خلاصه نتایج:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('کاربر فعلی:', user.id === sellerId ? '✅ فروشنده' : '❌ فروشنده نیست');
    console.log('سفارش 58 (مستقیم):', directOrder && directOrder.length > 0 ? '✅ پیدا شد' : '❌ پیدا نشد');
    console.log('سفارشات فروشنده:', sellerOrders && sellerOrders.length > 0 ? `✅ ${sellerOrders.length} سفارش` : '❌ هیچ سفارشی');
    console.log('سفارشات با OR:', orOrders && orOrders.length > 0 ? `✅ ${orOrders.length} سفارش` : '❌ هیچ سفارشی');
    console.log('سفارشات با JOIN:', joinOrders && joinOrders.length > 0 ? `✅ ${joinOrders.length} سفارش` : '❌ هیچ سفارشی');
    console.log('درخواست‌های فعال‌سازی:', activationReqs && activationReqs.length > 0 ? `✅ ${activationReqs.length} درخواست` : '❌ هیچ درخواستی');
    console.log('');
    
    // Diagnosis
    console.log('🔍 تشخیص:');
    console.log('─────────────────────────────────');
    
    if (user.id !== sellerId) {
        console.log('❌ مشکل: شما با حساب فروشنده لاگین نیستید!');
        console.log('   راه حل: خارج شوید و با حساب فروشنده وارد شوید.');
    } else if (!directOrder || directOrder.length === 0) {
        console.log('❌ مشکل: RLS سفارش 58 را مسدود کرده است!');
        console.log('   راه حل: سیاست‌های RLS را دوباره بررسی کنید.');
        console.log('   فایل: supabase/complete-fix-for-order-58.sql');
    } else if (!joinOrders || joinOrders.length === 0) {
        console.log('❌ مشکل: JOIN با sim_cards کار نمی‌کند!');
        console.log('   راه حل: RLS روی جدول sim_cards را بررسی کنید.');
    } else {
        console.log('✅ همه چیز درست است! سفارش باید نمایش داده شود.');
        console.log('   اگر هنوز نمایش داده نمی‌شود، مشکل از کامپوننت React است.');
    }
    
    console.log('\n✅ تست تمام شد!');
}

// Run the test
testSellerOrders().catch(console.error);
