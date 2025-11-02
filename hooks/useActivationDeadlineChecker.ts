import { useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

/**
 * Hook to check and auto-cancel purchase orders that exceed 48-hour activation deadline
 * - Cancels orders where seller hasn't activated the line within 48 hours
 * - Returns money to buyer's withdrawable balance
 * - Adds negative score to seller
 * - Runs every 5 minutes
 */
const useActivationDeadlineChecker = () => {
    const checkAndCancelExpiredOrders = useCallback(async () => {
        try {
            console.log('🕐 Checking for expired activation deadlines...');

            // Get all purchase orders that are past deadline and not cancelled
            const { data: expiredOrders, error } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    sim_cards (*),
                    buyer:users!buyer_id (id, name, email, wallet_balance),
                    seller:users!seller_id (id, name, email, negative_score, is_suspended)
                `)
                .not('is_cancelled', 'eq', true)
                .not('status', 'eq', 'completed')
                .not('status', 'eq', 'cancelled')
                .lt('activation_deadline', new Date().toISOString());

            if (error) {
                console.error('❌ Error fetching expired orders:', error);
                return;
            }

            if (!expiredOrders || expiredOrders.length === 0) {
                console.log('✅ No expired orders found');
                return;
            }

            console.log(`⚠️ Found ${expiredOrders.length} expired order(s)`);

            for (const order of expiredOrders) {
                try {
                    // Start a transaction-like operation
                    console.log(`Processing expired order #${order.id}`);

                    // 1. Return money to buyer
                    const newBuyerBalance = (order.buyer.wallet_balance || 0) + order.buyer_blocked_amount;
                    const { error: buyerError } = await supabase
                        .from('users')
                        .update({ wallet_balance: newBuyerBalance })
                        .eq('id', order.buyer_id);

                    if (buyerError) throw buyerError;

                    // 2. Add negative score to seller
                    const newNegativeScore = (order.seller.negative_score || 0) + 1;
                    const { error: sellerError } = await supabase
                        .from('users')
                        .update({ 
                            negative_score: newNegativeScore,
                            last_penalty_at: new Date().toISOString()
                        })
                        .eq('id', order.seller_id);

                    if (sellerError) throw sellerError;

                    // 3. Cancel the purchase order
                    const { error: orderError } = await supabase
                        .from('purchase_orders')
                        .update({
                            is_cancelled: true,
                            status: 'cancelled',
                            cancellation_reason: 'فروشنده خط را در مهلت 48 ساعته فعال نکرد',
                            cancelled_at: new Date().toISOString()
                        })
                        .eq('id', order.id);

                    if (orderError) throw orderError;

                    // 4. Make sim card available again if not sold
                    if (order.sim_cards && order.sim_cards.status !== 'sold') {
                        const { error: simError } = await supabase
                            .from('sim_cards')
                            .update({ status: 'available' })
                            .eq('id', order.sim_card_id);

                        if (simError) throw simError;
                    }

                    // 5. Create notifications
                    // Notify buyer
                    await supabase.from('notifications').insert({
                        user_id: order.buyer_id,
                        title: 'لغو سفارش به دلیل عدم فعال‌سازی',
                        message: `سفارش شماره ${order.id} به دلیل عدم فعال‌سازی خط توسط فروشنده لغو شد. مبلغ ${order.buyer_blocked_amount.toLocaleString('fa-IR')} تومان به کیف پول شما بازگشت داده شد.`,
                        type: 'warning'
                    });

                    // Notify seller
                    await supabase.from('notifications').insert({
                        user_id: order.seller_id,
                        title: 'لغو سفارش و اعمال جریمه',
                        message: `سفارش شماره ${order.id} به دلیل عدم فعال‌سازی در مهلت 48 ساعته لغو شد. یک امتیاز منفی به حساب شما اضافه شد.`,
                        type: 'error'
                    });

                    console.log(`✅ Successfully cancelled order #${order.id} and penalized seller`);
                } catch (err) {
                    console.error(`❌ Error processing order #${order.id}:`, err);
                }
            }

            console.log('✅ Activation deadline check completed');
        } catch (error) {
            console.error('❌ Error in activation deadline checker:', error);
        }
    }, []);

    useEffect(() => {
        // Run immediately on mount
        checkAndCancelExpiredOrders();

        // Then run every 5 minutes
        const interval = setInterval(checkAndCancelExpiredOrders, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [checkAndCancelExpiredOrders]);
};

export default useActivationDeadlineChecker;
