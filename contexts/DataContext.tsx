import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, SimCard, Package, Transaction } from '../types';
import api from '../services/api-supabase';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from './NotificationContext';

interface DataContextType {
  users: User[];
  simCards: SimCard[];
  packages: Package[];
  transactions: Transaction[];
  loading: boolean;
  addSimCard: (simData: Omit<SimCard, 'id' | 'seller_id' | 'status'>) => Promise<void>;
  purchaseSim: (simId: number, buyerId: string) => Promise<void>;
  placeBid: (simId: number, bidderId: string, amount: number) => Promise<void>;
  processTransaction: (userId: string, amount: number, type: Transaction['type'], description: string) => Promise<void>;
  updateUserPackage: (userId: string, packageId: number) => Promise<void>;
  updateUser: (userId: string, updatedData: Partial<User>) => Promise<void>;
  updateSimCard: (simId: number, updatedData: Partial<SimCard>) => Promise<void>;
  addPackage: (packageData: Omit<Package, 'id'>) => Promise<void>;
  updatePackage: (packageId: number, updatedData: Partial<Package>) => Promise<void>;
  fetchData: () => Promise<void>;
}

export const DataContext = createContext<DataContextType>({
    users: [],
    simCards: [],
    packages: [],
    transactions: [],
    loading: true,
    addSimCard: async () => {},
    purchaseSim: async () => {},
    placeBid: async () => {},
    processTransaction: async () => {},
    updateUserPackage: async () => {},
    updateUser: async () => {},
    updateSimCard: async () => {},
    addPackage: async () => {},
    updatePackage: async () => {},
    fetchData: async () => {},
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const { showNotification } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    // We don't set loading to true here to avoid UI flickering on refetches
    try {
      const [usersData, simCardsData, packagesData, transactionsData] = await Promise.all([
        api.getUsers(),
        api.getSimCards(),
        api.getPackages(),
        api.getTransactions(),
      ]);
      setUsers(usersData);
      setSimCards(simCardsData);
      setPackages(packagesData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showNotification('خطا در بارگذاری اطلاعات.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addSimCard = async (simData: Omit<SimCard, 'id' | 'seller_id' | 'status'>) => {
    if (!user) {
        throw new Error('برای ثبت سیمکارت باید وارد شوید.');
    }
    
    // Validate phone number format (exactly 11 digits)
    if (!simData.number || simData.number.length !== 11 || !/^[0-9]+$/.test(simData.number)) {
        throw new Error('شماره سیمکارت باید دقیقاً 11 رقم باشد.');
    }
    
    // Check if SIM card number already exists
    const existingSim = simCards.find(s => s.number === simData.number);
    if (existingSim) {
        throw new Error('این شماره سیمکارت قبلاً ثبت شده است.');
    }
    
    // Check if user has a valid package
    if (!user.package_id) {
        throw new Error('برای ثبت سیمکارت باید یک پکیج خریداری کنید.');
    }
    
    // Check if the package is still valid (not expired)
    const userPackage = packages.find(p => p.id === user.package_id);
    if (!userPackage) {
        throw new Error('پکیج شما معتبر نیست. لطفاً یک پکیج جدید خریداری کنید.');
    }
    
    // Check if user has reached the listing limit
    const userSimCards = simCards.filter(s => s.seller_id === user.id && s.status === 'available');
    if (userSimCards.length >= userPackage.listing_limit) {
        throw new Error(`شما به حداکثر تعداد آگهی مجاز (${userPackage.listing_limit}) رسیده اید. برای ثبت آگهی بیشتر، پکیج خود را ارتقاء دهید.`);
    }
    
    // Add seller_id and status to the simData
    const completeSimData = {
      ...simData,
      seller_id: user.id,
      status: 'available' as const
    };
    
    await api.addSimCard(completeSimData);
    await fetchData();
    await refreshUser(); // Refresh user data in AuthContext to reflect balance changes
  };
  
  const processTransaction = async (userId: string, amount: number, type: Transaction['type'], description: string) => {
    await api.processTransaction(userId, amount, type, description);
    await fetchData();
    // Refresh user in auth context separately to ensure header/etc. are updated immediately
    await refreshUser();
  };
  
  const updateUserPackage = async (userId: string, packageId: number) => {
    await api.updateUserPackage(userId, packageId);
    await fetchData();
    await refreshUser();
  };
  
   const purchaseSim = async (simId: number, buyerId: string) => {
    await api.purchaseSim(simId, buyerId);
    await fetchData();
    await refreshUser();
  };

  const placeBid = async (simId: number, bidderId: string, amount: number) => {
    await api.placeBid(simId, bidderId, amount);
    await fetchData();
    await refreshUser();
  };

  const updateUser = async (userId: string, updatedData: Partial<User>) => {
    await api.updateUser(userId, updatedData);
    await fetchData();
  }

  const updateSimCard = async (simId: number, updatedData: Partial<SimCard>) => {
    await api.updateSimCard(simId, updatedData);
    await fetchData();
  }

  const addPackage = async (packageData: Omit<Package, 'id'>) => {
    await api.addPackage(packageData);
    await fetchData();
  };

  const updatePackage = async (packageId: number, updatedData: Partial<Package>) => {
    await api.updatePackage(packageId, updatedData);
    await fetchData();
  };

  const value = {
    users,
    simCards,
    packages,
    transactions,
    loading,
    addSimCard,
    purchaseSim,
    placeBid,
    processTransaction,
    updateUserPackage,
    updateUser,
    updateSimCard,
    addPackage,
    updatePackage,
    fetchData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};