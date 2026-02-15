import { supabase } from './services/supabase';

/**
 * Fix missing activation requests for existing purchase orders
 * This script creates activation requests for purchase orders that don't have one
 */
async function fixMissingActivationRequests() {
    console.log('🔧 Fixing missing activation requests...');
    
    try {
        // First, let's see all purchase orders
        const { data: allOrders, error: allError } = await supabase
            .from('purchase_orders')
            .select('*');
        
        console.log('📋 Total purchase orders:', allOrders?.length || 0);
        if (allOrders && allOrders.length > 0) {
            console.log('Sample order:', allOrders[0]);
        }
        
        // Get all purchase orders with line_type = 'inactive'
        const { data: orders, error: ordersError } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('line_type', 'inactive');
        
        if (ordersError) {
            console.error('❌ Error fetching orders:', ordersError);
            return;
        }
        
        if (!orders || orders.length === 0) {
            console.log('✅ No inactive orders found');
            return;
        }
        
        console.log(`📋 Found ${orders.length} inactive orders`);
        
        // Get sim card numbers
        for (const order of orders) {
            const { data: simCard } = await supabase
                .from('sim_cards')
                .select('number')
                .eq('id', order.sim_card_id)
                .single();
            
            (order as any).sim_number = simCard?.number || order.sim_card_id.toString();
        }
        
        for (const order of orders) {
            // Check if activation request already exists
            const { data: existingRequest, error: checkError } = await supabase
                .from('activation_requests')
                .select('id')
                .eq('purchase_order_id', order.id)
                .single();
            
            if (existingRequest) {
                console.log(`⏭️  Order #${order.id} already has activation request`);
                continue;
            }
            
            // Create activation request
            const { error: insertError } = await supabase
                .from('activation_requests')
                .insert({
                    purchase_order_id: order.id,
                    sim_card_id: order.sim_card_id,
                    buyer_id: order.buyer_id,
                    seller_id: order.seller_id,
                    sim_number: (order as any).sim_number,
                    buyer_name: 'خریدار', // Will be updated by trigger
                    seller_name: 'فروشنده', // Will be updated by trigger
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (insertError) {
                console.error(`❌ Error creating activation request for order #${order.id}:`, insertError);
            } else {
                console.log(`✅ Created activation request for order #${order.id}`);
            }
        }
        
        console.log('');
        console.log('✅ تمام activation request های گمشده ایجاد شدند!');
        console.log('📌 حالا فروشندگان می‌توانند سفارشات را در پنل خود ببینند');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the fix
fixMissingActivationRequests();
