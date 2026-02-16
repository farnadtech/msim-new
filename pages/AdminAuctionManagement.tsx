import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../hooks/useData';
import DashboardLayout from '../components/DashboardLayout';
import AdminAuctionParticipantsPanel from '../components/AdminAuctionParticipantsPanel';
import { SimCard } from '../types';
import { supabase } from '../services/supabase';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api-supabase';

const AdminAuctionManagement: React.FC = () => {
    const { simCards, loading, removeSimCard } = useData();
    const { showNotification } = useNotification();
    const [selectedAuction, setSelectedAuction] = useState<SimCard | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
    const [auctionIds, setAuctionIds] = useState<Map<number, number>>(new Map());
    const [loadingAuctionIds, setLoadingAuctionIds] = useState(true);
    const [deleting, setDeleting] = useState<number | null>(null);

    // Get all auction SIM cards - use useMemo to prevent recalculation
    const auctionSims = useMemo(() => 
        simCards.filter(sim => sim.type === 'auction'),
        [simCards]
    );

    // Fetch auction_details IDs - only when auctionSims changes
    useEffect(() => {
        const fetchAuctionIds = async () => {
            setLoadingAuctionIds(true);
            const idMap = new Map<number, number>();
            
            if (auctionSims.length > 0) {
                // Get all unique sim card IDs
                const auctionSimIds = [...new Set(auctionSims.map(sim => sim.id))];
                const { data: auctionDetails, error: auctionError } = await supabase
                    .from('auction_details')
                    .select('id, sim_card_id')
                    .in('sim_card_id', auctionSimIds);
                
                if (!auctionError && auctionDetails) {
                    auctionDetails.forEach(detail => {
                        idMap.set(detail.sim_card_id, detail.id);
                    });
                } else if (auctionError) {
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

    const handleDeleteAuction = async (sim: SimCard, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the auction
        
        if (!window.confirm(`آیا مطمئن هستید که می‌خواهید حراجی ${sim.number} را به طور کامل حذف کنید؟\n\nتوجه: این عمل غیرقابل بازگشت است و تمام پیشنهادات و اطلاعات مرتبط نیز حذف خواهند شد.`)) {
            return;
        }

        try {
            setDeleting(sim.id);
            await api.deleteSimCard(sim.id, true); // true = isAdmin
            removeSimCard(sim.id);
            
            if (selectedAuction?.id === sim.id) {
                setSelectedAuction(null);
            }
            
            showNotification('حراجی با موفقیت حذف شد', 'success');
        } catch (error: any) {
            showNotification(error.message || 'خطا در حذف حراجی', 'error');
        } finally {
            setDeleting(null);
        }
    };

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
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 text-sm rounded-full ${
                                                    isAuctionEnded
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
                                                    {isAuctionEnded ? 'پایان یافته' : 'فعال'}
                                                </span>
                                                <button
                                                    onClick={(e) => handleDeleteAuction(sim, e)}
                                                    disabled={deleting === sim.id}
                                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm disabled:bg-gray-400 transition-colors"
                                                    title="حذف حراجی"
                                                >
                                                    {deleting === sim.id ? '⏳' : '🗑️'}
                                                </button>
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

                {/* Selected Auction Details - Modal */}
                {selectedAuction && auctionIds.get(selectedAuction.id) && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex justify-between items-center">
                                <h3 className="text-xl font-bold">🏆 شرکت‌کنندگان حراجی {selectedAuction.number}</h3>
                                <button
                                    onClick={() => setSelectedAuction(null)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6">
                                <AdminAuctionParticipantsPanel auctionId={auctionIds.get(selectedAuction.id)!} />
                            </div>
                        </div>
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