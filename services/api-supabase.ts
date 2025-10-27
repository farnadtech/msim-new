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
        
        // Merge auction details with sim cards
        return simCards.map(sim => {
            if (sim.type === 'auction') {
                const details = auctionDetails.find(detail => detail.sim_card_id === sim.id);
                if (details) {
                    return {
                        ...sim,
                        auction_details: {
                            current_bid: details.current_bid,
                            highest_bidder_id: details.highest_bidder_id,
                            end_time: details.end_time,
                            bids: [] // We'll need to fetch bids separately if needed
                        }
                    };
                } else {
                    // If no auction details found, create default ones
                    console.warn(`No auction details found for sim card ${sim.id}, creating defaults`);
                    return {
                        ...sim,
                        auction_details: {
                            current_bid: sim.price || 0,
                            highest_bidder_id: null,
                            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            bids: []
                        }
                    };
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
            
            // Handle financial transactions for the seller
            let transactionAmount = 0;
            let transactionDescription = '';
            
            // If this is a rond sim card, charge 5000 tomans
            if (simData.is_rond) {
                transactionAmount -= 5000;
                transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number}`;
            }
            
            // If this is an auction sim card, charge additional fee
            if (simData.type === 'auction') {
                // For auction cards, we charge 5000 tomans regardless of being rond or not
                transactionAmount -= 5000;
                if (transactionDescription) {
                    transactionDescription += ' و ';
                }
                transactionDescription += `هزینه ثبت سیمکارت حراجی ${simData.number}`;
            }
            
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
            
            // If this is an auction sim card, create auction details
            if (simData.type === 'auction') {
                const auctionDetails = {
                    sim_card_id: simCardId,
                    current_bid: simData.price || 0, // Use the price set by the seller as the starting bid
                    highest_bidder_id: null,
                    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
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
    
    // Handle financial transactions for the seller
    let transactionAmount = 0;
    let transactionDescription = '';
    
    // If this is a rond sim card, charge 5000 tomans
    if (simData.is_rond) {
        transactionAmount -= 5000;
        transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number}`;
    }
    
    // If this is an auction sim card, charge additional fee
    if (simData.type === 'auction') {
        // For auction cards, we charge 5000 tomans regardless of being rond or not
        transactionAmount -= 5000;
        if (transactionDescription) {
            transactionDescription += ' و ';
        }
        transactionDescription += `هزینه ثبت سیمکارت حراجی ${simData.number}`;
    }
    
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
    
    // If this is an auction sim card, create auction details
    if (simData.type === 'auction') {
        const auctionDetails = {
            sim_card_id: simCardId,
            current_bid: simData.price || 0, // Use the price set by the seller as the starting bid
            highest_bidder_id: null,
            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
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
    
    if (simData.status === 'sold') {
        throw new Error('This SIM card has already been sold.');
    }
    
    // Get auction details if this is an auction sim card
    let auctionDetails = null;
    if (simData.type === 'auction') {
        const { data: auctionData, error: auctionError } = await supabase
            .from('auction_details')
            .select('*')
            .eq('sim_card_id', simId)
            .single();
            
        if (auctionError && auctionError.code !== 'PGRST116') { // PGRST116 means no rows returned
            throw new Error('Error fetching auction details: ' + auctionError.message);
        }
        
        // If no auction details found, create default ones
        if (!auctionData) {
            auctionDetails = {
                current_bid: simData.price || 0,
                highest_bidder_id: null,
                end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
        } else {
            auctionDetails = auctionData;
        }
    }
    
    const price = simData.type === 'auction' && auctionDetails ? auctionDetails.current_bid : simData.price;
    
    if (simData.type === 'auction' && auctionDetails?.highest_bidder_id !== buyerId) {
        throw new Error('Only the highest bidder can purchase this auctioned SIM.');
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
    if (buyerCurrentBalance < price) {
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
    
    // Update buyer balance
    const buyerNewBalance = buyerCurrentBalance - price;
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: buyerNewBalance })
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
    const { error } = await supabase
        .from('sim_cards')
        .update(updatedData)
        .eq('id', simId);
        
    if (error) {
        throw new Error(error.message);
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
};

export default api;