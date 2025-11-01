import { useEffect } from 'react';
import api from '../services/api-supabase';
import { supabase } from '../services/supabase';

/**
 * Hook to automatically process auctions that have ended
 * Checks every 60 seconds and processes any auctions past their end_time
 * This handles: ranking bidders, releasing non-top-3 deposits, creating payment queue
 */
const useAuctionAutoProcessor = () => {
  useEffect(() => {
    const processEndedAuctions = async () => {
      try {
        // Get all active auctions that have passed their end time
        const { data: endedAuctions, error } = await supabase
          .from('auction_details')
          .select('id')
          .eq('status', 'active')
          .lt('end_time', new Date().toISOString());

        if (error) {
          console.error('Error fetching ended auctions:', error);
          return;
        }

        if (endedAuctions && endedAuctions.length > 0) {
          console.log(`🔔 Found ${endedAuctions.length} ended auction(s) to process`);
          
          for (const auction of endedAuctions) {
            try {
              // Process each ended auction
              await api.processAuctionEnding(auction.id);
              console.log(`✅ Processed auction ${auction.id}`);
            } catch (processingError) {
              console.error(`❌ Error processing auction ${auction.id}:`, processingError);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in auction auto-processor:', error);
      }
    };

    // Run immediately on mount
    processEndedAuctions();

    // Run every 60 seconds
    const interval = setInterval(processEndedAuctions, 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};

export default useAuctionAutoProcessor;
