import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api-supabase';

interface Carrier {
    id: number;
    name: string;
    name_fa: string;
    is_active: boolean;
    display_order: number;
}

interface CarriersContextType {
    carriers: Carrier[];
    loading: boolean;
    refreshCarriers: () => Promise<void>;
}

const CarriersContext = createContext<CarriersContextType | undefined>(undefined);

export const CarriersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCarriers = async () => {
        try {
            setLoading(true);
            const { data, error } = await api.supabase
                .from('carriers')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            
            if (error) throw error;
            setCarriers(data || []);
        } catch (error) {
            console.error('Error loading carriers:', error);
            // Fallback to default carriers
            setCarriers([
                { id: 1, name: 'mci', name_fa: 'همراه اول', is_active: true, display_order: 1 },
                { id: 2, name: 'irancell', name_fa: 'ایرانسل', is_active: true, display_order: 2 },
                { id: 3, name: 'rightel', name_fa: 'رایتل', is_active: true, display_order: 3 }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCarriers();
        
        // Refresh carriers every 30 seconds to catch updates
        const interval = setInterval(loadCarriers, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const refreshCarriers = async () => {
        await loadCarriers();
    };

    return (
        <CarriersContext.Provider value={{ carriers, loading, refreshCarriers }}>
            {children}
        </CarriersContext.Provider>
    );
};

export const useCarriers = () => {
    const context = useContext(CarriersContext);
    if (context === undefined) {
        throw new Error('useCarriers must be used within a CarriersProvider');
    }
    return context;
};
