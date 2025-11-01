import React, { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { AuctionParticipant, SimCard } from '../types';

const AdminAuctionParticipantsPanel: React.FC<{ auctionId: number }> = ({ auctionId }) => {
  const [participants, setParticipants] = useState<(AuctionParticipant & { userName?: string })[]>([]);
  const [simCard, setSimCard] = useState<SimCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        setLoading(true);
        console.log('🔍 AdminAuctionParticipantsPanel: Loading participants for auctionId:', auctionId);
        
        // Get auction details
        const { data: auctionData, error: auctionError } = await supabase
          .from('auction_details')
          .select('*')
          .eq('id', auctionId)
          .single();

        console.log('📋 Auction data:', auctionData, 'Error:', auctionError);

        if (auctionError) {
          console.error('❌ Error fetching auction:', auctionError);
          setError('حراجی یافت نشد');
          setLoading(false);
          return;
        }

        // Get SIM card info
        const { data: sim, error: simError } = await supabase
          .from('sim_cards')
          .select('*')
          .eq('id', auctionData.sim_card_id)
          .single();

        if (!simError && sim) {
          setSimCard(sim as SimCard);
        }

        // Get all participants sorted by rank (highest bid first)
        const { data: participantsData, error: participantsError } = await supabase
          .from('auction_participants')
          .select('*')
          .eq('auction_id', auctionId)
          .order('highest_bid', { ascending: false });

        console.log('👥 Participants data:', participantsData, 'Error:', participantsError);

        if (participantsError) {
          console.error('❌ Error fetching participants:', participantsError);
          setError('خطا در دریافت شرکت‌کنندگان');
          setParticipants([]);
          setLoading(false);
          return;
        }

        // Get user names for each participant
        if (participantsData && participantsData.length > 0) {
          console.log('🔍 Found participants:', participantsData.length);
          const enrichedParticipants = await Promise.all(
            participantsData.map(async (p) => {
              const { data: userData } = await supabase
                .from('users')
                .select('name')
                .eq('id', p.user_id)
                .single();
              
              return {
                ...p,
                userName: userData?.name || 'نام‌شخص'
              };
            })
          );

          // Update ranks
          const rankedParticipants = enrichedParticipants.map((p, index) => ({
            ...p,
            rank: index + 1,
            is_top_3: index < 3
          }));

          console.log('🎉 Setting ranked participants:', rankedParticipants.length);
          setParticipants(rankedParticipants);
        } else {
          console.log('⚠️ No participants found for auction:', auctionId);
          setParticipants([]);
        }
      } catch (err) {
        console.error('Error loading auction participants:', err);
        setError('خطا در بارگذاری داده‌ها');
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();
  }, [auctionId]);

  if (loading) {
    console.log('⏳ AdminAuctionParticipantsPanel: Still loading...');
    return <div className="text-center py-4">در حال بارگذاری...</div>;
  }

  if (error) {
    console.log('❌ AdminAuctionParticipantsPanel: Error state:', error);
    return <div className="text-center py-4 text-red-600">{error}</div>;
  }

  console.log('🎨 AdminAuctionParticipantsPanel: Rendering with participants:', participants.length);

  if (participants.length === 0) {
    console.log('⚠️ AdminAuctionParticipantsPanel: No participants to display');
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          🏆 شرکت‌کنندگان حراجی {simCard?.number}
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>هیچ شرکت‌کننده‌ای در این حراجی ثبت نام نکرده است</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        🏆 شرکت‌کنندگان حراجی {simCard?.number}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">رتبه</th>
              <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">نام کاربر</th>
              <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">بالاترین پیشنهاد</th>
              <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">تعداد پیشنهاد</th>
              <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">حق ضمانت</th>
              <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr 
                key={participant.id}
                className={`border-b dark:border-gray-600 ${
                  participant.is_top_3 
                    ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <td className="px-4 py-3">
                  <span className="font-bold text-lg">
                    {participant.is_top_3 && '🏆 '}
                    {participant.rank}
                  </span>
                </td>
                <td className="px-4 py-3">{participant.userName}</td>
                <td className="px-4 py-3 font-bold">
                  {participant.highest_bid.toLocaleString('fa-IR')} تومان
                </td>
                <td className="px-4 py-3 text-center">{participant.bid_count}</td>
                <td className="px-4 py-3">
                  {participant.guarantee_deposit_blocked && participant.guarantee_deposit_amount > 0 ? (
                    <span className="text-orange-600 dark:text-orange-400">
                      {participant.guarantee_deposit_amount.toLocaleString('fa-IR')} ⛓️
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {participant.is_top_3 ? (
                    <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                      ✅ برنده احتمالی
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm">
                      شامل نشد
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">📊 توضیحات:</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• شرکت‌کنندگان بر اساس بالاترین پیشنهاد مرتب شده‌اند</li>
          <li>• 🏆 برنده‌های احتمالی (3 نفر اول) حق ضمانت خود را نگه‌دارند</li>
          <li>• دیگر شرکت‌کنندگان حق ضمانت‌شان برگشت می‌خورد</li>
          <li>• ⛓️ نشان می‌دهد که حق ضمانت مسدود است</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminAuctionParticipantsPanel;
