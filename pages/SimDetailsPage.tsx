import React, { useState, useEffect } from 'react';
// FIX: Replaced v5 `useHistory` with v6 `useNavigate` to resolve module export error.
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { SimCard as SimCardType, User } from '../types';
import { useNotification } from '../contexts/NotificationContext';

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

    if (loading) {
        return <div className="text-center py-20">در حال بارگذاری...</div>;
    }
    
    if (!sim) {
        return <div className="text-center py-20">سیمکارت یافت نشد.</div>;
    }

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
            executePurchase();
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
            await placeBid(sim.id, currentUser.id, amount);
            showNotification('پیشنهاد شما با موفقیت ثبت شد.', 'success');
            setBidAmount('');
        } catch (err) {
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
                    <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${sim.carrier === 'همراه اول' ? 'bg-blue-100 text-blue-800' : sim.carrier === 'ایرانسل' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'}`}>
                            {sim.carrier}
                        </span>
                        {sim.is_rond && <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">رند</span>}
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
                                currentUser?.id === highestBidder?.id ? (
                                    <button onClick={handlePurchaseClick} disabled={isProcessing} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                        {isProcessing ? 'در حال پردازش...' : 'تکمیل خرید'}
                                    </button>
                                ): (
                                     <p className="text-center font-bold text-lg">این حراجی به پایان رسیده است.</p>
                                )
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
        </div>
    );
};

export default SimDetailsPage;