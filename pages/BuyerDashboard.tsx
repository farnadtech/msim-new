import React, { useState, useEffect } from 'react';
// FIX: Upgrading react-router-dom from v5 to v6.
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useNotification } from '../contexts/NotificationContext';
// SimCard component is no longer used in MyBids
// import SimCard from '../components/SimCard';

const BuyerOverview = () => {
    const { user } = useAuth();
    const { simCards, transactions } = useData();
    if (!user) return null;

    const purchaseTransactions = transactions.filter(t => t.user_id === user.id && t.type === 'purchase' && t.description.startsWith('خرید سیمکارت'));
    const purchasedSimCount = purchaseTransactions.length;
    
    const myBids = simCards.filter(s => s.type === 'auction' && s.auction_details?.highest_bidder_id === user.id && s.status === 'available');

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">داشبورد خریدار</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{purchasedSimCount}</p>
                    <p className="text-blue-700 dark:text-blue-400">سیمکارت های خریداری شده</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-800 dark:text-green-300">{myBids.length}</p>
                    <p className="text-green-700 dark:text-green-400">پیشنهادات فعال در حراجی</p>
                </div>
                 <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg text-center">
                    <p className="text-xl font-bold text-purple-800 dark:text-purple-300">{((user.wallet_balance || 0) + (user.blocked_balance || 0)).toLocaleString('fa-IR')}</p>
                    <p className="text-purple-700 dark:text-purple-400">موجودی کل کیف پول (تومان)</p>
                </div>
            </div>
        </div>
    );
};

const MyPurchases = () => {
    const { user } = useAuth();
    const { transactions } = useData();
    if (!user) return null;

    const purchaseTransactions = transactions.filter(t => t.user_id === user.id && t.type === 'purchase');

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">خریدهای من</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">توضیحات</th>
                            <th className="p-3">مبلغ</th>
                            <th className="p-3">تاریخ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchaseTransactions.length > 0 ? purchaseTransactions.map(t => (
                            <tr key={t.id} className="border-b dark:border-gray-700">
                                <td className="p-3">{t.description}</td>
                                <td className="p-3 text-red-600">{t.amount.toLocaleString('fa-IR')} تومان</td>
                                <td className="p-3">{new Date(t.date).toLocaleDateString('fa-IR')}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={3} className="text-center p-4">هنوز خریدی انجام نداده اید.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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
        const timer = setTimeout(() => { setTimeLeft(calculateTimeLeft()); }, 1000);
        return () => clearTimeout(timer);
    });

    let displayTime = "";
    if(timeLeft.days) displayTime += `${timeLeft.days} روز و `;
    if(timeLeft.hours) displayTime += `${timeLeft.hours} ساعت و `;
    displayTime += `${timeLeft.minutes || 0} دقیقه`;

    return <div>{Object.keys(timeLeft).length ? <div className="text-sm text-red-500">{displayTime}</div> : <span className="text-red-600">پایان یافته</span>}</div>;
}


const MyBids = () => {
    const { user } = useAuth();
    const { simCards, users, loading } = useData();
    if (!user) return null;

    const myBidAuctions = simCards.filter(s => 
        s.type === 'auction' && 
        s.auction_details &&
        new Date(s.auction_details.end_time) > new Date() &&
        s.auction_details.bids.some(b => b.user_id === user.id)
    );

    if (loading) return <div>در حال بارگذاری...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">حراجی های من</h2>
            {myBidAuctions.length > 0 ? (
                <div className="space-y-4">
                    {myBidAuctions.map(sim => {
                        if (!sim.auction_details) return null;
                        const isHighestBidder = sim.auction_details.highest_bidder_id === user.id;
                        const myLastBid = sim.auction_details.bids.slice().reverse().find(b => b.user_id === user.id);
                        const highestBidder = users.find(u => u.id === sim.auction_details?.highest_bidder_id);

                        return (
                            <div key={sim.id} className="border dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                                <div className="flex-1">
                                    <p className="font-bold text-lg" style={{direction: 'ltr'}}>{sim.number}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">بالاترین پیشنهاد: {(sim.auction_details.current_bid || 0).toLocaleString('fa-IR')} تومان توسط {highestBidder ? highestBidder.name : 'کسی'}</p>
                                     <CountdownTimer endTime={sim.auction_details.end_time} />
                                </div>
                                <div className="flex-1 text-center">
                                     <p className="text-sm">آخرین پیشنهاد شما</p>
                                     <p className="font-bold">{(myLastBid?.amount || 0).toLocaleString('fa-IR')} تومان</p>
                                </div>
                                <div className="flex-1 text-center">
                                    {isHighestBidder ? (
                                        <span className="px-3 py-1 text-sm rounded-full bg-green-200 text-green-800">شما بالاترین پیشنهاد را دارید</span>
                                    ) : (
                                        <span className="px-3 py-1 text-sm rounded-full bg-orange-200 text-orange-800">پیشنهاد شما رد شد!</span>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <Link to={`/sim/${sim.id}`} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">مشاهده حراجی</Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400">شما در حال حاضر در هیچ حراجی فعالی شرکت نکرده اید.</p>
            )}
        </div>
    );
};


const BuyerWallet = ({ onTransaction }: { onTransaction: (amount: number, type: 'deposit' | 'withdrawal') => Promise<void> }) => {
    const { user } = useAuth();
    const { transactions } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'zarinpal' | 'card'>('zarinpal');
    const [cardNumber, setCardNumber] = useState('');
    const [trackingCode, setTrackingCode] = useState('');
    const [receiptImage, setReceiptImage] = useState<File | null>(null);

    if (!user) return null;
    const myTransactions = transactions.filter(t => t.user_id === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleOpenModal = (type: 'deposit' | 'withdrawal') => {
        setModalType(type);
        setModalOpen(true);
        setAmount('');
        setPaymentMethod('zarinpal');
        setCardNumber('');
        setTrackingCode('');
        setReceiptImage(null);
    };

    const handleWalletAction = async () => {
        const numericAmount = parseInt(amount, 10);
        if (!isNaN(numericAmount) && numericAmount > 0) {
            setIsLoading(true);
            try {
                if (modalType === 'deposit') {
                    // For deposits, show payment method selection
                    setModalOpen(false);
                    // In a real implementation, you would redirect to the selected payment method
                    alert(`درگاه پرداخت: ${paymentMethod === 'zarinpal' ? 'زرین‌پال' : 'کارت به کارت'}\nمبلغ: ${numericAmount.toLocaleString('fa-IR')} تومان`);
                } else {
                    // For withdrawals, process normally
                    await onTransaction(numericAmount, modalType);
                    setModalOpen(false);
                }
            } catch(error) {
                // Error is now handled by the parent component using notifications
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">کیف پول</h2>
            <div className="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg mb-6 text-center">
                <p className="text-gray-600 dark:text-gray-300">موجودی کل</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{((user.wallet_balance || 0) + (user.blocked_balance || 0)).toLocaleString('fa-IR')} تومان</p>
                <div className="mt-2 text-sm">
                    <span>قابل استفاده: {(user.wallet_balance || 0).toLocaleString('fa-IR')}</span> | <span className="text-orange-600 dark:text-orange-400">بلوکه شده در حراجی: {(user.blocked_balance || 0).toLocaleString('fa-IR')}</span>
                </div>
                <div className="mt-4 flex justify-center space-x-4 space-x-reverse">
                    <button onClick={() => handleOpenModal('deposit')} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">شارژ کیف پول</button>
                    <button onClick={() => handleOpenModal('withdrawal')} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">برداشت از کیف پول</button>
                </div>
            </div>
            <h3 className="font-bold mb-3">تاریخچه تراکنش ها</h3>
            {myTransactions.length > 0 ? myTransactions.map(t => (
                <div key={t.id} className="border-b dark:border-gray-700 py-2 flex justify-between">
                    <span>{t.description} - <span className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString('fa-IR')}</span></span>
                    <p className={t.amount > 0 ? 'text-green-600' : 'text-red-600'}>{t.amount.toLocaleString('fa-IR')} تومان</p>
                </div>
            )) : <p className="text-gray-500">هیچ تراکنشی یافت نشد.</p>}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">{modalType === 'deposit' ? 'شارژ کیف پول' : 'برداشت از کیف پول'}</h3>
                        <label className="block mb-2">مبلغ (تومان)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
                            placeholder="مبلغ را وارد کنید"
                            disabled={isLoading}
                        />
                        
                        {modalType === 'deposit' && (
                            <>
                                <div className="mt-4">
                                    <label className="block mb-2 font-medium">روش پرداخت</label>
                                    <div className="flex items-center space-x-4 space-x-reverse mb-4">
                                        <label className="flex items-center">
                                            <input 
                                                type="radio" 
                                                name="paymentMethod" 
                                                value="zarinpal" 
                                                checked={paymentMethod === 'zarinpal'}
                                                onChange={() => setPaymentMethod('zarinpal')}
                                                className="ml-2"
                                            />
                                            <span>زرین‌پال</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input 
                                                type="radio" 
                                                name="paymentMethod" 
                                                value="card" 
                                                checked={paymentMethod === 'card'}
                                                onChange={() => setPaymentMethod('card')}
                                                className="ml-2"
                                            />
                                            <span>کارت به کارت</span>
                                        </label>
                                    </div>
                                    
                                    {paymentMethod === 'card' && (
                                        <div className="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg mb-4">
                                            <h4 className="font-bold mb-2">اطلاعات پرداخت کارت به کارت</h4>
                                            <p className="mb-2">لطفاً مبلغ را به شماره کارت زیر واریز کنید:</p>
                                            <p className="font-bold text-lg mb-2">6037-99XX-XXXX-XXXX</p>
                                            <p className="mb-4">(بانک ملی ایران)</p>
                                            
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block mb-1">شماره کارت واریز کننده</label>
                                                    <input
                                                        type="text"
                                                        value={cardNumber}
                                                        onChange={(e) => setCardNumber(e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
                                                        placeholder="شماره کارت 16 رقمی"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1">کد پیگیری</label>
                                                    <input
                                                        type="text"
                                                        value={trackingCode}
                                                        onChange={(e) => setTrackingCode(e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
                                                        placeholder="کد پیگیری را وارد کنید"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1">تصویر رسید پرداخت</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setReceiptImage(e.target.files?.[0] || null)}
                                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        
                        <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                            <button onClick={() => setModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg" disabled={isLoading}>انصراف</button>
                            <button onClick={handleWalletAction} className={`px-4 py-2 rounded-lg text-white ${modalType === 'deposit' ? 'bg-green-600' : 'bg-red-600'}`} disabled={isLoading}>
                                {isLoading ? 'در حال پردازش...' : (modalType === 'deposit' ? 'پرداخت' : 'ثبت برداشت')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// FIX: Moved NavItem component outside of BuyerDashboard to prevent re-creation on render and fix children prop error.
// FIX: Changed NavItem to be a React.FC to fix errors about missing 'children' property.
const NavItem: React.FC<{ to: string, children: React.ReactNode, end?: boolean }> = ({ to, children, end = false }) => (
    <NavLink
        to={to}
        end={end}
        className={({isActive}) => 
            "block px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" +
            (isActive ? " bg-blue-600 text-white" : "")
        }
    >
        {children}
    </NavLink>
);

const BuyerDashboard: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { processTransaction } = useData();
    const { showNotification } = useNotification();

    const handleWalletTransaction = async (amount: number, type: 'deposit' | 'withdrawal') => {
        if (!user) return;
        
        try {
            const finalAmount = type === 'deposit' ? amount : -amount;
            const description = type === 'deposit' ? 'شارژ کیف پول' : 'برداشت از کیف پول';
            await processTransaction(user.id, finalAmount, type, description);
            await refreshUser();
            showNotification('تراکنش با موفقیت انجام شد.', 'success');
        } catch (error) {
             if (error instanceof Error) {
                showNotification(error.message, 'error');
            } else {
                showNotification('خطا در پردازش تراکنش.', 'error');
            }
             throw error;
        }
    };
    
    const sidebar = (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">پنل خریدار</h3>
            <nav className="space-y-2">
                <NavItem to="." end>داشبورد</NavItem>
                <NavItem to="purchases">خریدهای من</NavItem>
                <NavItem to="bids">حراجی های من</NavItem>
                <NavItem to="wallet">کیف پول</NavItem>
            </nav>
        </div>
    );

    return (
        <DashboardLayout sidebar={sidebar}>
            <Routes>
                <Route index element={<BuyerOverview />} />
                <Route path="purchases" element={<MyPurchases />} />
                <Route path="bids" element={<MyBids />} />
                <Route path="wallet" element={<BuyerWallet onTransaction={handleWalletTransaction} />} />
            </Routes>
        </DashboardLayout>
    );
};

export default BuyerDashboard;