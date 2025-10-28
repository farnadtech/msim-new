import { useEffect } from 'react';
import api from '../services/api-supabase';

const useAuctionProcessor = () => {
  useEffect(() => {
    // Function to process ended auctions
    const processEndedAuctions = async () => {
      try {
        await api.processEndedAuctions();
      } catch (error) {
        console.error('Error processing ended auctions:', error);
      }
    };

    // Run immediately on component mount
    processEndedAuctions();

    // Run every 10 seconds while the component is mounted
    const interval = setInterval(processEndedAuctions, 10 * 1000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, []);
};

export default useAuctionProcessor;