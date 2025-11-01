import { useEffect } from 'react';
import api from '../services/api-supabase';

/**
 * Hook to check and process auction payment deadlines on every page load
 * This replaces the need for a cron job - instead checking happens on each page refresh
 */
const useAuctionPaymentChecker = () => {
  useEffect(() => {
    const checkPaymentDeadlines = async () => {
      try {
        console.log('🔍 Checking auction payment deadlines...');
        await api.checkAndProcessPaymentDeadlines();
      } catch (error) {
        console.error('❌ Error checking payment deadlines:', error);
      }
    };

    // Run immediately on component mount
    checkPaymentDeadlines();
  }, []);
};

export default useAuctionPaymentChecker;
