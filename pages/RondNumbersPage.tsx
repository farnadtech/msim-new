import React from 'react';
import { useData } from '../hooks/useData';
import SimCard from '../components/SimCard';
import { SimCard as SimCardType } from '../types';

const RondNumbersPage: React.FC = () => {
  const { simCards, loading } = useData();
  
  const isRecentlySold = (sim: SimCardType) => {
    return sim.status === 'sold' && sim.sold_date && new Date(sim.sold_date).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  };

  const rondSims = simCards.filter(s => s.is_rond && (s.status === 'available' || isRecentlySold(s)));

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100">شماره های رند و خاص</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">مجموعه ای از بهترین و خاص ترین شماره ها برای افراد خاص</p>
      </div>
      
      {loading ? (
        <div className="text-center">در حال بارگذاری...</div>
      ) : rondSims.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {rondSims.map(sim => <SimCard key={sim.id} sim={sim} />)}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-lg text-gray-600 dark:text-gray-400">در حال حاضر شماره رند برای فروش موجود نیست.</p>
        </div>
      )}
    </div>
  );
};

export default RondNumbersPage;