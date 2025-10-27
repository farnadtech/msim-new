

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import SimCard from '../components/SimCard';
import { SimCard as SimCardType } from '../types';

const carrierSlugMap: { [key: string]: 'همراه اول' | 'ایرانسل' | 'رایتل' } = {
  'hamrah-aval': 'همراه اول',
  'irancell': 'ایرانسل',
  'raytel': 'رایتل',
};

const CarrierSimsPage: React.FC = () => {
  const { carrierName } = useParams<{ carrierName: string }>();
  const { simCards, loading } = useData();

  const carrier = carrierName ? carrierSlugMap[carrierName] : undefined;

  const isRecentlySold = (sim: SimCardType) => {
    return sim.status === 'sold' && sim.sold_date && new Date(sim.sold_date).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  };

  const carrierSims = useMemo(() => {
    if (!carrier) return [];
    return simCards.filter(s => s.carrier === carrier && (s.status === 'available' || isRecentlySold(s)));
  }, [simCards, carrier]);

  if (!carrier) {
      return (
          <div className="container mx-auto px-6 py-12 text-center">
            <h1 className="text-2xl font-bold">اپراتور نامعتبر است.</h1>
          </div>
      )
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100">سیمکارت های {carrier}</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">لیست کامل سیمکارت های موجود برای اپراتور {carrier}</p>
      </div>
      
      {loading ? (
        <div className="text-center">در حال بارگذاری...</div>
      ) : carrierSims.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {carrierSims.map(sim => <SimCard key={sim.id} sim={sim} />)}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-lg text-gray-600 dark:text-gray-400">در حال حاضر سیمکارتی برای اپراتور {carrier} یافت نشد.</p>
        </div>
      )}
    </div>
  );
};

export default CarrierSimsPage;