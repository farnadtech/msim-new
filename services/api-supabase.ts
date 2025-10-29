import { supabase } from './supabase';
import { User, SimCard, Package, Transaction, Bid, Commission, SecurePayment, BuyerPaymentCode } from '../types';
import { ZARINPAL_CONFIG } from '../config/zarinpal';

// Function to remove undefined properties from an object
const removeUndefinedProps = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
};

// --- Auth and User Management ---

export const signup = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
};

export const createUserProfile = async (userId: string, data: Omit<User, 'id'>): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .insert({
            id: userId,
            ...data
        });
        
    if (error) {
        throw new Error(error.message);
    }
};

export const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        throw new Error(error.message);
    }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
        throw new Error(error.message);
    }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as User;
};

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*');
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as User[];
};

export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update(updatedData)
        .eq('id', userId);
        
    if (error) {
        throw new Error(error.message);
    }
};

export const updateUserPackage = async (userId: string, packageId: number): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update({ package_id: packageId })
        .eq('id', userId);
        
    if (error) {
        throw new Error(error.message);
    }
};

// --- SIM Card Management ---

export const getSimCards = async (): Promise<SimCard[]> => {
    // First, get all sim cards
    const { data: simCards, error: simError } = await supabase
        .from('sim_cards')
        .select('*');
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    // Get auction details for auction sim cards
    const auctionSimIds = simCards
        .filter(sim => sim.type === 'auction')
        .map(sim => sim.id);
        
    if (auctionSimIds.length > 0) {
        // Get auction details
        const { data: auctionDetails, error: auctionError } = await supabase
            .from('auction_details')
            .select('*')
            .in('sim_card_id', auctionSimIds);
            
        if (auctionError) {
            // If there's an error fetching auction details, we'll still return the sim cards
            // but without auction details
            console.warn('Error fetching auction details:', auctionError.message);
            return simCards as SimCard[];
        }
        
        // Get bids for auction sim cards
        const { data: bidsData, error: bidsError } = await supabase
            .from('bids')
            .select('*')
            .in('sim_card_id', auctionSimIds);
            
        if (bidsError) {
            // If there's an error fetching bids, we'll still return the sim cards
            // but without bids data
            console.warn('Error fetching bids:', bidsError.message);
            // Continue with auction details only
        }
        
        // Merge auction details and bids with sim cards
        return simCards.map(sim => {
            if (sim.type === 'auction') {
                const details = auctionDetails.find(detail => detail.sim_card_id === sim.id);
                if (details) {
                    // Filter bids for this specific sim card
                    const simBids = bidsData ? bidsData.filter(bid => bid.sim_card_id === sim.id) : [];
                    
                    return {
                        ...sim,
                        auction_details: {
                            current_bid: details.current_bid,
                            highest_bidder_id: details.highest_bidder_id,
                            end_time: details.end_time,
                            bids: simBids
                        }
                    };
                } else {
                    // If no auction details found, this indicates a data inconsistency
                    // We should not create default auction details as it causes confusion
                    console.warn(`No auction details found for sim card ${sim.id}, this indicates a data inconsistency`);
                    // Return the sim card without auction details to prevent incorrect data display
                    return sim;
                }
            }
            return sim;
        }) as SimCard[];
    }
    
    return simCards as SimCard[];
};

export const addSimCard = async (simData: Omit<SimCard, 'id'>): Promise<string> => {
    // Prepare sim card data without ID (let DB auto-generate)
    const simCardPayload: any = {
        number: simData.number,
        price: simData.price,
        seller_id: simData.seller_id,
        type: simData.type,
        status: simData.status,
        sold_date: simData.sold_date,
        carrier: simData.carrier,
        is_rond: simData.is_rond,
        is_active: simData.is_active,
        inquiry_phone_number: simData.inquiry_phone_number
    };
    
    // Add rond_level if this is a rond sim card
    if (simData.is_rond && simData.rond_level) {
        simCardPayload.rond_level = simData.rond_level;
    }

    // Insert the sim card
    const { data: simCardData, error: simCardError } = await supabase
        .from('sim_cards')
        .insert(simCardPayload)
        .select();
        
    if (simCardError) {
        // If we get a duplicate key error, it might be because of sequence issues
        // Let's try to insert without specifying any ID-related fields
        if (simCardError.message.includes('duplicate key value violates unique constraint')) {
            // Try again with minimal data
            const minimalPayload: any = {
                number: simData.number,
                price: simData.price,
                seller_id: simData.seller_id,
                type: simData.type,
                status: 'available',
                carrier: simData.carrier,
                is_rond: simData.is_rond,
                is_active: simData.is_active
            };
            
            if (simData.is_rond && simData.rond_level) {
                minimalPayload.rond_level = simData.rond_level;
            }
            
            const { data: retryData, error: retryError } = await supabase
                .from('sim_cards')
                .insert(minimalPayload)
                .select();
                
            if (retryError) {
                throw new Error(retryError.message);
            }
            
            const simCardId = retryData[0].id;
            
            // Handle financial transactions for the seller (only for rond SIM cards)
            let transactionAmount = 0;
            let transactionDescription = '';
            
            // Round pricing based on level
            const ROND_PRICES: { [key in 1 | 2 | 3 | 4 | 5]: number } = {
                1: 5000,
                2: 10000,
                3: 15000,
                4: 20000,
                5: 25000
            };
            
            // If this is a rond sim card, charge based on the round level
            if (simData.is_rond && simData.rond_level) {
                transactionAmount -= ROND_PRICES[simData.rond_level];
                transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number} (رند ${simData.rond_level} ستاره)`;
                
                // Process the transaction if there's a charge
                if (transactionAmount < 0) {
                    const { error: transactionError } = await supabase
                        .from('transactions')
                        .insert({
                            user_id: simData.seller_id,
                            type: 'withdrawal',
                            amount: transactionAmount,
                            description: transactionDescription,
                            date: new Date().toISOString()
                        });
                        
                    if (transactionError) {
                        // If transaction fails, we should delete the sim card
                        await supabase
                            .from('sim_cards')
                            .delete()
                            .eq('id', simCardId);
                        throw new Error('خطا در پردازش هزینه ثبت سیمکارت: ' + transactionError.message);
                    }
                    
                    // Update seller's wallet balance
                    const { data: sellerData, error: sellerError } = await supabase
                        .from('users')
                        .select('wallet_balance')
                        .eq('id', simData.seller_id)
                        .single();
                        
                    if (!sellerError && sellerData) {
                        const newBalance = (sellerData.wallet_balance || 0) + transactionAmount;
                        await supabase
                            .from('users')
                            .update({ wallet_balance: newBalance })
                            .eq('id', simData.seller_id);
                    }
                }
            }
            
            // If this is an auction sim card, create auction details
            if (simData.type === 'auction') {
                // Use the end_time from simData if available
                let endTime;
                if (simData.auction_details && simData.auction_details.end_time) {
                    endTime = simData.auction_details.end_time;
                } else {
                    // If no end time is provided, throw an error instead of defaulting to 7 days
                    throw new Error('زمان پایان حراجی مشخص نشده است. لطفاً زمان پایان حراجی را مشخص کنید.');
                }
                
                const auctionDetails = {
                    sim_card_id: simCardId,
                    current_bid: simData.price || 0, // Use the price set by the seller as the starting bid
                    highest_bidder_id: null,
                    end_time: endTime
                };
                
                const { error: auctionDetailsError } = await supabase
                    .from('auction_details')
                    .insert(auctionDetails);
                    
                if (auctionDetailsError) {
                    // If auction details creation fails, we should delete the sim card
                    await supabase
                        .from('sim_cards')
                        .delete()
                        .eq('id', simCardId);
                    throw new Error(auctionDetailsError.message);
                }
            }
            
            return simCardId.toString();
        }
        
        throw new Error(simCardError.message);
    }
    
    const simCardId = simCardData[0].id;
    
    // Handle financial transactions for the seller (only for rond SIM cards)
    let transactionAmount = 0;
    let transactionDescription = '';
    
    // Round pricing based on level
    const ROND_PRICES: { [key in 1 | 2 | 3 | 4 | 5]: number } = {
        1: 5000,
        2: 10000,
        3: 15000,
        4: 20000,
        5: 25000
    };
    
    // If this is a rond sim card, charge based on the round level
    if (simData.is_rond && simData.rond_level) {
        transactionAmount -= ROND_PRICES[simData.rond_level];
        transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number} (رند ${simData.rond_level} ستاره)`;
        
        // Process the transaction if there's a charge
        if (transactionAmount < 0) {
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    user_id: simData.seller_id,
                    type: 'withdrawal',
                    amount: transactionAmount,
                    description: transactionDescription,
                    date: new Date().toISOString()
                });
                
            if (transactionError) {
                // If transaction fails, we should delete the sim card
                await supabase
                    .from('sim_cards')
                    .delete()
                    .eq('id', simCardId);
                throw new Error('خطا در پردازش هزینه ثبت سیمکارت: ' + transactionError.message);
            }
            
            // Update seller's wallet balance
            const { data: sellerData, error: sellerError } = await supabase
                .from('users')
                .select('wallet_balance')
                .eq('id', simData.seller_id)
                .single();
                
            if (!sellerError && sellerData) {
                const newBalance = (sellerData.wallet_balance || 0) + transactionAmount;
                await supabase
                    .from('users')
                    .update({ wallet_balance: newBalance })
                    .eq('id', simData.seller_id);
            }
        }
    }
    
    // If this is an auction sim card, create auction details
    if (simData.type === 'auction') {
        // Use the end_time from simData if available
        let endTime;
        if (simData.auction_details && simData.auction_details.end_time) {
            endTime = simData.auction_details.end_time;
        } else {
            // If no end time is provided, throw an error instead of defaulting to 7 days
            throw new Error('زمان پایان حراجی مشخص نشده است. لطفاً زمان پایان حراجی را مشخص کنید.');
        }
        
        const auctionDetails = {
            sim_card_id: simCardId,
            current_bid: simData.price || 0, // Use the price set by the seller as the starting bid
            highest_bidder_id: null,
            end_time: endTime
        };
        
        const { error: auctionDetailsError } = await supabase
            .from('auction_details')
            .insert(auctionDetails);
            
        if (auctionDetailsError) {
            // If auction details creation fails, we should delete the sim card
            await supabase
                .from('sim_cards')
                .delete()
                .eq('id', simCardId);
            throw new Error(auctionDetailsError.message);
        }
    }
    
    return simCardId.toString();
};

export const purchaseSim = async (simId: number, buyerId: string): Promise<void> => {
    // Get the SIM card
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simId)
        .single();
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    if (!simData) {
        throw new Error('SIM card not found.');
    }
    
    if (simData.status !== 'available') {
        throw new Error('این سیمکارت دیگر در دسترس نیست.');
    }
    
    // Get auction details if it's an auction
    let auctionDetails = null;
    if (simData.type === 'auction') {
        const { data, error: auctionError } = await supabase
            .from('auction_details')
            .select('*')
            .eq('sim_card_id', simId)
            .single();
            
        if (auctionError) {
            throw new Error('جزئیات حراجی یافت نشد.');
        }
        
        auctionDetails = data;
        
        // For auctions, check if it has ended
        if (new Date(auctionDetails.end_time) > new Date()) {
            throw new Error('حراجی هنوز به پایان نرسیده است.');
        }
        
        // For auctions, check if this user is the highest bidder
        if (auctionDetails.highest_bidder_id !== buyerId) {
            throw new Error('شما برنده این حراجی نیستید.');
        }
    }
    
    // Double-check that this purchase hasn't already been processed by checking for existing transactions
    if (simData.type === 'auction' && auctionDetails) {
        const { data: existingTransactions, error: transactionError } = await supabase
            .from('transactions')
            .select('*')
            .like('description', `خرید سیمکارت ${simData.number}`)
            .eq('type', 'purchase')
            .eq('user_id', buyerId);
            
        if (transactionError) {
            console.error('Error checking for existing transactions:', transactionError);
        } else if (existingTransactions && existingTransactions.length > 0) {
            throw new Error('این حراجی قبلاً تکمیل شده است.');
        }
    }
    
    // Determine the price
    let price = simData.price;
    if (simData.type === 'auction' && auctionDetails) {
        price = auctionDetails.current_bid;
    }
    
    // Get buyer data
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
        
    if (buyerError) {
        throw new Error(`Buyer with ID ${buyerId} not found for transaction.`);
    }
    
    const buyerCurrentBalance = buyerData.wallet_balance || 0;
    const buyerBlockedBalance = buyerData.blocked_balance || 0;
    
    // For auction purchases, we need to unblock the winning bid amount
    if (simData.type === 'auction' && auctionDetails) {
        // Check if buyer has enough funds (including blocked funds)
        if ((buyerCurrentBalance + buyerBlockedBalance) < price) {
            throw new Error('موجودی کیف پول خریدار کافی نیست.');
        }
    } else {
        // For non-auction purchases
        if (buyerCurrentBalance < price) {
            throw new Error('موجودی کیف پول خریدار کافی نیست.');
        }
    }
    
    // Get seller data
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', simData.seller_id)
        .single();
        
    if (sellerError) {
        throw new Error(`Seller with ID ${simData.seller_id} not found for transaction.`);
    }
    
    // Update buyer balance
    let buyerNewBalance = buyerCurrentBalance;
    let buyerNewBlockedBalance = buyerBlockedBalance;
    
    if (simData.type === 'auction' && auctionDetails) {
        // For auction purchases, only unblock the winning bid amount
        // The buyer already has the bid amount blocked and also deducted from wallet
        // So we should only unblock from blocked balance
        buyerNewBalance = buyerCurrentBalance; // No change to wallet balance
        buyerNewBlockedBalance = buyerBlockedBalance - price; // Only unblock from blocked balance
    } else {
        // For non-auction purchases
        buyerNewBalance = buyerCurrentBalance - price;
    }
    
    
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({ 
            wallet_balance: buyerNewBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
        
    if (buyerUpdateError) {
        throw new Error(buyerUpdateError.message);
    }
    
    // Update seller balance with 2% commission deduction
    const COMMISSION_PERCENTAGE = 2;
    const commissionAmount = Math.floor(price * (COMMISSION_PERCENTAGE / 100));
    const sellerReceivedAmount = price - commissionAmount;
    const sellerNewBalance = (sellerData.wallet_balance || 0) + sellerReceivedAmount;
    const { error: sellerUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: sellerNewBalance })
        .eq('id', simData.seller_id);
        
    if (sellerUpdateError) {
        throw new Error(sellerUpdateError.message);
    }
    
    // Record commission in commissions table
    const { data: commissionBuyerData, error: buyerDataError } = await supabase
        .from('users')
        .select('name')
        .eq('id', buyerId)
        .single();
        
    if (!buyerDataError && commissionBuyerData) {
        const commissionRecord = {
            sim_card_id: simId,
            seller_id: simData.seller_id,
            seller_name: sellerData.name,
            sim_number: simData.number,
            sale_price: price,
            commission_amount: commissionAmount,
            commission_percentage: COMMISSION_PERCENTAGE,
            seller_received_amount: sellerReceivedAmount,
            sale_type: simData.type,
            buyer_id: buyerId,
            buyer_name: commissionBuyerData.name,
            date: new Date().toISOString()
        };
        
        const { error: commissionError } = await supabase.from('commissions').insert(commissionRecord);
        
        if (commissionError) {
            console.error('Error recording commission:', commissionError.message);
        }
    } else {
        console.error('Error fetching buyer data for commission:', buyerDataError?.message);
    }
    
    // Update SIM card status
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ status: 'sold', sold_date: new Date().toISOString() })
        .eq('id', simId);
        
    if (simUpdateError) {
        throw new Error(simUpdateError.message);
    }
    
    // Add transaction records
    const buyerTransaction = {
        user_id: buyerId,
        type: 'purchase' as const,
        amount: -price,
        description: `خرید سیمکارت ${simData.number}`,
        date: new Date().toISOString()
    };
    
    const { error: buyerTransactionError } = await supabase
        .from('transactions')
        .insert(buyerTransaction);
        
    if (buyerTransactionError) {
        throw new Error(buyerTransactionError.message);
    }
    
    const sellerTransaction = {
        user_id: simData.seller_id,
        type: 'sale' as const,
        amount: sellerReceivedAmount,
        description: `فروش سیمکارت ${simData.number} (کمیسیون ${commissionAmount} تومان کسر شد)`,
        date: new Date().toISOString()
    };
    
    const { error: sellerTransactionError } = await supabase
        .from('transactions')
        .insert(sellerTransaction);
        
    if (sellerTransactionError) {
        throw new Error(sellerTransactionError.message);
    }
    
    // Handle auction refunds if needed
    if (simData.type === 'auction' && auctionDetails) {
        // Get bids for this auction
        const { data: bidsData, error: bidsError } = await supabase
            .from('bids')
            .select('*')
            .eq('sim_card_id', simId);
            
        if (!bidsError && bidsData && bidsData.length > 0) {
            const otherBidders = bidsData.filter(b => b.user_id !== buyerId);
            
            for (const bid of otherBidders) {
                // Get bidder data
                const { data: bidderData, error: bidderError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', bid.user_id)
                    .single();
                    
                if (!bidderError && bidderData) {
                    const newWalletBalance = (bidderData.wallet_balance || 0) + bid.amount;
                    const newBlockedBalance = (bidderData.blocked_balance || 0) - bid.amount;
                    
                    const { error: bidderUpdateError } = await supabase
                        .from('users')
                        .update({ 
                            wallet_balance: newWalletBalance,
                            blocked_balance: newBlockedBalance
                        })
                        .eq('id', bid.user_id);
                        
                    if (bidderUpdateError) {
                        console.error('Error updating bidder balance:', bidderUpdateError.message);
                    }
                }
            }
        }
    }
};

export const placeBid = async (simId: number, bidderId: string, amount: number): Promise<void> => {
    // Get the SIM card
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simId)
        .single();
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    if (!simData) {
        throw new Error('SIM card not found.');
    }
    
    if (simData.type !== 'auction') {
        throw new Error('Auction not found.');
    }
    
    // Get auction details
    const { data: auctionDetails, error: auctionError } = await supabase
        .from('auction_details')
        .select('*')
        .eq('sim_card_id', simId)
        .single();
        
    if (auctionError) {
        throw new Error('Auction details not found.');
    }
    
    if (new Date(auctionDetails.end_time) < new Date()) {
        throw new Error('این حراجی به پایان رسیده است.');
    }
    
    if (amount <= auctionDetails.current_bid) {
        throw new Error(`پیشنهاد شما باید بیشتر از ${auctionDetails.current_bid.toLocaleString('fa-IR')} تومان باشد.`);
    }
    
    // Get bidder data
    const { data: bidderData, error: bidderError } = await supabase
        .from('users')
        .select('*')
        .eq('id', bidderId)
        .single();
        
    if (bidderError) {
        throw new Error('Bidder not found.');
    }
    
    if ((bidderData.wallet_balance || 0) < amount) {
        throw new Error('موجودی کیف پول برای ثبت این پیشنهاد کافی نیست.');
    }
    
    // Unblock previous highest bidder's funds
    const previousHighestBidderId = auctionDetails.highest_bidder_id;
    if (previousHighestBidderId && previousHighestBidderId !== bidderId) {
        const { data: prevBidderData, error: prevBidderError } = await supabase
            .from('users')
            .select('*')
            .eq('id', previousHighestBidderId)
            .single();
            
        if (!prevBidderError && prevBidderData) {
            const amountToUnblock = auctionDetails.current_bid;
            const { error: prevBidderUpdateError } = await supabase
                .from('users')
                .update({
                    wallet_balance: (prevBidderData.wallet_balance || 0) + amountToUnblock,
                    blocked_balance: (prevBidderData.blocked_balance || 0) - amountToUnblock
                })
                .eq('id', previousHighestBidderId);
                
            if (prevBidderUpdateError) {
                console.error('Error updating previous bidder balance:', prevBidderUpdateError.message);
            }
        }
    }
    
    // Block new bidder's funds
    const { error: bidderUpdateError } = await supabase
        .from('users')
        .update({
            wallet_balance: (bidderData.wallet_balance || 0) - amount,
            blocked_balance: (bidderData.blocked_balance || 0) + amount,
        })
        .eq('id', bidderId);
        
    if (bidderUpdateError) {
        throw new Error(bidderUpdateError.message);
    }
    
    // Add new bid to bids table
    const newBid = {
        sim_card_id: simId,
        user_id: bidderId,
        amount: amount,
        date: new Date().toISOString()
    };
    
    const { error: bidInsertError } = await supabase
        .from('bids')
        .insert(newBid);
        
    if (bidInsertError) {
        throw new Error(bidInsertError.message);
    }
    
    // Update auction details
    const { error: auctionUpdateError } = await supabase
        .from('auction_details')
        .update({
            current_bid: amount,
            highest_bidder_id: bidderId
        })
        .eq('sim_card_id', simId);
        
    if (auctionUpdateError) {
        throw new Error(auctionUpdateError.message);
    }
};

export const updateSimCard = async (simId: number, updatedData: Partial<SimCard>): Promise<void> => {
    // Separate auction details from other data
    const { auction_details, ...otherData } = updatedData;
    
    // Update main sim card data if there's anything other than auction_details
    if (Object.keys(otherData).length > 0) {
        const { error: simError } = await supabase
            .from('sim_cards')
            .update(otherData)
            .eq('id', simId);
            
        if (simError) {
            throw new Error(simError.message);
        }
    }
    
    // Update auction details if provided
    if (auction_details) {
        // Extract only the fields that exist in the auction_details table
        const { current_bid, highest_bidder_id, end_time } = auction_details;
        const auctionData = {
            current_bid,
            highest_bidder_id,
            end_time
        };
        
        const { error: auctionError } = await supabase
            .from('auction_details')
            .update(auctionData)
            .eq('sim_card_id', simId);
            
        if (auctionError) {
            throw new Error(auctionError.message);
        }
    }
};

// --- Package Management ---

export const getPackages = async (): Promise<Package[]> => {
    const { data, error } = await supabase
        .from('packages')
        .select('*');
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as Package[];
};

export const addPackage = async (packageData: Omit<Package, 'id'>): Promise<string> => {
    const cleanedData = removeUndefinedProps(packageData);
    const { data, error } = await supabase
        .from('packages')
        .insert(cleanedData)
        .select();
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data[0].id;
};

export const updatePackage = async (packageId: number, updatedData: Partial<Package>): Promise<void> => {
    const { error } = await supabase
        .from('packages')
        .update(updatedData)
        .eq('id', packageId);
        
    if (error) {
        throw new Error(error.message);
    }
};

// --- Transaction & Financials ---

export const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*');
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as Transaction[];
};

export const processTransaction = async (userId: string, amount: number, type: Transaction['type'], description: string): Promise<void> => {
    // Get user data
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (userError) {
        throw new Error(`User with ID ${userId} not found for transaction.`);
    }
    
    const currentBalance = userData.wallet_balance || 0;
    if (amount < 0 && currentBalance < Math.abs(amount)) {
        throw new Error('موجودی کیف پول کافی نیست.');
    }
    
    const newBalance = currentBalance + amount;
    
    // Update user balance
    const { error: userUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);
        
    if (userUpdateError) {
        throw new Error(userUpdateError.message);
    }
    
    // Add transaction record
    const transactionData = {
        user_id: userId,
        type,
        amount,
        description,
        date: new Date().toISOString()
        // id will be auto-generated by the database
    };
    
    const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData);
        
    if (transactionError) {
        throw new Error(transactionError.message);
    }
};

// Payment receipt types
export type PaymentReceiptStatus = 'pending' | 'approved' | 'rejected';

export type PaymentReceipt = {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  card_number?: string;
  tracking_code?: string;
  receipt_image_url?: string;
  status: PaymentReceiptStatus;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  updated_at: string;
};

// Payment receipt functions
export const createPaymentReceipt = async (
  receiptData: Omit<PaymentReceipt, 'id' | 'created_at' | 'updated_at'>
): Promise<string> => {
  const { data, error } = await supabase
    .from('payment_receipts')
    .insert(receiptData)
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
};

export const getPaymentReceiptByAuthority = async (authority: string): Promise<{ data?: PaymentReceipt; error?: Error }> => {
  try {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select('*')
      .eq('tracking_code', authority)
      .single();

    if (error) {
      return { error: new Error(error.message) };
    }

    return { data: data as PaymentReceipt };
  } catch (error) {
    return { error: error as Error };
  }
};

// Function to get all payment receipts for admin
export const getAllPaymentReceipts = async (): Promise<PaymentReceipt[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data as PaymentReceipt[];
  } catch (error) {
    console.error('Error fetching payment receipts:', error);
    throw new Error('خطا در دریافت رسیدهای پرداخت.');
  }
};

// ZarinPal payment functions
interface ZarinPalPaymentResult {
  paymentUrl: string;
  authority: string;
}

interface ZarinPalRequestData {
  merchant_id: string;
  amount: number;
  callback_url: string;
  description: string;
  metadata?: {
    mobile?: string;
    email?: string;
  };
}

interface ZarinPalRequestResponse {
  data: {
    code: number;
    message: string;
    authority: string;
    fee_type: string;
    fee: number;
  };
}

interface ZarinPalVerifyData {
  merchant_id: string;
  amount: number;
  authority: string;
}

interface ZarinPalVerifyResponse {
  data: {
    code: number;
    message: string;
    card_hash: string;
    card_pan: string;
    ref_id: string;
    fee_type: string;
    fee: number;
  };
}

export const createZarinPalPayment = async (
  userId: string,
  userName: string,
  amount: number
): Promise<ZarinPalPaymentResult> => {
  try {
    // Create a payment receipt first
    const receiptId = await createPaymentReceipt({
      user_id: userId,
      user_name: userName,
      amount: amount,
      status: 'pending'
    });

    // Prepare data for ZarinPal API
    const requestData: ZarinPalRequestData = {
      merchant_id: ZARINPAL_CONFIG.MERCHANT_ID,
      amount: amount,
      callback_url: ZARINPAL_CONFIG.CALLBACK_URL,
      description: `شارژ کیف پول کاربر ${userName}`,
      metadata: {
        // You can add user's mobile or email here if available
      }
    };

    // In a real implementation, you would call ZarinPal API here
    // For now, we'll simulate it with a mock URL
    if (ZARINPAL_CONFIG.SANDBOX) {
      console.log('ZarinPal request data:', requestData);
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real implementation, you would get the authority from ZarinPal API response
    const authority = `auth_${Date.now()}_${userId}`;
    const paymentUrl = `${ZARINPAL_CONFIG.PAYMENT_GATEWAY_URL}${authority}`;

    // Update the receipt with the authority code
    const { error: updateError } = await supabase
      .from('payment_receipts')
      .update({ 
        tracking_code: authority,
        updated_at: new Date().toISOString()
      })
      .eq('id', receiptId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { paymentUrl, authority };
  } catch (error) {
    console.error('Error in createZarinPalPayment:', error);
    throw new Error('خطا در ایجاد پرداخت زرین‌پال');
  }
};

export const verifyZarinPalPayment = async (
  authority: string,
  amount: number
): Promise<{ success: boolean; refId?: string }> => {
  try {
    // Prepare data for ZarinPal verification API
    const verifyData: ZarinPalVerifyData = {
      merchant_id: ZARINPAL_CONFIG.MERCHANT_ID,
      amount: amount,
      authority: authority
    };

    // In a real implementation, you would call ZarinPal verification API here
    // For now, we'll simulate a successful payment
    if (ZARINPAL_CONFIG.SANDBOX) {
      console.log('ZarinPal verify data:', verifyData);
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate verification result (80% success rate)
    const success = Math.random() > 0.2;
    
    // In a real implementation, you would get the refId from ZarinPal API response
    const refId = success ? `ref_${Date.now()}` : undefined;

    if (success) {
      // Update the payment receipt status
      const { error: updateError } = await supabase
        .from('payment_receipts')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tracking_code', authority);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Get the receipt to get user info
      const { data: receipt, error: receiptError } = await supabase
        .from('payment_receipts')
        .select('user_id')
        .eq('tracking_code', authority)
        .single();

      if (receiptError) {
        throw new Error(receiptError.message);
      }

      // Update user's wallet balance
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          wallet_balance: supabase.rpc('wallet_balance + ?', [amount])
        })
        .eq('id', receipt.user_id);

      if (userError) {
        throw new Error(userError.message);
      }
    } else {
      // Update the payment receipt status to rejected
      const { error: updateError } = await supabase
        .from('payment_receipts')
        .update({ 
          status: 'rejected',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tracking_code', authority);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return { success, refId };
  } catch (error) {
    console.error('Error in verifyZarinPalPayment:', error);
    throw new Error('خطا در تأیید پرداخت زرین‌پال');
  }
};

export const uploadReceiptImage = async (
  file: File,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  console.log('Attempting to upload file:', { fileName, fileType: file.type, fileSize: file.size });
  
  const { data, error } = await supabase.storage
    .from('pic')
    .upload(fileName, file);

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Failed to upload receipt image: ${error.message}`);
  }

  console.log('Upload successful:', data);
  
  // Get the public URL for the uploaded file
  const { data: urlData } = supabase.storage
    .from('pic')
    .getPublicUrl(fileName);

  console.log('Generated public URL:', urlData.publicUrl);
  return urlData.publicUrl;
};

export const isAuctionPurchaseCompleted = async (simId: number, buyerId: string): Promise<boolean> => {
  // First, get the SIM card number
  const { data: simData, error: simError } = await supabase
    .from('sim_cards')
    .select('number')
    .eq('id', simId)
    .single();
    
  if (simError) {
    console.error('Error fetching SIM card:', simError);
    return false;
  }
  
  // Check if there's a purchase transaction for this SIM card and buyer
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', buyerId)
    .like('description', `خرید سیمکارت ${simData.number}`)
    .eq('type', 'purchase');
    
  if (error) {
    console.error('Error checking auction purchase status:', error);
    return false;
  }
  
  return data && data.length > 0;
};

export const completeAuctionPurchaseForWinner = async (simId: number, buyerId: string): Promise<void> => {
    // Get the SIM card
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simId)
        .single();
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    if (!simData) {
        throw new Error('SIM card not found.');
    }
    
    if (simData.status !== 'available') {
        throw new Error('این سیمکارت دیگر در دسترس نیست.');
    }
    
    if (simData.type !== 'auction') {
        throw new Error('This SIM card is not an auction.');
    }
    
    // Get auction details
    const { data: auctionDetails, error: auctionError } = await supabase
        .from('auction_details')
        .select('*')
        .eq('sim_card_id', simId)
        .single();
        
    if (auctionError) {
        throw new Error('جزئیات حراجی یافت نشد.');
    }
    
    // Check if auction has ended
    if (new Date(auctionDetails.end_time) > new Date()) {
        throw new Error('حراجی هنوز به پایان نرسیده است.');
    }
    
    // Check if this user is the highest bidder
    if (auctionDetails.highest_bidder_id !== buyerId) {
        throw new Error('شما برنده این حراجی نیستید.');
    }
    
    // Double-check that this auction hasn't already been processed by checking for existing transactions
    const { data: existingTransactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .like('description', `خرید سیمکارت ${simData.number}`)
        .eq('type', 'purchase')
        .eq('user_id', buyerId);
        
    if (transactionError) {
        console.error('Error checking for existing transactions:', transactionError);
    } else if (existingTransactions && existingTransactions.length > 0) {
        throw new Error('این حراجی قبلاً تکمیل شده است.');
    }
    
    // Determine the price (winning bid amount)
    const price = auctionDetails.current_bid;
    
    // Get buyer data
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
        
    if (buyerError) {
        throw new Error(`Buyer with ID ${buyerId} not found for transaction.`);
    }
    
    const buyerCurrentBalance = buyerData.wallet_balance || 0;
    const buyerBlockedBalance = buyerData.blocked_balance || 0;
    
    // Check if buyer has enough funds (including blocked funds)
    if ((buyerCurrentBalance + buyerBlockedBalance) < price) {
        throw new Error('موجودی کیف پول خریدار کافی نیست.');
    }
    
    // Get seller data
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', simData.seller_id)
        .single();
        
    if (sellerError) {
        throw new Error(`Seller with ID ${simData.seller_id} not found for transaction.`);
    }
    
    // Update buyer balance - only unblock the winning bid amount
    // The buyer already has the bid amount blocked, so we just need to adjust the balances
    // We should only unblock the amount from blocked balance, not deduct again from wallet
    const buyerNewBalance = buyerCurrentBalance; // No change to wallet balance
    const buyerNewBlockedBalance = buyerBlockedBalance - price; // Only unblock from blocked balance
    
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({ 
            wallet_balance: buyerNewBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
        
    if (buyerUpdateError) {
        throw new Error(buyerUpdateError.message);
    }
    
    // Update seller balance with 2% commission deduction
    const COMMISSION_PERCENTAGE = 2;
    const commissionAmount = Math.floor(price * (COMMISSION_PERCENTAGE / 100));
    const sellerReceivedAmount = price - commissionAmount;
    const sellerNewBalance = (sellerData.wallet_balance || 0) + sellerReceivedAmount;
    const { error: sellerUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: sellerNewBalance })
        .eq('id', simData.seller_id);
        
    if (sellerUpdateError) {
        throw new Error(sellerUpdateError.message);
    }
    
    // Update SIM card status
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ status: 'sold', sold_date: new Date().toISOString() })
        .eq('id', simId);
        
    if (simUpdateError) {
        throw new Error(simUpdateError.message);
    }
    
    // Add transaction records
    const buyerTransaction = {
        user_id: buyerId,
        type: 'purchase' as const,
        amount: -price,
        description: `خرید سیمکارت ${simData.number}`,
        date: new Date().toISOString()
    };
    
    const { error: buyerTransactionError } = await supabase
        .from('transactions')
        .insert(buyerTransaction);
        
    if (buyerTransactionError) {
        throw new Error(buyerTransactionError.message);
    }
    
    const sellerTransaction = {
        user_id: simData.seller_id,
        type: 'sale' as const,
        amount: sellerReceivedAmount,
        description: `فروش سیمکارت ${simData.number} (کمیسیون ${commissionAmount} تومان کسر شد)`,
        date: new Date().toISOString()
    };
    
    const { error: sellerTransactionError } = await supabase
        .from('transactions')
        .insert(sellerTransaction);
        
    if (sellerTransactionError) {
        throw new Error(sellerTransactionError.message);
    }
    
    // Record commission in commissions table
    const { data: commissionBuyerData, error: buyerDataError } = await supabase
        .from('users')
        .select('name')
        .eq('id', buyerId)
        .single();
        
    if (!buyerDataError && commissionBuyerData) {
        const commissionRecord = {
            sim_card_id: simId,
            seller_id: simData.seller_id,
            seller_name: sellerData.name,
            sim_number: simData.number,
            sale_price: price,
            commission_amount: commissionAmount,
            commission_percentage: COMMISSION_PERCENTAGE,
            seller_received_amount: sellerReceivedAmount,
            sale_type: simData.type,
            buyer_id: buyerId,
            buyer_name: commissionBuyerData.name,
            date: new Date().toISOString()
        };
        
        const { error: commissionError } = await supabase.from('commissions').insert(commissionRecord);
        
        if (commissionError) {
            console.error('Error recording commission:', commissionError.message);
        }
    } else {
        console.error('Error fetching buyer data for commission:', buyerDataError?.message);
    }
    
    // Handle auction refunds for other bidders
    // Get bids for this auction
    const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('sim_card_id', simId);
        
    if (!bidsError && bidsData && bidsData.length > 0) {
        const otherBidders = bidsData.filter(b => b.user_id !== buyerId);
        
        for (const bid of otherBidders) {
            // Get bidder data
            const { data: bidderData, error: bidderError } = await supabase
                .from('users')
                .select('*')
                .eq('id', bid.user_id)
                .single();
                
            if (!bidderError && bidderData) {
                const newWalletBalance = (bidderData.wallet_balance || 0) + bid.amount;
                const newBlockedBalance = (bidderData.blocked_balance || 0) - bid.amount;
                
                const { error: bidderUpdateError } = await supabase
                    .from('users')
                    .update({ 
                        wallet_balance: newWalletBalance,
                        blocked_balance: newBlockedBalance
                    })
                    .eq('id', bid.user_id);
                    
                if (bidderUpdateError) {
                    console.error('Error updating bidder balance:', bidderUpdateError.message);
                }
            }
        }
    }
};

export const completeAuctionPurchase = async (simId: number): Promise<void> => {
  // Get the SIM card
  const { data: simData, error: simError } = await supabase
    .from('sim_cards')
    .select('*')
    .eq('id', simId)
    .single();
    
  if (simError) {
    throw new Error(simError.message);
  }
  
  if (!simData) {
    throw new Error('SIM card not found.');
  }
  
  if (simData.type !== 'auction') {
    throw new Error('This SIM card is not an auction.');
  }
  
  if (simData.status !== 'available') {
    throw new Error('This SIM card is not available.');
  }
  
  // Get auction details
  const { data: auctionDetails, error: auctionError } = await supabase
    .from('auction_details')
    .select('*')
    .eq('sim_card_id', simId)
    .single();
    
  if (auctionError) {
    throw new Error('Auction details not found.');
  }
  
  // Check if auction has ended
  if (new Date(auctionDetails.end_time) > new Date()) {
    throw new Error('Auction has not ended yet.');
  }
  
  // Check if there is a highest bidder
  if (!auctionDetails.highest_bidder_id) {
    throw new Error('No bids were placed on this auction.');
  }
  
  // Complete the purchase for the highest bidder using the specialized function
  await completeAuctionPurchaseForWinner(simId, auctionDetails.highest_bidder_id);
};

export const processEndedAuctions = async (): Promise<void> => {
  try {
    // Get all ended auctions that haven't been processed yet
    const { data: endedAuctions, error: auctionsError } = await supabase
      .from('sim_cards')
      .select('id')
      .eq('type', 'auction')
      .eq('status', 'available')
      .lt('auction_details.end_time', new Date().toISOString());
      
    if (auctionsError) {
      throw new Error('Error fetching ended auctions: ' + auctionsError.message);
    }
    
    // Process each ended auction
    for (const auction of endedAuctions || []) {
      try {
        // Check if auction has already been processed by looking for a transaction
        // First, get the SIM card to get its number
        const { data: simData, error: simError } = await supabase
          .from('sim_cards')
          .select('number, auction_details(highest_bidder_id)')
          .eq('id', auction.id)
          .single();
          
        if (simError || !simData) {
          console.error(`Error fetching SIM card ${auction.id}:`, simError);
          continue;
        }
        
        // Check if there's already a purchase transaction for this SIM card
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .like('description', `خرید سیمکارت ${simData.number}`)
          .eq('type', 'purchase');
          
        if (transactionsError) {
          console.error(`Error checking transactions for SIM card ${auction.id}:`, transactionsError);
          continue;
        }
        
        // If there's already a purchase transaction, skip this auction
        if (transactionsData && transactionsData.length > 0) {
          console.log(`Auction ${auction.id} already processed, skipping...`);
          continue;
        }
        
        // If there's no highest bidder, skip this auction
        // Note: auction_details is returned as an array, so we need to access the first element
        const auctionDetails = Array.isArray(simData.auction_details) 
          ? simData.auction_details[0] 
          : simData.auction_details;
          
        if (!auctionDetails || !auctionDetails.highest_bidder_id) {
          console.log(`Auction ${auction.id} has no highest bidder, skipping...`);
          continue;
        }
        
        // Process the auction
        await completeAuctionPurchaseForWinner(auction.id, auctionDetails.highest_bidder_id);
      } catch (error) {
        console.error(`Error processing auction ${auction.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processEndedAuctions:', error);
    throw error;
  }
};

export const getCommissions = async (): Promise<Commission[]> => {
    const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data || [];
};

// --- Secure Payments (Escrow System) ---

export const generateBuyerPaymentCode = async (userId: string): Promise<string> => {
    // Check if user already has a payment code
    const { data: existingCode, error: checkError } = await supabase
        .from('buyer_payment_codes')
        .select('payment_code')
        .eq('user_id', userId)
        .single();
    
    if (existingCode && !checkError) {
        return existingCode.payment_code;
    }
    
    // Generate a unique payment code (format: BUYER-XXXXXXXX)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const paymentCode = `BUYER-${randomPart}`;
    
    // Check if code already exists (very unlikely but check anyway)
    const { data: codeExists } = await supabase
        .from('buyer_payment_codes')
        .select('id')
        .eq('payment_code', paymentCode)
        .single();
    
    if (codeExists) {
        // Recursively generate a new code if this one exists
        return generateBuyerPaymentCode(userId);
    }
    
    // Insert the new payment code
    const { error: insertError } = await supabase
        .from('buyer_payment_codes')
        .insert({ user_id: userId, payment_code: paymentCode });
    
    if (insertError) {
        throw new Error(`Failed to generate payment code: ${insertError.message}`);
    }
    
    return paymentCode;
};

export const getBuyerPaymentCode = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('buyer_payment_codes')
        .select('payment_code')
        .eq('user_id', userId)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') { // Not found
            return null;
        }
        throw new Error(error.message);
    }
    
    return data?.payment_code || null;
};

export const createSecurePayment = async (
    buyerCode: string,
    simCardId: number,
    sellerId: string,
    customAmount?: number
): Promise<SecurePayment> => {
    // Normalize buyer code (trim and uppercase)
    const normalizedCode = buyerCode.trim().toUpperCase();
    
    // Get buyer ID from payment code
    const { data: codeData, error: codeError } = await supabase
        .from('buyer_payment_codes')
        .select('user_id, payment_code')
        .ilike('payment_code', normalizedCode)
        .single();
    
    if (codeError || !codeData) {
        throw new Error('کد پرداخت نامعتبر است');
    }
    
    const buyerId = codeData.user_id;
    
    // Get SIM card details
    const { data: simCard, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simCardId)
        .single();
    
    if (simError || !simCard) {
        throw new Error('شماره سیمکارت یافت نشد');
    }
    
    if (simCard.seller_id !== sellerId) {
        throw new Error('این شماره به شما تعلق ندارد');
    }
    
    if (simCard.status !== 'available') {
        throw new Error('این شماره دیگر در دسترس نیست');
    }
    
    // Check if SIM is already reserved for another secure payment
    if (simCard.reserved_by_secure_payment_id) {
        // Check if it's reserved by the same buyer for this payment
        const { data: existingPayment } = await supabase
            .from('secure_payments')
            .select('id, buyer_id')
            .eq('id', simCard.reserved_by_secure_payment_id)
            .single();
        
        // If reserved for a different buyer, reject
        if (existingPayment && existingPayment.buyer_id !== buyerId) {
            throw new Error('این شماره لاله خریدار دیگری است');
        }
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Get seller details
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', sellerId)
        .single();
    
    if (sellerError || !sellerData) {
        throw new Error('فروشنده یافت نشد');
    }
    
    const amount = customAmount || simCard.price;
    
    // Check if buyer has enough balance
    if ((buyerData.wallet_balance || 0) < amount) {
        throw new Error('موجودی کیف پول برای انجام این پرداخت امن کافی نیست');
    }
    
    // Create secure payment record WITHOUT blocking money yet
    const { data: securePaymentData, error: paymentError } = await supabase
        .from('secure_payments')
        .insert({
            buyer_id: buyerId,
            buyer_name: buyerData.name,
            seller_id: sellerId,
            seller_name: sellerData.name,
            sim_card_id: simCardId,
            sim_number: simCard.number,
            amount: amount,
            buyer_code: codeData.payment_code,
            status: 'pending',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (paymentError) {
        throw new Error(`خطا در ثبت پرداخت امن: ${paymentError.message}`);
    }
    
    return securePaymentData as SecurePayment;
};

export const withdrawSecurePaymentFunds = async (
    securePaymentId: number,
    buyerId: string
): Promise<void> => {
    // Get secure payment details
    const { data: payment, error: paymentError } = await supabase
        .from('secure_payments')
        .select('*')
        .eq('id', securePaymentId)
        .single();
    
    if (paymentError || !payment) {
        throw new Error('پرداخت امن یافت نشد');
    }
    
    if (payment.buyer_id !== buyerId) {
        throw new Error('شما برای این پرداخت مجاز نیستید');
    }
    
    if (payment.status !== 'pending') {
        throw new Error('این پرداخت امن قابل برداشت نیست');
    }
    
    if (payment.withdrawn_at) {
        throw new Error('این پرداخت امن قبلاً برداشت شده است');
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Check if buyer has enough balance
    if ((buyerData.wallet_balance || 0) < payment.amount) {
        throw new Error('موجودی کیف پول کافی نیست');
    }
    
    // Deduct amount from buyer's wallet and add to blocked_balance
    const buyerNewBalance = (buyerData.wallet_balance || 0) - payment.amount;
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) + payment.amount;
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({ 
            wallet_balance: buyerNewBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
    
    if (buyerUpdateError) {
        throw new Error(`خطا در برداشت مبلغ: ${buyerUpdateError.message}`);
    }
    
    // Lock SIM card to this buyer by marking withdrawal
    const { error: paymentUpdateError } = await supabase
        .from('secure_payments')
        .update({
            withdrawn_at: new Date().toISOString(),
            locked_to_buyer_id: buyerId
        })
        .eq('id', securePaymentId);
    
    if (paymentUpdateError) {
        // Rollback buyer's wallet
        await supabase
            .from('users')
            .update({ 
                wallet_balance: buyerData.wallet_balance,
                blocked_balance: buyerData.blocked_balance
            })
            .eq('id', buyerId);
        throw new Error(`خطا در برداشت: ${paymentUpdateError.message}`);
    }
    
    // Lock SIM card to this secure payment
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ reserved_by_secure_payment_id: securePaymentId })
        .eq('id', payment.sim_card_id);
    
    if (simUpdateError) {
        // Rollback all changes
        await supabase
            .from('users')
            .update({ 
                wallet_balance: buyerData.wallet_balance,
                blocked_balance: buyerData.blocked_balance
            })
            .eq('id', buyerId);
        await supabase
            .from('secure_payments')
            .update({
                withdrawn_at: null,
                locked_to_buyer_id: null
            })
            .eq('id', securePaymentId);
        throw new Error(`خطا در قفل کردن شماره: ${simUpdateError.message}`);
    }
    
    // Create transaction record
    await supabase.from('transactions').insert({
        user_id: buyerId,
        type: 'purchase',
        amount: -payment.amount,
        description: `برداشت مبلغ پرداخت امن برای شماره ${payment.sim_number}`,
        date: new Date().toISOString()
    });
};

export const releaseSecurePayment = async (
    securePaymentId: number,
    buyerId: string
): Promise<void> => {
    // Get secure payment details
    const { data: payment, error: paymentError } = await supabase
        .from('secure_payments')
        .select('*')
        .eq('id', securePaymentId)
        .single();
    
    if (paymentError || !payment) {
        throw new Error('پرداخت امن یافت نشد');
    }
    
    if (payment.buyer_id !== buyerId) {
        throw new Error('شما مجاز به تایید این پرداخت نیستید');
    }
    
    if (payment.status !== 'pending') {
        throw new Error('این پرداخت امن قابل تایید نیست');
    }
    
    // Check if funds were withdrawn
    if (!payment.withdrawn_at) {
        throw new Error('لطفاً ابتدا مبلغ پرداخت امن را برداشت کنید');
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.buyer_id)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Get seller details
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.seller_id)
        .single();
    
    if (sellerError || !sellerData) {
        throw new Error('فروشنده یافت نشد');
    }
    
    // Calculate 2% commission
    const COMMISSION_PERCENTAGE = 2;
    const commissionAmount = Math.floor(payment.amount * (COMMISSION_PERCENTAGE / 100));
    const sellerReceivedAmount = payment.amount - commissionAmount;
    
    // Update buyer's blocked_balance (remove the held amount)
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) - payment.amount;
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({ blocked_balance: buyerNewBlockedBalance })
        .eq('id', buyerId);
    
    if (buyerUpdateError) {
        throw new Error(`خطا در بروزرسانی کیف پول خریدار: ${buyerUpdateError.message}`);
    }
    
    // Update seller's wallet (add with commission deducted)
    const sellerNewWalletBalance = (sellerData.wallet_balance || 0) + sellerReceivedAmount;
    
    const { error: sellerUpdateError } = await supabase
        .from('users')
        .update({
            wallet_balance: sellerNewWalletBalance
        })
        .eq('id', payment.seller_id);
    
    if (sellerUpdateError) {
        // Rollback buyer's blocked balance
        await supabase
            .from('users')
            .update({ blocked_balance: buyerData.blocked_balance })
            .eq('id', buyerId);
        throw new Error(`خطا در آزادسازی پول: ${sellerUpdateError.message}`);
    }
    
    // Record commission in commissions table
    const { error: commissionError } = await supabase
        .from('commissions')
        .insert({
            seller_id: payment.seller_id,
            buyer_id: payment.buyer_id,
            seller_name: sellerData.name,
            buyer_name: buyerData.name,
            amount: commissionAmount,
            transaction_type: 'secure_payment',
            transaction_id: securePaymentId,
            description: `کارمزد پرداخت امن - شماره ${payment.sim_number}`,
            created_at: new Date().toISOString()
        });
    
    if (commissionError) {
        console.error('خطا در ثبت کارمزد:', commissionError);
    }
    
    // Update payment status to released
    const { error: updateError } = await supabase
        .from('secure_payments')
        .update({
            status: 'released',
            released_at: new Date().toISOString()
        })
        .eq('id', securePaymentId);
    
    if (updateError) {
        throw new Error(`خطا در بروزرسانی وضعیت پرداخت: ${updateError.message}`);
    }
    
    // Mark SIM card as sold
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ status: 'sold' })
        .eq('id', payment.sim_card_id);
    
    if (simUpdateError) {
        console.error('خطا در علامتگذاری به عنوان فروخته شده:', simUpdateError);
    }
    
    // Create transaction for seller (with commission deducted)
    await supabase.from('transactions').insert({
        user_id: payment.seller_id,
        type: 'sale',
        amount: sellerReceivedAmount,
        description: `تایید پرداخت امن برای شماره ${payment.sim_number} (کارمزد: ${commissionAmount})`,
        date: new Date().toISOString()
    });
    
    // Create transaction for buyer (deduction from blocked balance)
    await supabase.from('transactions').insert({
        user_id: payment.buyer_id,
        type: 'purchase',
        amount: -payment.amount,
        description: `تایید پرداخت امن برای شماره ${payment.sim_number}`,
        date: new Date().toISOString()
    });
};

export const cancelSecurePayment = async (
    securePaymentId: number,
    buyerId: string
): Promise<void> => {
    // Get secure payment details
    const { data: payment, error: paymentError } = await supabase
        .from('secure_payments')
        .select('*')
        .eq('id', securePaymentId)
        .single();
    
    if (paymentError || !payment) {
        throw new Error('پرداخت امن یافت نشد');
    }
    
    if (payment.buyer_id !== buyerId) {
        throw new Error('شما مجاز به لغو این پرداخت نیستید');
    }
    
    if (payment.status !== 'pending') {
        throw new Error('این پرداخت امن قابل لغو نیست');
    }
    
    // Check if funds were withdrawn
    if (!payment.withdrawn_at) {
        throw new Error('هنوز مبلغ برداشت نشده است بنابراین نمیتوانید لغو کنید');
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Refund from blocked_balance to wallet_balance
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) - payment.amount;
    const buyerNewWalletBalance = (buyerData.wallet_balance || 0) + payment.amount;
    
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({
            wallet_balance: buyerNewWalletBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
    
    if (buyerUpdateError) {
        throw new Error(`خطا در بازگرداندن پول: ${buyerUpdateError.message}`);
    }
    
    // Update payment status to cancelled
    const { error: updateError } = await supabase
        .from('secure_payments')
        .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
            withdrawn_at: null,
            locked_to_buyer_id: null
        })
        .eq('id', securePaymentId);
    
    if (updateError) {
        // Rollback buyer's wallet
        await supabase
            .from('users')
            .update({
                wallet_balance: buyerData.wallet_balance,
                blocked_balance: buyerData.blocked_balance
            })
            .eq('id', buyerId);
        throw new Error(`خطا در بروزرسانی وضعیت پرداخت: ${updateError.message}`);
    }
    
    // Unlock SIM card
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ reserved_by_secure_payment_id: null })
        .eq('id', payment.sim_card_id);
    
    if (simUpdateError) {
        console.error('خطا در جبران قفل شماره:', simUpdateError);
    }
    
    // Create transaction for refund
    await supabase.from('transactions').insert({
        user_id: buyerId,
        type: 'refund',
        amount: payment.amount,
        description: `بازگرداندن پول پرداخت امن لغو شده برای شماره ${payment.sim_number}`,
        date: new Date().toISOString()
    });
};

export const getSecurePayments = async (userId: string, role: 'buyer' | 'seller'): Promise<SecurePayment[]> => {
    const { data, error } = await supabase
        .from('secure_payments')
        .select('*')
        .eq(role === 'buyer' ? 'buyer_id' : 'seller_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data as SecurePayment[];
};

// --- Auto-cleanup functions ---

export const deleteExpiredListings = async (): Promise<number> => {
    // Get current date
    const now = new Date();
    // Calculate 1 month ago
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneMonthAgoIso = oneMonthAgo.toISOString();
    
    // Get all sim cards that were created more than 1 month ago
    const { data: expiredSims, error: fetchError } = await supabase
        .from('sim_cards')
        .select('id')
        .lt('created_at', oneMonthAgoIso);
    
    if (fetchError) {
        console.error('خطا در بررسی اعلامات منقضی شده:', fetchError);
        return 0;
    }
    
    if (!expiredSims || expiredSims.length === 0) {
        return 0; // No expired listings
    }
    
    const expiredIds = expiredSims.map(sim => sim.id);
    
    // Delete expired sim cards
    const { error: deleteError } = await supabase
        .from('sim_cards')
        .delete()
        .in('id', expiredIds);
    
    if (deleteError) {
        console.error('خطا در حذف اعلامات منقضی شده:', deleteError);
        return 0;
    }
    
    return expiredIds.length;
};

// Export all functions as an object
const api = {
    signup,
    login,
    requestPasswordReset,
    createUserProfile,
    getUserProfile,
    getUsers,
    updateUser,
    updateUserPackage,
    getSimCards,
    addSimCard,
    updateSimCard,
    getPackages,
    addPackage,
    updatePackage,
    getTransactions,
    processTransaction,
    purchaseSim,
    placeBid,
    createPaymentReceipt,
    getPaymentReceiptByAuthority,
    getAllPaymentReceipts,
    createZarinPalPayment,
    verifyZarinPalPayment,
    uploadReceiptImage,
    completeAuctionPurchase,
    processEndedAuctions,
    isAuctionPurchaseCompleted,
    completeAuctionPurchaseForWinner,
    getCommissions,
    generateBuyerPaymentCode,
    getBuyerPaymentCode,
    createSecurePayment,
    withdrawSecurePaymentFunds,
    releaseSecurePayment,
    cancelSecurePayment,
    getSecurePayments,
    deleteExpiredListings,
};

export default api;
