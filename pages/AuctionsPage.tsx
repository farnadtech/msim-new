import React from 'react';
import { useData } from '../hooks/useData';
import SimCard from '../components/SimCard';
import { SimCard as SimCardType } from '../types';

const AuctionsPage: React.FC = () => {
  const { simCards, loading } = useData();
  
  const isRecentlySold = (sim: SimCardType) => {
    return sim.status === 'sold' && sim.sold_date && new Date(sim.sold_date).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  };

  const auctionSims = simCards.filter(s => s.type === 'auction' && (s.status === 'available' || isRecentlySold(s)));

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50">
        <div className="container mx-auto px-6 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100">داغ ترین حراجی ها</h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">شانس خود را برای خرید شماره های استثنایی با بهترین قیمت امتحان کنید</p>
            </div>
            
            {loading ? (
                <div className="text-center">در حال بارگذاری...</div>
            ) : auctionSims.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {auctionSims.map(sim => <SimCard key={sim.id} sim={sim} />)}
                </div>
            ) : (
                <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <p className="text-lg text-gray-600 dark:text-gray-400">در حال حاضر هیچ حراجی فعالی وجود ندارد.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default AuctionsPage;