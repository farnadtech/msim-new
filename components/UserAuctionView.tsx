import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { SimCard } from '../types';

interface AuctionBidInfo {
  currentBid: number;
  highestBidderName: string;
  timeRemaining: string;
}

const UserAuctionView: React.FC<{ sim: SimCard }> = ({ sim }) => {
  const [bidInfo, setBidInfo] = useState<AuctionBidInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBidInfo = async () => {
      if (!sim.auction_details) {
        setLoading(false);
        return;
      }

      try {
        // Get highest bidder name for display
        let highestBidderName = 'نامشخص';
        if (sim.auction_details.highest_bidder_id) {
          const { data: bidderData } = await supabase
            .from('users')
            .select('name')
            .eq('id', sim.auction_details.highest_bidder_id)
            .single();

          highestBidderName = bidderData?.name || 'نامشخص';
        }

        // Calculate time remaining
        const endTime = new Date(sim.auction_details.end_time);
        const now = new Date();
        const timeRemaining = endTime > now 
          ? `${Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60))} دقیقه`
          : 'به پایان رسیده';

        setBidInfo({
          currentBid: sim.auction_details.current_bid,
          highestBidderName,
          timeRemaining
        });
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadBidInfo();

    // Refresh bid info every 30 seconds
    const interval = setInterval(loadBidInfo, 30000);
    return () => clearInterval(interval);
  }, [sim]);

  if (!sim.auction_details || loading) {
    return null;
  }

  return (
    <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">بالاترین پیشنهاد فعلی</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {bidInfo?.currentBid.toLocaleString('fa-IR')} تومان
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">پیشنهاد‌دهنده</p>
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            {bidInfo?.highestBidderName}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">زمان باقی‌مانده</p>
          <p className={`font-semibold ${bidInfo?.timeRemaining === 'به پایان رسیده' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {bidInfo?.timeRemaining}
          </p>
        </div>
      </div>

      <div className="mt-4 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          ℹ️ برای حفاظت از حریم خصوصی، تنها بالاترین پیشنهاد و نام بیدار‌کننده نمایش داده می‌شود. لیست کامل شرکت‌کنندگان برای مدیران سایت قابل دسترس است.
        </p>
      </div>
    </div>
  );
};

export default UserAuctionView;
