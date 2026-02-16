import { supabase } from './supabase';
import * as settingsService from './settings-service';
import { createNotification, createNotificationForAdmins } from './api-supabase';

/**
 * AUCTION GUARANTEE DEPOSIT SYSTEM
 * Implements transparent, fair auction mechanism with guarantee deposits
 */

/**
 * Check if user has sufficient wallet balance for guarantee deposit
 * Guarantee deposit = 5% of auction base price (ONLY for first bid)
 * For subsequent bids: no additional deposit needed
 */
export const checkGuaranteeDepositBalance = async (
    userId: string,
    auctionId: number,
    basePrice: number,
    simId?: number
): Promise<{ hasBalance: boolean; requiredAmount: number; currentBalance: number }> => {
    // Check if this is the user's first bid in this auction
    let isFirstBid = true;
    if (simId && auctionId) {
        // Check if there's an existing auction_participants record
        const { data: existingParticipants, error: participantError } = await supabase
            .from('auction_participants')
            .select('id, bid_count, guarantee_deposit_amount')
            .eq('auction_id', auctionId)
            .eq('user_id', userId)
            .eq('sim_card_id', simId);
        
        if (participantError) {
        }
        
        // If we found any participant record, this is NOT the first bid
        isFirstBid = !existingParticipants || existingParticipants.length === 0;
    }

    // Only require deposit for first bid - ZERO for subsequent bids
    const guaranteeRate = await settingsService.getAuctionGuaranteeRate();
    const requiredAmount = isFirstBid ? Math.floor(basePrice * guaranteeRate) : 0;

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('wallet_balance, blocked_balance')
        .eq('id', userId)
        .single();

    if (userError) {
        throw new Error('کاربر یافت نشد');
    }

    const currentBalance = userData.wallet_balance || 0;
    const blockedBalance = userData.blocked_balance || 0;
    const availableBalance = currentBalance - blockedBalance;
    return {
        hasBalance: availableBalance >= requiredAmount,
        requiredAmount,
        currentBalance: availableBalance
    };
};

/**
 * Place a bid with guarantee deposit mechanism
 * For first bid: blocks 5% of base price as guarantee
 * For subsequent bids: no additional guarantee required
 */
export const placeBidWithGuaranteeDeposit = async (
    simId: number,
    auctionId: number,
    bidderId: string,
    amount: number,
    basePrice: number
): Promise<void> => {
    // Get auction details
    const { data: auctionDetails, error: auctionError } = await supabase
        .from('auction_details')
        .select('*')
        .eq('id', auctionId)
        .single();

    if (auctionError) {
        throw new Error('جزئیات حراجی یافت نشد');
    }
    if (auctionDetails.status === 'ended' || auctionDetails.status === 'completed' || auctionDetails.status === 'cancelled') {
        throw new Error('این حراجی به پایان رسیده یا لغو شده است');
    }

    if (new Date(auctionDetails.end_time) < new Date()) {
        throw new Error('این حراجی به پایان رسیده است');
    }

    if (amount <= auctionDetails.current_bid) {
        throw new Error(`پیشنهاد شما باید بیشتر از ${auctionDetails.current_bid.toLocaleString('fa-IR')} تومان باشد`);
    }

    // Get bidder data
    const { data: bidderData, error: bidderError } = await supabase
        .from('users')
        .select('*')
        .eq('id', bidderId)
        .single();

    if (bidderError) {
        throw new Error('کاربر یافت نشد');
    }

    const bidderWalletBalance = bidderData.wallet_balance || 0;
    const bidderBlockedBalance = bidderData.blocked_balance || 0;
    const availableBalance = bidderWalletBalance - bidderBlockedBalance;
    // Check if user is participating in this auction for the first time
    // Use a more robust approach to check for existing participation
    const { data: existingParticipants, error: participantCheckError } = await supabase
        .from('auction_participants')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('user_id', bidderId)
        .eq('sim_card_id', simId);
    const isFirstBid = !existingParticipants || existingParticipants.length === 0;
    // Calculate guarantee deposit with explicit integer conversion
    const guaranteeRate = await settingsService.getAuctionGuaranteeRate();
    const rawCalculation = basePrice * guaranteeRate;
    const guaranteeDepositAmount = isFirstBid ? Math.floor(rawCalculation) : 0; // Dynamic % of base price for first bid
    const totalRequiredAmount = isFirstBid ? guaranteeDepositAmount : 0; // Only require guarantee for first bid, not the full bid amount
    // Check if user has sufficient balance
    // Add small tolerance for floating point precision issues
    const tolerance = 1; // 1 Toman tolerance
    if (availableBalance + tolerance < totalRequiredAmount) {
        throw new Error(`موجودی کیف پول برای ثبت این پیشنهاد کافی نیست. مورد نیاز: ${totalRequiredAmount.toLocaleString('fa-IR')} تومان`);
    }

    // Get SIM card info for notifications
    const { data: simData } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simId)
        .single();

    // Previous bidder keeps their guarantee deposit blocked
    // We DON'T unblock anything here - guarantee stays until auction ends
    const previousHighestBidderId = auctionDetails.highest_bidder_id;
    if (previousHighestBidderId && previousHighestBidderId !== bidderId) {
        // Just notify the outbid user
        await createNotification(
            previousHighestBidderId,
            '❌ پیشنهاد شما بالاتر شد',
            `پیشنهاد شما برای سیمکارت ${simData?.number} توسط پیشنهاد دیگری بالاتر شد`,
            'warning'
        );
    }

    // For first-time bidders, ONLY block the guarantee deposit (NOT the bid amount)
    // CRITICAL: We BLOCK the deposit, not deduct it from wallet!
    // The deposit stays in blocked_balance until auction ends
    if (isFirstBid && guaranteeDepositAmount > 0) {
        // IMPORTANT: We only UPDATE blocked_balance, NOT wallet_balance!
        // The money stays in the wallet but is marked as blocked
        const newBidderBlockedBalance = bidderBlockedBalance + guaranteeDepositAmount;
        await supabase
            .from('users')
            .update({
                blocked_balance: newBidderBlockedBalance
            })
            .eq('id', bidderId);

        // Record guarantee deposit
        await supabase
            .from('guarantee_deposits')
            .insert({
                user_id: bidderId,
                auction_id: auctionId,
                sim_card_id: simId,
                amount: guaranteeDepositAmount,
                status: 'blocked',
                reason: 'حق ضمانت اولین پیشنهاد'
            });

        // Record transaction for guarantee deposit
        await supabase
            .from('transactions')
            .insert({
                user_id: bidderId,
                type: 'debit_blocked',
                amount: -guaranteeDepositAmount,
                description: `حق ضمانت حراجی سیمکارت ${simData?.number}`,
                date: new Date().toISOString()
            });
    }

    // Add bid to bids table
    await supabase
        .from('bids')
        .insert({
            sim_card_id: simId,
            user_id: bidderId,
            amount: amount,
            date: new Date().toISOString()
        });

    // Update auction participant or create new one
    if (existingParticipants && existingParticipants.length > 0) {
        // Update existing participant
        const { error: updateParticipantError } = await supabase
            .from('auction_participants')
            .update({
                highest_bid: amount,
                bid_count: existingParticipants[0].bid_count + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingParticipants[0].id);
        
        if (updateParticipantError) {
            throw new Error('خطا در به‌روزرسانی شرکت‌کننده: ' + updateParticipantError.message);
        }
    } else {
        // Create new participant
        const { data: newParticipant, error: insertParticipantError } = await supabase
            .from('auction_participants')
            .insert({
                auction_id: auctionId,
                sim_card_id: simId,
                user_id: bidderId,
                highest_bid: amount,
                bid_count: 1,
                guarantee_deposit_amount: guaranteeDepositAmount,
                guarantee_deposit_blocked: isFirstBid
            })
            .select();
        
        if (insertParticipantError) {
            throw new Error('خطا در ثبت شرکت‌کننده: ' + insertParticipantError.message);
        }
    }

    // Update auction details
    await supabase
        .from('auction_details')
        .update({
            current_bid: amount,
            highest_bidder_id: bidderId,
            updated_at: new Date().toISOString()
        })
        .eq('id', auctionId);

    // Get bidder name for notifications
    const { data: bidderNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', bidderId)
        .single();

    const bidderName = bidderNameData?.name || 'بیدار';

    // Notify seller about new bid
    if (simData?.seller_id) {
        await createNotification(
            simData.seller_id,
            '📢 پیشنهاد جدید',
            `${bidderName} با مبلغ ${amount.toLocaleString('fa-IR')} تومان برای سیمکارت ${simData.number} پیشنهاد کرد`,
            'info'
        );
    }

    // Notify bidder
    await createNotification(
        bidderId,
        '✅ پیشنهاد شما ثبت شد',
        `پیشنهاد ${amount.toLocaleString('fa-IR')} تومان برای سیمکارت ${simData?.number} ثبت شد${isFirstBid ? ` - ${guaranteeDepositAmount.toLocaleString('fa-IR')} تومان حق ضمانت کسر شد` : ''}`,
        'success'
    );
};

/**
 * Process ended auctions:
 * 1. Rank bidders and keep top 3 as winners
 * 2. Release guarantee deposits for other bidders
 * 3. Create winner payment queue for top 3
 */
export const processAuctionEnding = async (auctionId: number): Promise<void> => {
    // Get auction details
    const { data: auctionDetails, error: auctionError } = await supabase
        .from('auction_details')
        .select('*')
        .eq('id', auctionId)
        .single();

    if (auctionError) {
        throw new Error('جزئیات حراجی یافت نشد');
    }

    if (auctionDetails.status !== 'active') {
        return;
    }

    // Get all participants ranked by highest bid (descending)
    const { data: participants, error: participantsError } = await supabase
        .from('auction_participants')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('sim_card_id', auctionDetails.sim_card_id)
        .order('highest_bid', { ascending: false });

    if (participantsError) {
        throw new Error('خطا در دریافت شرکت‌کنندگان');
    }

    if (!participants || participants.length === 0) {
        // No bids, cancel auction
        await supabase
            .from('auction_details')
            .update({ status: 'cancelled' })
            .eq('id', auctionId);
        return;
    }

    // Mark top winners and update ranks
    const topWinnersCount = await settingsService.getAuctionTopWinnersCount();
    const topThree = participants.slice(0, topWinnersCount);
    const others = participants.slice(3);

    // Update top 3 participants
    for (let i = 0; i < topThree.length; i++) {
        await supabase
            .from('auction_participants')
            .update({
                rank: i + 1,
                is_top_3: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', topThree[i].id);
    }

    // Update other participants
    for (const participant of others) {
        await supabase
            .from('auction_participants')
            .update({
                rank: participants.indexOf(participant) + 1,
                is_top_3: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', participant.id);
    }

    // Release deposits for non-top-3 bidders
    for (const participant of others) {
        if (participant.guarantee_deposit_amount > 0) {
            // Release guarantee deposit
            await supabase
                .from('guarantee_deposits')
                .update({
                    status: 'released',
                    reason: 'حق ضمانت برگشت (برنده شامل نشد)',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', participant.user_id)
                .eq('auction_id', auctionId)
                .eq('sim_card_id', auctionDetails.sim_card_id);

            // Refund to user wallet
            const { data: userData } = await supabase
                .from('users')
                .select('wallet_balance')
                .eq('id', participant.user_id)
                .single();

            if (userData) {
                await supabase
                    .from('users')
                    .update({
                        wallet_balance: (userData.wallet_balance || 0) + participant.guarantee_deposit_amount
                    })
                    .eq('id', participant.user_id);
            }

            // Record transaction
            await supabase
                .from('transactions')
                .insert({
                    user_id: participant.user_id,
                    type: 'credit',
                    amount: participant.guarantee_deposit_amount,
                    description: 'برگشت حق ضمانت حراجی',
                    date: new Date().toISOString()
                });

            // Notify user
            const { data: simData } = await supabase
                .from('sim_cards')
                .select('number')
                .eq('id', auctionDetails.sim_card_id)
                .single();

            await createNotification(
                participant.user_id,
                '💰 حق ضمانت برگشت داده شد',
                `حق ضمانت ${participant.guarantee_deposit_amount.toLocaleString('fa-IR')} تومان برای سیمکارت ${simData?.number} برگشت داده شد`,
                'info'
            );
        }
    }

    // Create winner payment queue for top winners
    for (const winner of topThree) {
        const paymentDeadline = new Date();
        const deadlineHours = await settingsService.getAuctionPaymentDeadlineHours();
        paymentDeadline.setHours(paymentDeadline.getHours() + deadlineHours);

        const remainingAmount = winner.highest_bid - (winner.guarantee_deposit_amount || 0);

        await supabase
            .from('auction_winner_queue')
            .insert({
                auction_id: auctionId,
                sim_card_id: auctionDetails.sim_card_id,
                winner_rank: topThree.indexOf(winner) + 1,
                user_id: winner.user_id,
                highest_bid: winner.highest_bid,
                payment_status: 'pending',
                remaining_amount: remainingAmount,
                payment_deadline: paymentDeadline.toISOString()
            });

        // Record in payments table
        await supabase
            .from('auction_payments')
            .insert({
                auction_id: auctionId,
                sim_card_id: auctionDetails.sim_card_id,
                user_id: winner.user_id,
                winner_rank: topThree.indexOf(winner) + 1,
                bid_amount: winner.highest_bid,
                guarantee_deposit_amount: winner.guarantee_deposit_amount || 0,
                remaining_amount: remainingAmount,
                status: 'pending'
            });
    }

    // Update auction status to pending_payment
    await supabase
        .from('auction_details')
        .update({
            status: 'pending_payment',
            updated_at: new Date().toISOString()
        })
        .eq('id', auctionId);

    // Notify first winner
    const firstWinner = topThree[0];
    const { data: firstWinnerData } = await supabase
        .from('users')
        .select('name')
        .eq('id', firstWinner.user_id)
        .single();

    const { data: simData } = await supabase
        .from('sim_cards')
        .select('number')
        .eq('id', auctionDetails.sim_card_id)
        .single();

    const deadlineHours = await settingsService.getAuctionPaymentDeadlineHours();

    await createNotification(
        firstWinner.user_id,
        '🎉 شما برنده حراجی هستید!',
        `تبریک! شما برنده حراجی برای سیمکارت ${simData?.number} با پیشنهاد ${firstWinner.highest_bid.toLocaleString('fa-IR')} تومان شدید. برای تکمیل خرید، ${firstWinner.highest_bid.toLocaleString('fa-IR')} تومان را درون ${deadlineHours} ساعت پرداخت کنید.`,
        'success'
    );
};

/**
 * Check and process payment deadlines
 * Called on every page refresh to check for expired payment periods
 */
export const checkAndProcessPaymentDeadlines = async (): Promise<void> => {
    // Get all pending winner payments that have exceeded deadline
    const { data: expiredPayments, error: expiredError } = await supabase
        .from('auction_winner_queue')
        .select('*')
        .eq('payment_status', 'pending')
        .lt('payment_deadline', new Date().toISOString());

    if (expiredError) {
        return;
    }

    if (!expiredPayments || expiredPayments.length === 0) {
        return;
    }

    console.log(`⚠️ Found ${expiredPayments.length} expired payment(s)`);

    for (const expiredPayment of expiredPayments) {
        await handleExpiredPaymentDeadline(expiredPayment);
    }
};

/**
 * Handle an expired payment deadline
 * Burn the deposit and escalate to next winner
 */
export const handleExpiredPaymentDeadline = async (winnerQueue: any): Promise<void> => {
    // Mark as failed
    await supabase
        .from('auction_winner_queue')
        .update({ payment_status: 'failed' })
        .eq('id', winnerQueue.id);

    // Update auction_payments
    await supabase
        .from('auction_payments')
        .update({ status: 'failed' })
        .eq('auction_id', winnerQueue.auction_id)
        .eq('user_id', winnerQueue.user_id)
        .eq('winner_rank', winnerQueue.winner_rank);

    // Burn (delete from system) the guarantee deposit
    const { data: guaranteeDeposit } = await supabase
        .from('guarantee_deposits')
        .select('*')
        .eq('user_id', winnerQueue.user_id)
        .eq('auction_id', winnerQueue.auction_id)
        .eq('sim_card_id', winnerQueue.sim_card_id)
        .single();

    if (guaranteeDeposit) {
        await supabase
            .from('guarantee_deposits')
            .update({
                status: 'burned',
                reason: 'عدم پرداخت درون مهلت مقرره (سوخته شد)',
                updated_at: new Date().toISOString()
            })
            .eq('id', guaranteeDeposit.id);
    }

    // Notify user that deposit was burned
    const { data: simData } = await supabase
        .from('sim_cards')
        .select('number')
        .eq('id', winnerQueue.sim_card_id)
        .single();

    const guaranteeRate = await settingsService.getAuctionGuaranteeRate();
    const depositAmount = Math.floor(winnerQueue.highest_bid * guaranteeRate);
    const deadlineHours = await settingsService.getAuctionPaymentDeadlineHours();

    await createNotification(
        winnerQueue.user_id,
        '❌ حق ضمانت سوخته شد',
        `شما درون مهلت ${deadlineHours} ساعتی پرداخت را انجام ندادید. حق ضمانت ${depositAmount.toLocaleString('fa-IR')} تومان برای سیمکارت ${simData?.number} حذف شد.`,
        'error'
    );

    // Get next winner in queue
    const { data: nextWinner } = await supabase
        .from('auction_winner_queue')
        .select('*')
        .eq('auction_id', winnerQueue.auction_id)
        .eq('sim_card_id', winnerQueue.sim_card_id)
        .eq('payment_status', 'pending')
        .gt('winner_rank', winnerQueue.winner_rank)
        .order('winner_rank', { ascending: true })
        .limit(1)
        .single();

    if (nextWinner) {
        // Notify next winner
        const paymentDeadline = new Date();
        const deadlineHours = await settingsService.getAuctionPaymentDeadlineHours();
        paymentDeadline.setHours(paymentDeadline.getHours() + deadlineHours);

        await supabase
            .from('auction_winner_queue')
            .update({
                payment_deadline: paymentDeadline.toISOString(),
                notification_sent_at: new Date().toISOString()
            })
            .eq('id', nextWinner.id);

        await createNotification(
            nextWinner.user_id,
            '🎉 نوبت شما برای پرداخت رسید!',
            `برنده قبلی پرداخت نکرد. اکنون شما شانس دارید برای سیمکارت ${simData?.number} ${nextWinner.highest_bid.toLocaleString('fa-IR')} تومان پرداخت کنید. درون ${deadlineHours} ساعت پرداخت کنید.`,
            'success'
        );
    } else {
        // No more winners, cancel auction
        await supabase
            .from('auction_details')
            .update({ status: 'cancelled' })
            .eq('id', winnerQueue.auction_id);

        await createNotificationForAdmins(
            '❌ حراجی لغو شد',
            `حراجی برای سیمکارت ${simData?.number} لغو شد. هیچ برنده‌ای پرداخت را انجام ندادند.`,
            'error'
        );
    }
};

/**
 * Process payment completion for auction winner
 * Updates winner status, releases/completes transaction
 */
export const processAuctionWinnerPayment = async (
    winnerQueueId: number,
    auctionId: number
): Promise<void> => {
    // Get winner queue info
    const { data: winnerQueue } = await supabase
        .from('auction_winner_queue')
        .select('*')
        .eq('id', winnerQueueId)
        .single();

    if (!winnerQueue) {
        throw new Error('برنده در صف انتظار یافت نشد');
    }

    // Mark as completed
    await supabase
        .from('auction_winner_queue')
        .update({
            payment_status: 'completed',
            payment_completed_at: new Date().toISOString()
        })
        .eq('id', winnerQueueId);

    // Update auction_payments
    await supabase
        .from('auction_payments')
        .update({ status: 'completed', paid_at: new Date().toISOString() })
        .eq('auction_id', auctionId)
        .eq('user_id', winnerQueue.user_id)
        .eq('winner_rank', winnerQueue.winner_rank);

    // Update auction details - set as completed with final winner
    await supabase
        .from('auction_details')
        .update({
            status: 'completed',
            final_winner_id: winnerQueue.user_id,
            winner_rank: winnerQueue.winner_rank,
            updated_at: new Date().toISOString()
        })
        .eq('id', auctionId);

    // Get SIM card info
    const { data: simData } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', winnerQueue.sim_card_id)
        .single();

    if (simData) {
        // Update SIM status to sold
        await supabase
            .from('sim_cards')
            .update({ status: 'sold', sold_date: new Date().toISOString() })
            .eq('id', winnerQueue.sim_card_id);
    }

    // Process financial transactions
    const commissionRate = await settingsService.getCommissionRate();
    // Calculate the actual amount to be paid by the winner (bid amount minus guarantee deposit)
    const actualPaymentAmount = winnerQueue.highest_bid - (winnerQueue.guarantee_deposit_amount || 0);
    const commissionAmount = Math.floor(actualPaymentAmount * commissionRate);
    const sellerReceivedAmount = actualPaymentAmount - commissionAmount;

    // Get seller info
    const { data: sellerData } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', simData?.seller_id)
        .single();

    // Credit seller with payment
    if (sellerData) {
        await supabase
            .from('users')
            .update({ wallet_balance: (sellerData.wallet_balance || 0) + sellerReceivedAmount })
            .eq('id', simData?.seller_id);
    }

    // Update winner's balance - unblock the bid amount and deduct the actual payment
    const { data: winnerData } = await supabase
        .from('users')
        .select('wallet_balance, blocked_balance')
        .eq('id', winnerQueue.user_id)
        .single();

    if (winnerData) {
        // Unblock the full bid amount and deduct only the actual payment amount
        const newWalletBalance = winnerData.wallet_balance || 0;
        const newBlockedBalance = Math.max(0, (winnerData.blocked_balance || 0) - winnerQueue.highest_bid);
        
        await supabase
            .from('users')
            .update({ 
                wallet_balance: newWalletBalance - actualPaymentAmount,
                blocked_balance: newBlockedBalance
            })
            .eq('id', winnerQueue.user_id);
    }

    // Record transactions
    await supabase
        .from('transactions')
        .insert({
            user_id: winnerQueue.user_id,
            type: 'purchase',
            amount: -actualPaymentAmount,
            description: `خرید حراجی سیمکارت ${simData?.number}`,
            date: new Date().toISOString()
        });

    await supabase
        .from('transactions')
        .insert({
            user_id: simData?.seller_id,
            type: 'sale',
            amount: sellerReceivedAmount,
            description: `فروش حراجی سیمکارت ${simData?.number} (کمیسیون: ${commissionAmount})`,
            date: new Date().toISOString()
        });

    // Create commission record
    const { data: winnerNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', winnerQueue.user_id)
        .single();

    const { data: sellerNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', simData?.seller_id)
        .single();

    await supabase
        .from('commissions')
        .insert({
            sim_card_id: winnerQueue.sim_card_id,
            seller_id: simData?.seller_id,
            seller_name: sellerNameData?.name || 'نام‌شخص',
            sim_number: simData?.number,
            sale_price: winnerQueue.highest_bid,
            commission_amount: commissionAmount,
            commission_percentage: Math.round(commissionRate * 100),
            seller_received_amount: sellerReceivedAmount,
            sale_type: 'auction',
            buyer_id: winnerQueue.user_id,
            buyer_name: winnerNameData?.name || 'نام‌شخص',
            date: new Date().toISOString()
        });

    // Notify winner and seller
    await createNotification(
        winnerQueue.user_id,
        '✅ خرید شما تکمیل شد',
        `خرید حراجی سیمکارت ${simData?.number} با موفقیت تکمیل شد. لطفاً برای خطاهای بعدی منتظر ارتباط فروشنده باشید.`,
        'success'
    );

    await createNotification(
        simData?.seller_id,
        '🎊 حراجی شما تکمیل شد',
        `حراجی سیمکارت ${simData?.number} با موفقیت تکمیل شد. ${sellerReceivedAmount.toLocaleString('fa-IR')} تومان به حساب شما واریز شد.`,
        'success'
    );
};

/**
 * Handle auction completion - processes line delivery and finalization
 * This is called after winner payment is completed
 */
export const completeAuctionFlow = async (auctionId: number, winnerUserId: string, simCardId: number): Promise<void> => {
    try {
        // Get SIM card to determine line type
        const { data: simData, error: simError } = await supabase
            .from('sim_cards')
            .select('*')
            .eq('id', simCardId)
            .single();

        if (simError || !simData) {
            throw new Error('سیمکارت یافت نشد');
        }

        // Line type is determined by is_active field
        const lineType = simData.is_active ? 'active' : 'inactive';
        // Create a purchase order to handle the line delivery process
        const { data: sellerData, error: sellerError } = await supabase
            .from('users')
            .select('id')
            .eq('id', simData.seller_id)
            .single();

        if (sellerError || !sellerData) {
            throw new Error('فروشنده یافت نشد');
        }

        // Get auction details to get the winning bid amount
        const { data: auctionDetails, error: auctionError } = await supabase
            .from('auction_details')
            .select('*')
            .eq('id', auctionId)
            .single();

        if (auctionError || !auctionDetails) {
            throw new Error('جزئیات حراجی یافت نشد');
        }

        // Get the winning bid amount
        const winningBidAmount = auctionDetails.current_bid || 0;

        const commissionRate = await settingsService.getCommissionRate();
        const commissionAmount = Math.floor(winningBidAmount * commissionRate);
        const sellerReceivedAmount = winningBidAmount - commissionAmount;

        // Create purchase order with line delivery handling
        const { error: purchaseOrderError } = await supabase
            .from('purchase_orders')
            .insert({
                sim_card_id: simCardId,
                buyer_id: winnerUserId,
                seller_id: sellerData.id,
                line_type: lineType,
                status: 'pending', // Start with pending for line verification
                price: winningBidAmount,
                commission_amount: commissionAmount,
                seller_received_amount: sellerReceivedAmount,
                buyer_blocked_amount: winningBidAmount,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (purchaseOrderError) {
            throw new Error('خطا در ایجاد سفارش خرید: ' + purchaseOrderError.message);
        }

        // Send notifications for line delivery process
        const { data: buyerData, error: buyerError } = await supabase
            .from('users')
            .select('name')
            .eq('id', winnerUserId)
            .single();

        const { data: sellerNameData, error: sellerNameError } = await supabase
            .from('users')
            .select('name')
            .eq('id', sellerData.id)
            .single();

        // Notify buyer about next steps
        await createNotification(
            winnerUserId,
            '📞 فرآیند تحویل خط شروع شد',
            `حراجی شما تکمیل شد. فرآیند تحویل خط (${lineType === 'active' ? 'خط فعال' : 'خط غیرفعال'}) شروع شده است. لطفاً به قسمت "پیگیری خریدها" بروید تا مراحل بعدی را دنبال کنید.`,
            'info'
        );

        // Notify seller about delivery requirements
        await createNotification(
            sellerData.id,
            '🎯 نیاز به تحویل خط',
            `برای سیمکارت ${simData.number}، باید خط ${lineType === 'active' ? 'فعال' : 'غیرفعال'} را برای خریدار تحویل دهید. لطفاً کد فعال‌سازی یا سند مورد نیاز را ارسال کنید.`,
            'info'
        );
    } catch (error) {
        // Re-throw the error so it can be handled by the caller
        throw error;
    }
};

/**
 * Finalize auction purchase after line delivery is complete
 * This transfers money from blocked balance to seller and marks SIM as sold
 */
export const finalizePurchaseAfterLineDelivery = async (purchaseOrderId: number): Promise<void> => {
    // Get purchase order
    const { data: purchaseOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', purchaseOrderId)
        .single();
        
    if (orderError || !purchaseOrder) {
        throw new Error('سفارش خرید یافت نشد.');
    }
    
    if (purchaseOrder.status !== 'pending') {
        throw new Error('این سفارش قبلاً تکمیل شده است.');
    }
    
    // Get SIM card
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', purchaseOrder.sim_card_id)
        .single();
        
    if (simError || !simData) {
        throw new Error('سیمکارت یافت نشد.');
    }
    
    // Get buyer data
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', purchaseOrder.buyer_id)
        .single();
        
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد.');
    }
    
    // Get seller data
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', purchaseOrder.seller_id)
        .single();
        
    if (sellerError || !sellerData) {
        throw new Error('فروشنده یافت نشد.');
    }
    
    // STEP 1: Unblock the money from buyer's blocked balance
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) - purchaseOrder.price;
    
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({ 
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', purchaseOrder.buyer_id);
        
    if (buyerUpdateError) {
        throw new Error(buyerUpdateError.message);
    }
    
    // STEP 2: Add money to seller's wallet (after commission deduction)
    const sellerNewBalance = (sellerData.wallet_balance || 0) + purchaseOrder.seller_received_amount;
    
    const { error: sellerUpdateError } = await supabase
        .from('users')
        .update({ 
            wallet_balance: sellerNewBalance
        })
        .eq('id', purchaseOrder.seller_id);
        
    if (sellerUpdateError) {
        throw new Error(sellerUpdateError.message);
    }
    
    // STEP 3: Mark SIM card as sold
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ 
            status: 'sold',
            sold_date: new Date().toISOString()
        })
        .eq('id', purchaseOrder.sim_card_id);
        
    if (simUpdateError) {
        throw new Error(simUpdateError.message);
    }
    
    // STEP 4: Update purchase order status to completed
    const { error: orderUpdateError } = await supabase
        .from('purchase_orders')
        .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', purchaseOrderId);
        
    if (orderUpdateError) {
        throw new Error(orderUpdateError.message);
    }
    
    // STEP 5: Record the completion transactions
    const sellerTransaction = {
        user_id: purchaseOrder.seller_id,
        type: 'credit' as const,
        amount: purchaseOrder.seller_received_amount,
        description: `دریافت فروش حراجی سیمکارت ${simData.number} - ${purchaseOrder.seller_received_amount.toLocaleString('fa-IR')} تومان`,
        date: new Date().toISOString()
    };
    
    const { error: sellerTransactionError } = await supabase
        .from('transactions')
        .insert(sellerTransaction);
        
    if (sellerTransactionError) {
    }
    
    // STEP 6: Record commission
    const { data: buyerNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', purchaseOrder.buyer_id)
        .single();
    
    const commissionRecord = {
        sim_card_id: purchaseOrder.sim_card_id,
        seller_id: purchaseOrder.seller_id,
        seller_name: sellerData.name,
        sim_number: simData.number,
        sale_price: purchaseOrder.price,
        commission_amount: purchaseOrder.commission_amount,
        commission_percentage: 2,
        seller_received_amount: purchaseOrder.seller_received_amount,
        sale_type: simData.type,
        buyer_id: purchaseOrder.buyer_id,
        buyer_name: buyerNameData?.name || 'ناشناس',
        date: new Date().toISOString()
    };
    
    const { error: commissionError } = await supabase
        .from('commissions')
        .insert(commissionRecord);
        
    if (commissionError) {
    } else {
        await createNotificationForAdmins(
            '💰 کمیسیون جدید',
            `کمیسیون ${purchaseOrder.commission_amount.toLocaleString('fa-IR')} تومان برای فروش سیمکارت ${simData.number}`,
            'info'
        );
    }
    
    // STEP 7: Send notifications
    await createNotification(
        purchaseOrder.buyer_id,
        '🎉 خرید شما کامل شد',
        `سیمکارت ${simData.number} با موفقیت تحویل داده شد.`,
        'success'
    );
    
    await createNotification(
        purchaseOrder.seller_id,
        '💰 فروش کامل شد',
        `${purchaseOrder.seller_received_amount.toLocaleString('fa-IR')} تومان به حساب شما واریز شد.`,
        'success'
    );
};
