import { useData } from '../hooks/useData';
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../hooks/useData';
import DashboardLayout from '../components/DashboardLayout';
import AdminAuctionParticipantsPanel from '../components/AdminAuctionParticipantsPanel';
import { SimCard } from '../types';
import { supabase } from '../services/supabase';

const AdminAuctionManagement: React.FC = () => {
    const { simCards, loading } = useData();
    const [selectedAuction, setSelectedAuction] = useState<SimCard | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
    const [auctionIds, setAuctionIds] = useState<Map<number, number>>(new Map());
    const [loadingAuctionIds, setLoadingAuctionIds] = useState(true);

    // Get all auction SIM cards - use useMemo to prevent recalculation
    const auctionSims = useMemo(() => 
        simCards.filter(sim => sim.type === 'auction'),
        [simCards]
    );

    // Fetch auction_details IDs - only when auctionSims changes
    useEffect(() => {
        const fetchAuctionIds = async () => {
            console.log('🔄 Fetching auction IDs for', auctionSims.length, 'auction SIMs');
            setLoadingAuctionIds(true);
            const idMap = new Map<number, number>();
            
            if (auctionSims.length > 0) {
                // Get all unique sim card IDs
                const auctionSimIds = [...new Set(auctionSims.map(sim => sim.id))];
                console.log('🔍 Auction SIM IDs to fetch:', auctionSimIds);
                
                const { data: auctionDetails, error: auctionError } = await supabase
                    .from('auction_details')
                    .select('id, sim_card_id')
                    .in('sim_card_id', auctionSimIds);
                
                if (!auctionError && auctionDetails) {
                    auctionDetails.forEach(detail => {
                        idMap.set(detail.sim_card_id, detail.id);
                        console.log(`✅ Mapped SIM ${detail.sim_card_id} to Auction ${detail.id}`);
                    });
                    console.log('✅ Successfully fetched', auctionDetails.length, 'auction IDs');
                } else if (auctionError) {
                    console.error('❌ Error fetching auction IDs:', auctionError);
                }
            }
            
            setAuctionIds(idMap);
            setLoadingAuctionIds(false);
            console.log('📊 Final Auction IDs map:', Array.from(idMap.entries()));
        };
        
        if (!loading && auctionSims.length > 0) {
            fetchAuctionIds();
        } else if (!loading && auctionSims.length === 0) {
            setLoadingAuctionIds(false);
        }
    }, [auctionSims.length, loading]); // Use auctionSims.length to avoid infinite loops

    // Filter based on status
    const filteredAuctions = auctionSims.filter(sim => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') {
            return sim.auction_details && new Date(sim.auction_details.end_time) > new Date();
        }
        if (filterStatus === 'ended') {
            return sim.auction_details && new Date(sim.auction_details.end_time) <= new Date();
        }
        return true;
    });



    if (loading || loadingAuctionIds) {
        return <div className="text-center py-20">در حال بارگذاری...</div>;
    }

    return (
        <DashboardLayout sidebar={
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-bold text-lg mb-4">🏆 مدیریت حراجی</h3>
                <nav className="space-y-2">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`w-full text-left px-4 py-2 rounded-md ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        تمامی حراجی‌ها
                    </button>
                    <button
                        onClick={() => setFilterStatus('active')}
                        className={`w-full text-left px-4 py-2 rounded-md ${filterStatus === 'active' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        حراجی‌های فعال
                    </button>
                    <button
                        onClick={() => setFilterStatus('ended')}
                        className={`w-full text-left px-4 py-2 rounded-md ${filterStatus === 'ended' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        حراجی‌های پایان یافته
                    </button>
                </nav>
            </div>
        }>
            <div className="space-y-6">
                {/* Auction List */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4">🏆 لیست حراجی‌ها</h2>
                    {filteredAuctions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredAuctions.map(sim => {
                                const isAuctionEnded = sim.auction_details && new Date(sim.auction_details.end_time) < new Date();
                                const participantCount = sim.auction_details?.bids?.length || 0;
                                const auctionId = auctionIds.get(sim.id);
                                
                                return (
                                    <div
                                        key={sim.id}
                                        onClick={() => {
                                            console.log('🎯 Selected auction:', sim.id, 'Auction ID:', auctionId);
                                            setSelectedAuction(sim);
                                        }}
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                            selectedAuction?.id === sim.id
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-bold text-lg" style={{ direction: 'ltr' }}>
                                                    {sim.number}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {sim.carrier} | {sim.is_active ? '✅ فعال' : '❌ صفر'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-3 py-1 text-sm rounded-full ${
                                                    isAuctionEnded
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
                                                    {isAuctionEnded ? 'پایان یافته' : 'فعال'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">بالاترین پیشنهاد</p>
                                                <p className="font-bold">{(sim.auction_details?.current_bid || 0).toLocaleString('fa-IR')} تومان</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">شرکت‌کنندگان</p>
                                                <p className="font-bold">{participantCount}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">زمان پایان</p>
                                                <p className="font-bold text-xs" dir="ltr">
                                                    {sim.auction_details ? new Date(sim.auction_details.end_time).toLocaleDateString('fa-IR') : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">هیچ حراجی با این فیلتر یافت نشد.</p>
                    )}
                </div>

                {/* Selected Auction Details */}
                {selectedAuction && auctionIds.get(selectedAuction.id) && (
                    <div key={`auction-panel-${selectedAuction.id}`}>
                        <AdminAuctionParticipantsPanel auctionId={auctionIds.get(selectedAuction.id)!} />
                    </div>
                )}
                
                {selectedAuction && !auctionIds.get(selectedAuction.id) && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <p className="text-center text-gray-500">در حال بارگذاری اطلاعات حراجی...</p>
                        <div className="text-center mt-2 text-sm text-gray-400">
                            <p>شناسه سیمکارت: {selectedAuction.id}</p>
                            <p>شناسه‌های موجود: {Array.from(auctionIds.keys()).join(', ') || 'هیچکدام'}</p>
                            <p>جزئیات حراجی موجود: {selectedAuction.auction_details ? 'بله' : 'خیر'}</p>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminAuctionManagement;