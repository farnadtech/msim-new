import React, { useState, useEffect } from 'react';
// FIX: Replaced v5 `useHistory` with v6 `useNavigate` to resolve module export error.
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { SimCard as SimCardType, User } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import LineDeliveryMethodModal from '../components/LineDeliveryMethodModal';
import api from '../services/api-supabase';
import { supabase } from '../services/supabase';
import * as settingsService from '../services/settings-service';

const CountdownTimer: React.FC<{ endTime: string }> = ({ endTime }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(endTime) - +new Date();
        let timeLeft: { [key: string]: number } = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };
    
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    if (Object.keys(timeLeft).length === 0) {
        return <span className="text-xl font-bold text-red-600">پایان یافته</span>;
    }
    
    return (
        <div className="flex space-x-4 space-x-reverse justify-center text-center">
            <div><span className="text-2xl font-bold">{timeLeft.days}</span><span className="block text-sm">روز</span></div>
            <div><span className="text-2xl font-bold">{timeLeft.hours}</span><span className="block text-sm">ساعت</span></div>
            <div><span className="text-2xl font-bold">{timeLeft.minutes}</span><span className="block text-sm">دقیقه</span></div>
            <div><span className="text-2xl font-bold">{timeLeft.seconds}</span><span className="block text-sm">ثانیه</span></div>
        </div>
    );
}


const SimDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { simCards, users, purchaseSim, placeBid, loading } = useData();
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    
    const [sim, setSim] = useState<SimCardType | null>(null);
    const [seller, setSeller] = useState<User | null>(null);
    const [bidAmount, setBidAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showInquiryNumber, setShowInquiryNumber] = useState(false);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isPurchaseCompleted, setIsPurchaseCompleted] = useState(false);
    const [isDeliveryModalOpen, setDeliveryModalOpen] = useState(false);
    const [showAuctionPaymentModal, setShowAuctionPaymentModal] = useState(false);
    
    // Settings from database
    const [commissionRate, setCommissionRate] = useState(0.02);
    const [guaranteeRate, setGuaranteeRate] = useState(0.05);
    const [paymentDeadlineHours, setPaymentDeadlineHours] = useState(48);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [commission, guarantee, deadline] = await Promise.all([
                    settingsService.getCommissionRate(),
                    settingsService.getAuctionGuaranteeRate(),
                    settingsService.getAuctionPaymentDeadlineHours()
                ]);
                setCommissionRate(commission);
                setGuaranteeRate(guarantee);
                setPaymentDeadlineHours(deadline);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (!loading && id) {
            const numericId = parseInt(id, 10);
            if (isNaN(numericId)) {
                navigate('/');
                return;
            }
            const foundSim = simCards.find(s => s.id === numericId);
            if (foundSim) {
                setSim(foundSim);
                const foundSeller = users.find(u => u.id === foundSim.seller_id);
                setSeller(foundSeller || null);
            } else {
                navigate('/');
            }
        }
    }, [id, simCards, users, loading, navigate]);

    // Check auction status - only check if auction has ended and user is winner
    // Do NOT auto-complete - let user click the button
    useEffect(() => {
        const checkAuctionStatus = async () => {
            if (sim && sim.type === 'auction' && sim.auction_details && currentUser) {
                const isAuctionEnded = new Date(sim.auction_details.end_time) < new Date();
                const isCurrentUserWinner = currentUser.id === sim.auction_details.highest_bidder_id;
                
                if (isAuctionEnded && isCurrentUserWinner) {
                    // Check if purchase is already completed
                    try {
                        const isCompleted = await api.isAuctionPurchaseCompleted(sim.id, currentUser.id);
                        setIsPurchaseCompleted(isCompleted);
                    } catch (err) {
                        console.error('Error checking auction status:', err);
                    }
                }
            }
        };
        
        checkAuctionStatus();
    }, [sim?.id, currentUser?.id]);

    if (loading) {
        return <div className="text-center py-20">در حال بارگذاری...</div>;
    }
    
    if (!sim) {
        return <div className="text-center py-20">سیمکارت یافت نشد.</div>;
    }

    const handlePurchaseClick = () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        if (!sim) return;

        if (sim.type === 'fixed') {
            setConfirmModalOpen(true);
        } else if (sim.type === 'auction') {
            // This is for the auction winner to complete the purchase
            executeAuctionPurchase();
        }
    };
    
    const executeAuctionPurchase = async () => {
        if (!currentUser || !sim) {
            navigate('/login');
            return;
        }
        if (sim.seller_id === currentUser.id) {
            showNotification('شما نمی توانید سیمکارت خود را بخرید.', 'error');
            return;
        }
        // Show payment confirmation modal instead of auto-completing
        setShowAuctionPaymentModal(true);
    };

    const completeAuctionPayment = async () => {
        if (!currentUser || !sim) {
            navigate('/login');
            return;
        }
        setIsProcessing(true);
        try {
            // Complete the payment - this will:
            // 1. Release winner's guarantee deposit
            // 2. Block the bid amount
            // 3. Create purchase order
            await api.completeAuctionPurchaseForWinner(sim.id, currentUser.id);
            
            // Get auction ID for releasing other participants' deposits
            const { data: auctionData } = await supabase
                .from('auction_details')
                .select('id')
                .eq('sim_card_id', sim.id)
                .single();
            
            const auctionId = auctionData?.id;
            
            // Release guarantee deposits for non-winners
            if (auctionId) {
                console.log('🔓 Releasing guarantee deposits for non-winners in auction:', auctionId);
                
                // Get all participants except the winner
                const { data: allParticipants } = await supabase
                    .from('auction_participants')
                    .select('*')
                    .eq('auction_id', auctionId)
                    .neq('user_id', currentUser.id); // Exclude winner
                
                if (allParticipants && allParticipants.length > 0) {
                    console.log(`🔓 Found ${allParticipants.length} non-winners to refund`);
                    
                    for (const participant of allParticipants) {
                        if (participant.guarantee_deposit_amount > 0 && participant.guarantee_deposit_blocked) {
                            // Get current user balance
                            const { data: userData } = await supabase
                                .from('users')
                                .select('wallet_balance, blocked_balance')
                                .eq('id', participant.user_id)
                                .single();
                            
                            if (userData) {
                                const newBlockedBalance = Math.max(0, (userData.blocked_balance || 0) - participant.guarantee_deposit_amount);
                                
                                console.log(`✅ Releasing ${participant.guarantee_deposit_amount.toLocaleString('fa-IR')} for user ${participant.user_id}`);
                                
                                // Update user's blocked balance
                                await supabase
                                    .from('users')
                                    .update({
                                        blocked_balance: newBlockedBalance
                                    })
                                    .eq('id', participant.user_id);
                                
                                // Mark deposit as released
                                await supabase
                                    .from('guarantee_deposits')
                                    .update({
                                        status: 'released',
                                        reason: 'برنده خرید را تکمیل کرد - ضمانت آزاد شد',
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('user_id', participant.user_id)
                                    .eq('auction_id', auctionId)
                                    .eq('status', 'blocked');
                                
                                // Update participant record
                                await supabase
                                    .from('auction_participants')
                                    .update({
                                        guarantee_deposit_blocked: false,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', participant.id);
                                
                                // Create transaction record
                                await supabase
                                    .from('transactions')
                                    .insert({
                                        user_id: participant.user_id,
                                        type: 'credit_released',
                                        amount: participant.guarantee_deposit_amount,
                                        description: `آزادسازی ضمانت حراجی سیمکارت ${sim.number}`,
                                        date: new Date().toISOString()
                                    });
                            }
                        }
                    }
                    
                    console.log('✅ All non-winner deposits released successfully!');
                }
            }
            
            showNotification('خرید تکمیل شد! اطلاعات تحویل خط را دنبال کنید.', 'success');
            setIsPurchaseCompleted(true);
            setShowAuctionPaymentModal(false);
            
            // Check line type
            if (sim && !sim.is_active) {
                setDeliveryModalOpen(true);
            } else {
                setTimeout(() => navigate('/buyer'), 1500);
            }
        } catch (err) {
            console.error('❌ Error completing auction payment:', err);
            if (err instanceof Error) showNotification(err.message, 'error');
            else showNotification('خطایی در هنگام خرید رخ داد.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const executePurchase = async () => {
        setConfirmModalOpen(false); // Ensure modal is closed
        if (!currentUser || !sim) {
            navigate('/login');
            return;
        }
        if (sim.seller_id === currentUser.id) {
            showNotification('شما نمی توانید سیمکارت خود را بخرید.', 'error');
            return;
        }
        
        // Check if this is an inactive line (zero line) - show delivery method selection
        if (!sim.is_active) {
            setDeliveryModalOpen(true);
            return;
        }
        
        setIsProcessing(true);
        try {
            // We need to pass the document ID, not the numeric ID
            // For now, we'll use the numeric ID as a string, but this is the source of the bug
            await purchaseSim(sim.id, currentUser.id);
            showNotification('خرید با موفقیت انجام شد!', 'success');
            navigate('/buyer');
        } catch (err) {
            if (err instanceof Error) showNotification(err.message, 'error');
            else showNotification('خطایی در هنگام خرید رخ داد.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDeliveryMethodSelect = async (method: 'activation_code' | 'physical_card') => {
        if (!currentUser || !sim) return;
        
        setIsProcessing(true);
        try {
            // For auction SIM cards, we need to check if this is for an auction winner
            if (sim.type === 'auction') {
                // Check if user is the auction winner
                const isWinner = sim.auction_details?.highest_bidder_id === currentUser.id;
                const isAuctionEnded = sim.auction_details && new Date(sim.auction_details.end_time) < new Date();
                
                if (isWinner && isAuctionEnded) {
                    // This is an auction winner selecting delivery method
                    // We should NOT mark the SIM as sold yet, just create the purchase order
                    const lineType = sim.is_active ? 'active' : 'inactive';
                    
                    // Create purchase order without marking SIM as sold
                    const { data: purchaseOrder, error: orderError } = await supabase
                        .from('purchase_orders')
                        .insert({
                            sim_card_id: sim.id,
                            buyer_id: currentUser.id,
                            seller_id: sim.seller_id,
                            line_type: lineType,
                            status: 'pending',
                            price: sim.auction_details?.current_bid || 0,
                            commission_amount: (sim.auction_details?.current_bid || 0) * commissionRate,
                            seller_received_amount: (sim.auction_details?.current_bid || 0) * (1 - commissionRate),
                            buyer_blocked_amount: sim.auction_details?.current_bid || 0,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select()
                        .single();
                    
                    if (orderError) {
                        throw new Error('خطا در ایجاد سفارش خرید: ' + orderError.message);
                    }
                    
                    // For zero-line SIMs, create activation request
                    if (!sim.is_active) {
                        await api.createActivationRequest(
                            purchaseOrder.id,
                            sim.id,
                            currentUser.id,
                            sim.seller_id,
                            sim.number,
                            currentUser.name,
                            seller?.name || 'ناشناس'
                        );
                        
                        if (method === 'activation_code') {
                            showNotification(
                                'خریدتان ثبت شد. لطفاً برای دریافت کد فعالسازی منتظر بمانید.',
                                'success'
                            );
                        } else {
                            showNotification(
                                'خریدتان ثبت شد. فروشنده باید مدارک را ارسال کند.',
                                'success'
                            );
                        }
                    }
                    
                    setDeliveryModalOpen(false);
                    // Navigate to buyer dashboard to track the purchase
                    navigate('/buyer');
                    return;
                }
            }
            
            // For non-auction SIM cards, use the existing logic
            // Check if this is an inactive line (zero line) - show delivery method selection
            if (!sim.is_active) {
                // Create activation request for zero-line SIMs
                const lineType = sim.is_active ? 'active' : 'inactive';
                
                // Execute the purchase which will create a purchase order
                await purchaseSim(sim.id, currentUser.id);
                
                // Get the purchase order we just created
                const purchaseOrders = await api.getPurchaseOrders(currentUser.id, 'buyer');
                const latestOrder = purchaseOrders.find(
                    o => o.sim_card_id === sim.id && o.buyer_id === currentUser.id
                );
                
                if (latestOrder) {
                    await api.createActivationRequest(
                        latestOrder.id,
                        sim.id,
                        currentUser.id,
                        sim.seller_id,
                        sim.number,
                        currentUser.name,
                        seller?.name || 'ناشناس'
                    );
                    
                    // Store the delivery method preference (optional - can be added to DB schema)
                    // For now, we'll just show appropriate notifications based on method
                    if (method === 'activation_code') {
                        showNotification(
                            'خریدتان ثبت شد. لطفاً برای دریافت کد فعالسازی منتظر بمانید.',
                            'success'
                        );
                    } else {
                        showNotification(
                            'خریدتان ثبت شد. فروشنده باید مدارک را ارسال کند.',
                            'success'
                        );
                    }
                }
            } else {
                // For active lines, just process the purchase normally
                await purchaseSim(sim.id, currentUser.id);
                showNotification('خرید با موفقیت انجام شد!', 'success');
            }
            
            setDeliveryModalOpen(false);
            navigate('/buyer');
        } catch (err) {
            if (err instanceof Error) showNotification(err.message, 'error');
            else showNotification('خطایی در هنگام خرید رخ داد.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePlaceBid = async () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        if (sim.seller_id === currentUser.id) {
            showNotification('شما نمی توانید روی سیمکارت خود پیشنهاد ثبت کنید.', 'error');
            return;
        }
        setIsProcessing(true);
        const amount = parseInt(bidAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            showNotification('لطفا مبلغ معتبری وارد کنید.', 'error');
            setIsProcessing(false);
            return;
        }
        try {
            // Get the auction details ID from sim.auction_details
            let auctionDetailId = 0;
            
            if (sim.auction_details) {
                const { data: auctionData, error: auctionError } = await supabase
                    .from('auction_details')
                    .select('id')
                    .eq('sim_card_id', sim.id)
                    .single();
                
                if (auctionError) {
                    console.error('❌ Error fetching auction details:', auctionError);
                    throw new Error('خطا در دریافت جزئیات حراجی: ' + auctionError.message);
                }
                
                if (auctionData) {
                    auctionDetailId = auctionData.id;
                    console.log('✅ Found auction details ID:', auctionDetailId, 'for SIM:', sim.id);
                } else {
                    throw new Error('جزئیات حراجی یافت نشد');
                }
            } else {
                throw new Error('حراجی فاقد جزئیات است');
            }

            // CRITICAL: Check if user has sufficient balance for guarantee deposit
            console.log('🔍 BALANCE CHECK PARAMS:', {
                userId: currentUser.id,
                auctionId: auctionDetailId,
                basePrice: sim.price,
                simId: sim.id
            });
            
            const { hasBalance, requiredAmount, currentBalance } = await api.checkGuaranteeDepositBalance(
                currentUser.id,
                auctionDetailId,
                sim.price,
                sim.id
            );

            console.log('💰 BALANCE CHECK RESULT:', { hasBalance, requiredAmount, currentBalance });

            if (!hasBalance) {
                showNotification(
                    `موجودی کافی نیست. مورد نیاز: ${requiredAmount.toLocaleString('fa-IR')} تومان`,
                    'error'
                );
                setIsProcessing(false);
                return;
            }

            console.log('✅ Balance check passed, placing bid...');
            
            // Place bid with guarantee deposit mechanism
            await api.placeBidWithGuaranteeDeposit(
                sim.id,
                auctionDetailId,
                currentUser.id,
                amount,
                sim.price
            );
            
            showNotification('پیشنهاد شما با موفقیت ثبت شد.', 'success');
            setBidAmount('');
            
            // IMPORTANT: Wait a bit before refreshing to ensure DB has committed the transaction
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (err) {
            console.error('❌ Error placing bid:', err);
            if (err instanceof Error) showNotification(err.message, 'error');
            else showNotification('خطایی در هنگام ثبت پیشنهاد رخ داد.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCallSeller = () => {
        if (sim?.inquiry_phone_number) {
            setShowInquiryNumber(true);
            window.location.href = `tel:${sim.inquiry_phone_number}`;
        } else {
            showNotification('شماره تماس برای این آگهی ثبت نشده است.', 'error');
        }
    };

    const isAuctionEnded = sim.type === 'auction' && sim.auction_details && new Date(sim.auction_details.end_time) < new Date();
    const finalPrice = (sim.type === 'auction' && sim.auction_details ? sim.auction_details.current_bid : sim.price) || 0;
    const highestBidder = sim.auction_details?.highest_bidder_id ? users.find(u => u.id === sim.auction_details!.highest_bidder_id) : null;
    
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden md:flex">
                <div className="md:w-1/2 p-8">
                    <div className="flex justify-between items-start mb-4 gap-2">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${sim.carrier === 'همراه اول' ? 'bg-blue-100 text-blue-800' : sim.carrier === 'ایرانسل' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'}`}>
                            {sim.carrier}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                            {sim.is_rond && (
                                <div className="text-center">
                                    <div className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        رند
                                    </div>
                                    <div className="text-lg flex justify-center" title={`رند ${sim.rond_level || 1} ستاره`}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span key={star} className={star <= (sim.rond_level || 1) ? 'text-yellow-400' : 'text-gray-300'}>
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${sim.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {sim.is_active ? 'فعال' : 'صفر'}
                            </span>
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-center tracking-widest my-8 dark:text-white" style={{ direction: 'ltr' }}>
                        {sim.number.slice(0, 4)} - {sim.number.slice(4, 7)} - {sim.number.slice(7)}
                    </h1>
                    <div className="text-center text-gray-600 dark:text-gray-400">
                        <p>فروشنده: {seller ? seller.name : 'ناشناس'}</p>
                    </div>
                </div>

                <div className="md:w-1/2 p-8 bg-gray-50 dark:bg-gray-700/50 flex flex-col justify-center">
                    {sim.status === 'sold' ? (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-red-600">فروخته شده</h2>
                        </div>
                    ) : sim.type === 'auction' && sim.auction_details ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-gray-500 dark:text-gray-400">بالاترین پیشنهاد</p>
                                <p className="text-4xl font-bold text-green-600 dark:text-green-400 my-2">{finalPrice.toLocaleString('fa-IR')} تومان</p>
                                {highestBidder && <p className="text-sm">توسط: {highestBidder.name}</p>}
                            </div>
                            <div className="text-center text-gray-800 dark:text-gray-200">
                                <p className="mb-2">زمان باقیمانده تا پایان حراجی:</p>
                                <CountdownTimer endTime={sim.auction_details.end_time} />
                            </div>
                            {!isAuctionEnded ? (
                                <div>
                                    <label htmlFor="bid" className="block text-sm font-medium mb-1">پیشنهاد شما (تومان)</label>
                                    <div className="flex">
                                        <input 
                                            type="number" 
                                            id="bid"
                                            value={bidAmount}
                                            onChange={(e) => setBidAmount(e.target.value)}
                                            placeholder={`بیشتر از ${finalPrice.toLocaleString('fa-IR')}`}
                                            className="w-full px-3 py-2 border rounded-r-lg dark:bg-gray-700" 
                                            disabled={isProcessing}
                                        />
                                        <button onClick={handlePlaceBid} disabled={isProcessing} className="bg-red-600 text-white font-bold px-6 py-2 rounded-l-lg hover:bg-red-700 disabled:bg-gray-400">
                                            {isProcessing ? '...' : 'ثبت'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                currentUser?.id === highestBidder?.id && sim.status !== 'sold' && !isPurchaseCompleted ? (
                                    <button onClick={handlePurchaseClick} disabled={isProcessing} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                        {isProcessing ? 'در حال پردازش...' : 'تکمیل خرید'}
                                    </button>
                                ): sim.status !== 'sold' ? (
                                     <p className="text-center font-bold text-lg">این حراجی به پایان رسیده است.</p>
                                ) : null
                            )}
                        </div>
                    ) : sim.type === 'inquiry' ? (
                        <div className="space-y-6 text-center">
                             <p className="text-gray-500 dark:text-gray-400">قیمت توافقی</p>
                             <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 my-2">برای اطلاع از قیمت تماس بگیرید</p>
                            <button onClick={handleCallSeller} className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 flex items-center justify-center space-x-2 space-x-reverse">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {showInquiryNumber && sim.inquiry_phone_number ? (
                                    <span className="text-lg tracking-widest" style={{direction: 'ltr'}}>{sim.inquiry_phone_number}</span>
                                ) : (
                                    <span>تماس با فروشنده</span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-gray-500 dark:text-gray-400">قیمت مقطوع</p>
                                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 my-2">{(sim.price || 0).toLocaleString('fa-IR')} تومان</p>
                            </div>
                            <button onClick={handlePurchaseClick} disabled={isProcessing} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                                {isProcessing ? 'در حال پردازش...' : 'خرید آنی'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Comprehensive Auction Information Section */}
            {sim.type === 'auction' && sim.auction_details && (
                <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border-2 border-blue-200 dark:border-blue-800">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">📋 توضیحات کامل حراجی</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* How Auction Works */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">🔍 نحوه عملکرد حراجی</h3>
                            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                                <li className="flex items-start">
                                    <span className="text-lg ml-3">1️⃣</span>
                                    <span><strong>ثبت پیشنهاد:</strong> شما می‌توانید پیشنهاد‌های متعددی را ثبت کنید.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-lg ml-3">2️⃣</span>
                                    <span><strong>بالاترین پیشنهاد برنده است:</strong> کسی که بالاترین پیشنهاد را ثبت کند به عنوان برنده انتخاب می‌شود.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-lg ml-3">3️⃣</span>
                                    <span><strong>زمان پایان:</strong> حراجی در تاریخ و ساعت مشخص‌شده پایان می‌یابد.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-lg ml-33">4️⃣</span>
                                    <span><strong>پرداخت موقت:</strong> پس از پایان حراجی، برنده باید در مدت {paymentDeadlineHours} ساعت پرداخت را انجام دهد.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Guarantee Deposit Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                            <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">💰 حق ضمانت نامه</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">مبلغ حق ضمانت ({(guaranteeRate * 100).toFixed(0)}% از قیمت پایه)</p>
                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                        {(sim.price * guaranteeRate).toLocaleString('fa-IR')} تومان
                                    </p>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    هنگام ثبت پیشنهاد اول، {(guaranteeRate * 100).toFixed(0)}% از قیمت پایه به‌طور موقت از حساب شما کسر می‌شود. این مبلغ برای حفاظت از جدی‌بودن شرکت‌کنندگان است.
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    اگر برنده نشوید، این مبلغ به‌طور خودکار به حساب شما برگردانده می‌شود.
                                </p>
                            </div>
                        </div>

                        {/* Payment Information */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                            <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">🏆 اگر برنده شوید</h3>
                            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                                <li className="flex items-start">
                                    <span className="text-lg ml-3">✓</span>
                                    <span>شما به عنوان برنده انتخاب می‌شوید.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-lg ml-3">✓</span>
                                    <span>فرصت {paymentDeadlineHours} ساعتی برای تکمیل پرداخت دارید.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-lg ml-3">✓</span>
                                    <span>بعد از پرداخت، سیمکارت برای تحویل آماده می‌شود.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-lg ml-3">✓</span>
                                    <span>حق ضمانت نامه به حساب شما برگردانده می‌شود.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Commission Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                            <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-4">💳 هزینه‌ها</h3>
                            <div className="space-y-4">
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">کمیسیون سایت ({(commissionRate * 100).toFixed(0)}%)</p>
                                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                        {(finalPrice * commissionRate).toLocaleString('fa-IR')} تومان
                                    </p>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    کمیسیون {(commissionRate * 100).toFixed(0)} درصد از قیمت نهایی خریداری محاسبه می‌شود. این مبلغ برای حفاظت و بهبود سایت استفاده می‌شود.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Important Rules */}
                    <div className="mt-8 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded">
                        <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-4">⚠️ قوانین مهم</h3>
                        <ul className="space-y-2 text-sm text-red-700 dark:text-red-300">
                            <li>• نمی‌توانید روی سیمکارت خود پیشنهاد ثبت کنید.</li>
                            <li>• پیشنهاد شما باید بیشتر از پیشنهاد قبلی باشد.</li>
                            <li>درصورت عدم پرداخت در {paymentDeadlineHours} ساعت، حق ضمانت نامه ضبط می‌شود.</li>
                            <li>درصورت عدم پرداخت، برنده بعدی انتخاب می‌شود.</li>
                            <li>موجودی کافی برای ثبت پیشنهاد و حق ضمانت الزامی است.</li>
                        </ul>
                    </div>
                </div>
            )}
            {isConfirmModalOpen && sim.type === 'fixed' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md text-center">
                        <h3 className="text-xl font-bold mb-4">تایید خرید</h3>
                        <p className="mb-2">آیا از خرید سیمکارت به شماره زیر اطمینان دارید؟</p>
                        <p className="font-bold text-2xl tracking-wider mb-4" style={{direction: 'ltr'}}>{sim.number}</p>
                        <p className="mb-6">به قیمت: <span className="font-bold">{(sim.price || 0).toLocaleString('fa-IR')} تومان</span></p>

                        <div className="flex justify-center space-x-4 space-x-reverse">
                            <button onClick={() => setConfirmModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-6 py-2 rounded-lg" disabled={isProcessing}>
                                انصراف
                            </button>
                            <button onClick={executePurchase} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400" disabled={isProcessing}>
                                {isProcessing ? '...' : 'تایید و خرید'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showAuctionPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md text-center">
                        <h3 className="text-xl font-bold mb-4">تکمیل خریدحراجی</h3>
                        <p className="mb-4 text-gray-700 dark:text-gray-300">آیا برای تکمیل خرید و پرداخت مبلغ زیر اطمینان دارید؟</p>
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">شماره سیمکارت</p>
                            <p className="font-bold text-lg tracking-wider mb-4" style={{direction: 'ltr'}}>{sim.number}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">مبلغ قابل پرداخت</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {sim.auction_details?.current_bid?.toLocaleString('fa-IR') || '0'} تومان
                            </p>
                            <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded text-sm text-orange-800 dark:text-orange-300">
                                <p>💡 توجه: این مبلغ کامل شامل حق ضمانت و پیشنهاد شما می‌شود</p>
                                <p className="mt-1">💰 {(commissionRate * 100).toFixed(0)}% کمیسیون سایت از این مبلغ کسر خواهد شد</p>
                            </div>
                        </div>
                        <div className="flex justify-center space-x-4 space-x-reverse">
                            <button onClick={() => setShowAuctionPaymentModal(false)} className="bg-gray-300 dark:bg-gray-600 px-6 py-2 rounded-lg" disabled={isProcessing}>
                                انصراف
                            </button>
                            <button onClick={completeAuctionPayment} className="px-6 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400" disabled={isProcessing}>
                                {isProcessing ? 'درحال پردازش...' : 'تایید و پرداخت'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <LineDeliveryMethodModal
                isOpen={isDeliveryModalOpen}
                simNumber={sim?.number || ''}
                isInactiveLine={!sim?.is_active}
                onSelect={handleDeliveryMethodSelect}
                onClose={() => setDeliveryModalOpen(false)}
                isLoading={isProcessing}
            />
        </div>
    );
};

export default SimDetailsPage;