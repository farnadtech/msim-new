import { useEffect } from 'react';
import api from '../services/api-supabase';

/**
 * Custom hook to automatically delete expired listings (older than 1 month)
 * Runs on component mount and checks for expired listings
 * 
 * This runs on each page load/refresh to clean up old listings automatically
 */
export const useAutoCleanup = () => {
    useEffect(() => {
        const performCleanup = async () => {
            try {
                const deletedCount = await api.deleteExpiredListings();
                if (deletedCount > 0) {
                    console.log(`✓ ${deletedCount} اعلام منقضی شده حذف شد`);
                }
            } catch (error) {
                console.error('خطا در تمیز کردن اعلامات:', error);
            }
        };

        // Run cleanup on component mount
        performCleanup();
    }, []);
};
