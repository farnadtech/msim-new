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
    const { data, error } = await supabase
        .from('sim_cards')
        .select('*');
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as SimCard[];
};

export const addSimCard = async (simData: Omit<SimCard, 'id'>): Promise<string> => {
    const { data, error } = await supabase
        .from('sim_cards')
        .insert(simData)
        .select();
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data[0].id;
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
    
    const price = simData.type === 'auction' && simData.auction_details ? simData.auction_details.current_bid : simData.price;
    
    if (simData.type === 'auction' && simData.auction_details?.highest_bidder_id !== buyerId) {
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
    if (simData.type === 'auction' && simData.auction_details && simData.auction_details.bids.length > 0) {
        const otherBidders = simData.auction_details.bids.filter(b => b.user_id !== buyerId);
        
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
    
    if (simData.type !== 'auction' || !simData.auction_details) {
        throw new Error('Auction not found.');
    }
    
    if (new Date(simData.auction_details.end_time) < new Date()) {
        throw new Error('این حراجی به پایان رسیده است.');
    }
    
    if (amount <= simData.auction_details.current_bid) {
        throw new Error(`پیشنهاد شما باید بیشتر از ${simData.auction_details.current_bid.toLocaleString('fa-IR')} تومان باشد.`);
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
    const previousHighestBidderId = simData.auction_details.highest_bidder_id;
    if (previousHighestBidderId && previousHighestBidderId !== bidderId) {
        const { data: prevBidderData, error: prevBidderError } = await supabase
            .from('users')
            .select('*')
            .eq('id', previousHighestBidderId)
            .single();
            
        if (!prevBidderError && prevBidderData) {
            const amountToUnblock = simData.auction_details.current_bid;
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
    
    // Update sim card auction details
    const newBid: Bid = { user_id: bidderId, amount: amount, date: new Date().toISOString() };
    const updatedBids = [...simData.auction_details.bids, newBid];
    const updatedAuctionDetails = {
        ...simData.auction_details,
        current_bid: amount,
        highest_bidder_id: bidderId,
        bids: updatedBids,
    };
    
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ auction_details: updatedAuctionDetails })
        .eq('id', simId);
        
    if (simUpdateError) {
        throw new Error(simUpdateError.message);
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