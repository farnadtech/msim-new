
import { db } from './firebase';
import { User, SimCard, Package, Transaction, Bid } from '../types';
import { 
    collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, setDoc 
} from 'firebase/firestore';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    UserCredential
} from 'firebase/auth';
import { seedDatabase } from '../seed';

const auth = getAuth();

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

export const signup = async (email: string, password: string): Promise<UserCredential> => {
    return await createUserWithEmailAndPassword(auth, email, password);
};

export const createUserProfile = async (userId: string, data: Omit<User, 'id'>): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
        id: userId,
        ...data
    });
};

export const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        return {
            ...data,
            id: data.id || userDoc.id // Use data.id if it exists, otherwise use document ID
        } as User;
    }
    return null;
};

export const getUsers = async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: data.id || doc.id // Use data.id if it exists, otherwise use document ID
        } as User;
    });
};

export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, updatedData);
};

export const updateUserPackage = async (userId: string, packageId: number): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { package_id: packageId });
};

// --- SIM Card Management ---

export const getSimCards = async (): Promise<SimCard[]> => {
    const simCardsCol = collection(db, 'sim_cards');
    const simCardSnapshot = await getDocs(simCardsCol);
    return simCardSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: data.id || parseInt(doc.id) // Use data.id if it exists, otherwise use parsed document ID
        } as SimCard;
    });
};

export const addSimCard = async (simData: Omit<SimCard, 'id'>): Promise<string> => {
    // First, get all existing SIM cards to determine the next ID
    const simCardsCol = collection(db, 'sim_cards');
    const simCardSnapshot = await getDocs(simCardsCol);
    
    // Find the highest existing ID
    let maxId = 0;
    simCardSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const numericId = data.id || 0;
        if (numericId > maxId) {
            maxId = numericId;
        }
    });
    
    // Assign the next available ID
    const nextId = maxId + 1;
    
    const cleanedData = removeUndefinedProps({
        ...simData,
        id: nextId
    });
    
    const docRef = await addDoc(simCardsCol, cleanedData);
    return docRef.id;
};

// Modify purchaseSim to work with numeric IDs
export const purchaseSim = async (simId: number, buyerId: string): Promise<void> => {
    // First, find the document with the matching numeric ID
    const simCardsCol = collection(db, 'sim_cards');
    const q = query(simCardsCol);
    const querySnapshot = await getDocs(q);
    
    let simDocRef: any = null;
    let simData: any = null;
    
    for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const numericId = data.id || parseInt(doc.id);
        if (numericId === simId) {
            simDocRef = doc.ref;
            simData = data as SimCard;
            break;
        }
    }
    
    if (!simDocRef || !simData) {
        throw new Error('SIM card not found.');
    }

    if (simData.status === 'sold') {
        throw new Error('This SIM card has already been sold.');
    }

    const price = simData.type === 'auction' && simData.auction_details ? simData.auction_details.current_bid : simData.price;

    if (simData.type === 'auction' && simData.auction_details?.highest_bidder_id !== buyerId) {
        throw new Error('Only the highest bidder can purchase this auctioned SIM.');
    }

    // Use a batch to ensure all operations succeed or fail together
    const batch = writeBatch(db);
    
    // Process buyer transaction
    const buyerDocRef = doc(db, 'users', buyerId);
    const buyerDoc = await getDoc(buyerDocRef);
    
    if (!buyerDoc.exists()) {
        throw new Error(`Buyer with ID ${buyerId} not found for transaction.`);
    }
    
    const buyerData = buyerDoc.data();
    const buyerCurrentBalance = buyerData.wallet_balance || 0;
    if (buyerCurrentBalance < price) {
        throw new Error('موجودی کیف پول خریدار کافی نیست.');
    }
    
    const buyerNewBalance = buyerCurrentBalance - price;
    batch.update(buyerDocRef, { wallet_balance: buyerNewBalance });
    
    // Process seller transaction
    const sellerDocRef = doc(db, 'users', simData.seller_id);
    const sellerDoc = await getDoc(sellerDocRef);
    
    if (!sellerDoc.exists()) {
        throw new Error(`Seller with ID ${simData.seller_id} not found for transaction.`);
    }
    
    const sellerData = sellerDoc.data();
    const sellerNewBalance = (sellerData.wallet_balance || 0) + price;
    batch.update(sellerDocRef, { wallet_balance: sellerNewBalance });
    
    // Update SIM card status
    batch.update(simDocRef, { status: 'sold', sold_date: new Date().toISOString() });
    
    // Add transaction records
    const transactionsCol = collection(db, 'transactions');
    const buyerTransactionRef = doc(transactionsCol);
    batch.set(buyerTransactionRef, {
        user_id: buyerId,
        type: 'purchase',
        amount: -price,
        description: `خرید سیمکارت ${simData.number}`,
        date: new Date().toISOString()
    });
    
    const sellerTransactionRef = doc(transactionsCol);
    batch.set(sellerTransactionRef, {
        user_id: simData.seller_id,
        type: 'sale',
        amount: price,
        description: `فروش سیمکارت ${simData.number}`,
        date: new Date().toISOString()
    });
    
    // Commit all changes together
    await batch.commit();

    if (simData.type === 'auction' && simData.auction_details && simData.auction_details.bids.length > 0) {
        const refundBatch = writeBatch(db);
        const otherBidders = simData.auction_details.bids.filter(b => b.user_id !== buyerId);

        for (const bid of otherBidders) {
            const bidderDocRef = doc(db, 'users', bid.user_id);
            const bidderDoc = await getDoc(bidderDocRef);
            if (bidderDoc.exists()) {
                const bidder = bidderDoc.data() as User;
                const newWalletBalance = (bidder.wallet_balance || 0) + bid.amount;
                const newBlockedBalance = (bidder.blocked_balance || 0) - bid.amount;
                refundBatch.update(bidderDocRef, { 
                    wallet_balance: newWalletBalance,
                    blocked_balance: newBlockedBalance
                });
            }
            // If bidder doesn't exist, we simply skip the refund for that bidder
            // This prevents the "User not found" error from stopping the entire transaction
        }
        await refundBatch.commit();
    }
};

// Modify placeBid to work with numeric IDs
export const placeBid = async (simId: number, bidderId: string, amount: number): Promise<void> => {
    // First, find the document with the matching numeric ID
    const simCardsCol = collection(db, 'sim_cards');
    const q = query(simCardsCol);
    const querySnapshot = await getDocs(q);
    
    let simDocRef: any = null;
    let simData: any = null;
    
    for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const numericId = data.id || parseInt(doc.id);
        if (numericId === simId) {
            simDocRef = doc.ref;
            simData = data as SimCard;
            break;
        }
    }
    
    if (!simDocRef || !simData) {
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

    const bidderDocRef = doc(db, 'users', bidderId);
    const bidderDoc = await getDoc(bidderDocRef);

    if (!bidderDoc.exists()) {
        throw new Error('Bidder not found.');
    }

    const bidder = bidderDoc.data() as User;
    if ((bidder.wallet_balance || 0) < amount) {
        throw new Error('موجودی کیف پول برای ثبت این پیشنهاد کافی نیست.');
    }

    const batch = writeBatch(db);

    // Unblock previous highest bidder's funds
    const previousHighestBidderId = simData.auction_details.highest_bidder_id;
    if (previousHighestBidderId && previousHighestBidderId !== bidderId) {
        const prevBidderDocRef = doc(db, 'users', previousHighestBidderId);
        const prevBidderDoc = await getDoc(prevBidderDocRef);
        if (prevBidderDoc.exists()) {
            const prevBidder = prevBidderDoc.data() as User;
            const amountToUnblock = simData.auction_details.current_bid;
            batch.update(prevBidderDocRef, {
                wallet_balance: (prevBidder.wallet_balance || 0) + amountToUnblock,
                blocked_balance: (prevBidder.blocked_balance || 0) - amountToUnblock
            });
        }
    }

    // Block new bidder's funds
    batch.update(bidderDocRef, {
        wallet_balance: (bidder.wallet_balance || 0) - amount,
        blocked_balance: (bidder.blocked_balance || 0) + amount,
    });

    // Update sim card auction details
    const newBid: Bid = { user_id: bidderId, amount: amount, date: new Date().toISOString() };
    const updatedBids = [...simData.auction_details.bids, newBid];
    const updatedAuctionDetails = {
        ...simData.auction_details,
        current_bid: amount,
        highest_bidder_id: bidderId,
        bids: updatedBids,
    };
    batch.update(simDocRef, { auction_details: updatedAuctionDetails });

    await batch.commit();
};

// Modify updateSimCard to work with numeric IDs
export const updateSimCard = async (simId: number, updatedData: Partial<SimCard>): Promise<void> => {
    // First, find the document with the matching numeric ID
    const simCardsCol = collection(db, 'sim_cards');
    const q = query(simCardsCol);
    const querySnapshot = await getDocs(q);
    
    let simDocRef: any = null;
    
    for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const numericId = data.id || parseInt(doc.id);
        if (numericId === simId) {
            simDocRef = doc.ref;
            break;
        }
    }
    
    if (!simDocRef) {
        throw new Error('SIM card not found.');
    }

    await updateDoc(simDocRef, updatedData);
};

// --- Package Management ---

export const getPackages = async (): Promise<Package[]> => {
    const packagesCol = collection(db, 'packages');
    const packageSnapshot = await getDocs(packagesCol);
    return packageSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: data.id || parseInt(doc.id) // Use document ID if id field doesn't exist
        } as Package;
    });
};

export const addPackage = async (packageData: Omit<Package, 'id'>): Promise<string> => {
    const packagesCol = collection(db, 'packages');
    const cleanedData = removeUndefinedProps(packageData);
    const docRef = await addDoc(packagesCol, cleanedData);
    return docRef.id;
};

export const updatePackage = async (packageId: string, updatedData: Partial<Package>): Promise<void> => {
    const packageDocRef = doc(db, 'packages', packageId);
    await updateDoc(packageDocRef, updatedData);
};

// --- Transaction & Financials ---

export const getTransactions = async (): Promise<Transaction[]> => {
    const transactionsCol = collection(db, 'transactions');
    const transactionSnapshot = await getDocs(transactionsCol);
    return transactionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: data.id || parseInt(doc.id) // Use document ID if id field doesn't exist
        } as Transaction;
    });
};

export const processTransaction = async (userId: string, amount: number, type: Transaction['type'], description: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        throw new Error(`User with ID ${userId} not found for transaction.`);
    }

    const userData = userDoc.data();
    const currentBalance = userData.wallet_balance || 0;
    if (amount < 0 && currentBalance < Math.abs(amount)) {
        throw new Error('موجودی کیف پول کافی نیست.');
    }

    const newBalance = currentBalance + amount;
    
    const transactionCol = collection(db, 'transactions');
    const newTransactionRef = doc(transactionCol);

    const batch = writeBatch(db);
    batch.update(userDocRef, { wallet_balance: newBalance });
    batch.set(newTransactionRef, {
        user_id: userId,
        type,
        amount,
        description,
        date: new Date().toISOString()
    });

    await batch.commit();
};

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
    seedDatabase,
};

export default api;
