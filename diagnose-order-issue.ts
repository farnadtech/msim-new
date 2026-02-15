import { supabase } from './services/supabase';

async function diagnoseOrderIssue() {
    console.log('🔍 Starting diagnosis...\n');
    
    const orderId = 58;
    const sellerId = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';
    
    // Test 1: Check if order exists (no RLS)
    console.log('Test 1: Checking if order exists in database...');
    const { data: orderCheck, error: orderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', orderId);
    
    if (orderError) {
        console.error('❌ Error:', orderError);
    } else {
        console.log('✅ Order found:', orderCheck?.length || 0);
        if (orderCheck && orderCheck.length > 0) {
            console.log('📋 Order data:', JSON.stringify(orderCheck[0], null, 2));
        }
    }
    
    console.log('\n---\n');
    
    // Test 2: Check with seller_id filter
    console.log('Test 2: Checking with seller_id filter...');
    const { data: sellerOrders, error: sellerError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('seller_id', sellerId);
    
    if (sellerError) {
        console.error('❌ Error:', sellerError);
    } else {
        console.log('✅ Orders found for seller:', sellerOrders?.length || 0);
        if (sellerOrders && sellerOrders.length > 0) {
            console.log('📋 First order:', JSON.stringify(sellerOrders[0], null, 2));
        }
    }
    
    console.log('\n---\n');
    
    // Test 3: Check with OR filter (like getPurchaseOrders)
    console.log('Test 3: Checking with OR filter (buyer_id OR seller_id)...');
    const { data: orOrders, error: orError } = await supabase
        .from('purchase_orders')
        .select('*')
        .or(`buyer_id.eq.${sellerId},seller_id.eq.${sellerId}`);
    
    if (orError) {
        console.error('❌ Error:', orError);
    } else {
        console.log('✅ Orders found with OR filter:', orOrders?.length || 0);
        if (orOrders && orOrders.length > 0) {
            console.log('📋 First order:', JSON.stringify(orOrders[0], null, 2));
        }
    }
    
    console.log('\n---\n');
    
    // Test 4: Check with join (like getPurchaseOrders)
    console.log('Test 4: Checking with sim_cards join...');
    const { data: joinOrders, error: joinError } = await supabase
        .from('purchase_orders')
        .select(`
            *,
            sim_cards!inner(number)
        `)
        .or(`buyer_id.eq.${sellerId},seller_id.eq.${sellerId}`);
    
    if (joinError) {
        console.error('❌ Error:', joinError);
    } else {
        console.log('✅ Orders found with join:', joinOrders?.length || 0);
        if (joinOrders && joinOrders.length > 0) {
            console.log('📋 First order:', JSON.stringify(joinOrders[0], null, 2));
        }
    }
    
    console.log('\n---\n');
    
    // Test 5: Check current user session
    console.log('Test 5: Checking current user session...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
        console.error('❌ Error:', userError);
    } else if (user) {
        console.log('✅ Current user:', user.id);
        console.log('📧 Email:', user.email);
    } else {
        console.log('⚠️ No user logged in!');
    }
    
    console.log('\n---\n');
    
    // Test 6: Check activation_requests
    console.log('Test 6: Checking activation_requests...');
    const { data: activationRequests, error: activationError } = await supabase
        .from('activation_requests')
        .select('*')
        .eq('purchase_order_id', orderId);
    
    if (activationError) {
        console.error('❌ Error:', activationError);
    } else {
        console.log('✅ Activation requests found:', activationRequests?.length || 0);
        if (activationRequests && activationRequests.length > 0) {
            console.log('📋 Activation request:', JSON.stringify(activationRequests[0], null, 2));
        }
    }
    
    console.log('\n✅ Diagnosis complete!');
}

diagnoseOrderIssue().catch(console.error);
