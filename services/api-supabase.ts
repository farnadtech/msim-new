import { supabase } from './supabase';
import { User, SimCard, Package, Transaction, Bid } from '../types';

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
    const simCardPayload = {
        number: simData.number,
        price: simData.price,
        seller_id: simData.seller_id,
        type: simData.type,
        status: simData.status,
        sold_date: simData.sold_date,
        carrier: simData.carrier,
        is_rond: simData.is_rond,
        inquiry_phone_number: simData.inquiry_phone_number
    };

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
            const minimalPayload = {
                number: simData.number,
                price: simData.price,
                seller_id: simData.seller_id,
                type: simData.type,
                status: 'available', // Always default to available
                carrier: simData.carrier,
                is_rond: simData.is_rond
            };
            
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
            
            // If this is a rond sim card, charge 5000 tomans
            if (simData.is_rond) {
                transactionAmount -= 5000;
                transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number}`;
                
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
    
    // If this is a rond sim card, charge 5000 tomans
    if (simData.is_rond) {
        transactionAmount -= 5000;
        transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number}`;
        
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
    
    // Update seller balance
    const sellerNewBalance = (sellerData.wallet_balance || 0) + price;
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
        amount: price,
        description: `فروش سیمکارت ${simData.number}`,
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

export const uploadReceiptImage = async (
  file: File,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('payment-receipts')
    .upload(fileName, file);

  if (error) {
    throw new Error(error.message);
  }

  // Get the public URL for the uploaded file
  const { data: urlData } = supabase.storage
    .from('payment-receipts')
    .getPublicUrl(fileName);

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
    
    // Update seller balance
    const sellerNewBalance = (sellerData.wallet_balance || 0) + price;
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
        amount: price,
        description: `فروش سیمکارت ${simData.number}`,
        date: new Date().toISOString()
    };
    
    const { error: sellerTransactionError } = await supabase
        .from('transactions')
        .insert(sellerTransaction);
        
    if (sellerTransactionError) {
        throw new Error(sellerTransactionError.message);
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
    uploadReceiptImage,
    completeAuctionPurchase,
    processEndedAuctions,
    isAuctionPurchaseCompleted,
    completeAuctionPurchaseForWinner,
};

export default api;
