import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';
import { KYCVerification } from '../types';
import * as settingsService from '../services/settings-service';

export const useKYCStatus = () => {
    const { user } = useAuth();
    const [kycStatus, setKycStatus] = useState<KYCVerification | null>(null);
    const [loading, setLoading] = useState(true);
    const [kycRequired, setKycRequired] = useState(false);
    const [kycRequiredForRole, setKycRequiredForRole] = useState(false);

    useEffect(() => {
        loadKYCStatus();
    }, [user]);

    const loadKYCStatus = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Check if KYC is required from settings
            const kycRequiredSetting = await settingsService.getSetting('kyc_required');
            const kycRequiredValue = kycRequiredSetting === 'true';
            setKycRequired(kycRequiredValue);

            // Check if KYC is required for this user's role
            let roleKycRequired = false;
            if (user.role === 'seller') {
                const sellerKycSetting = await settingsService.getSetting('kyc_required_for_sellers');
                roleKycRequired = sellerKycSetting === 'true';
            } else if (user.role === 'buyer') {
                const buyerKycSetting = await settingsService.getSetting('kyc_required_for_buyers');
                roleKycRequired = buyerKycSetting === 'true';
            }
            setKycRequiredForRole(roleKycRequired);

            // Load KYC verification status
            const { data, error } = await supabase
                .from('kyc_verifications')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error loading KYC status:', error);
            }

            setKycStatus(data);
        } catch (error) {
            console.error('Error in loadKYCStatus:', error);
        } finally {
            setLoading(false);
        }
    };

    const isVerified = user?.is_verified === true || kycStatus?.status === 'approved';
    const isPending = kycStatus?.status === 'pending';
    const isRejected = kycStatus?.status === 'rejected';
    const needsKYC = (kycRequired && kycRequiredForRole) && !isVerified && !isPending;

    return {
        kycStatus,
        loading,
        isVerified,
        isPending,
        isRejected,
        needsKYC,
        kycRequired: kycRequired && kycRequiredForRole,
        refresh: loadKYCStatus
    };
};
