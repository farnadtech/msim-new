import React, { useMemo } from 'react';
import { useData } from '../hooks/useData';
import SimCard from './SimCard';
import { SimCard as SimCardType } from '../types';

interface RecentlySoldSimsProps {
  title?: string;
  limit?: number;
}

const RecentlySoldSims: React.FC<RecentlySoldSimsProps> = ({ 
  title = 'آخرین سیمکارت های فروخته شده', 
  limit = 8 
}) => {
  const { simCards, loading } = useData();

  const isRecentlySold = (sim: SimCardType) => {
    return sim.status === 'sold' && sim.sold_date && new Date(sim.sold_date).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  };

  const recentlySoldSims = useMemo(() => {
    return [...simCards]
      .filter(isRecentlySold)
      .sort((a, b) => {
        // Sort by sold date, newest first
        const dateA = a.sold_date ? new Date(a.sold_date).getTime() : 0;
        const dateB = b.sold_date ? new Date(b.sold_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }, [simCards, limit]);

  if (recentlySoldSims.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">{title}</h2>
      
      {loading ? (
        <div className="text-center py-6">در حال بارگذاری...</div>
      ) : recentlySoldSims.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentlySoldSims.map(sim => (
            <SimCard key={sim.id} sim={sim} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <p className="text-gray-500 dark:text-gray-400">در حال حاضر سیمکارت فروخته شده ای وجود ندارد.</p>
        </div>
      )}
    </section>
  );
};

export default RecentlySoldSims;