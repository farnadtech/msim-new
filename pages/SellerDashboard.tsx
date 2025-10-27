import React, { useState } from 'react';
// FIX: Upgrading react-router-dom from v5 to v6.
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { SimCard, Package, SimCardTypeOption } from '../types';
import { useNotification } from '../contexts/NotificationContext';

const SellerOverview = () => {
    const { user } = useAuth();
    const { simCards, packages } = useData();
    if (!user) return null;

    const mySims = simCards.filter(s => s.seller_id === user.id);
    const soldSims = mySims.filter(s => s.status === 'sold');
    const activeListings = mySims.filter(s => s.status === 'available');
    const userPackage = packages.find(p => p.id === user.package_id);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
            <h2 className="text-2xl font-bold">داشبورد فروشنده</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-800 dark:text-green-300">{activeListings.length}</p>
                    <p className="text-green-700 dark:text-green-400">آگهی های فعال</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{soldSims.length}</p>
                    <p className="text-blue-700 dark:text-blue-400">فروش های موفق</p>
                </div>
            </div>
             <div className="bg-purple-50 dark:bg-purple-900/50 p-4 rounded-lg text-center">
                <p className="text-gray-600 dark:text-gray-300">کیف پول</p>
                <div className="flex justify-around items-center mt-2">
                    <div>
                        <span className="block text-xl font-bold text-purple-700 dark:text-purple-300">{(user.wallet_balance || 0).toLocaleString('fa-IR')}</span>
                        <span className="text-xs">موجودی قابل برداشت (تومان)</span>
                    </div>
                     <div>
                        <span className="block text-xl font-bold text-orange-700 dark:text-orange-300">{(user.blocked_balance || 0).toLocaleString('fa-IR')}</span>
                        <span className="text-xs">موجودی بلوکه شده (تومان)</span>
                    </div>
                </div>
            </div>
            {userPackage && (
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-bold">پکیج فعال شما: {userPackage.name}</h3>
                    <p>شما می توانید تا {userPackage.listing_limit} آگهی همزمان داشته باشید.</p>
                 </div>
            )}
        </div>
    );
};

const MySimCards = () => {
    const { user } = useAuth();
    const { simCards, updateSimCard } = useData();
    const { showNotification } = useNotification();
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingSim, setEditingSim] = useState<SimCard | null>(null);
    const [newPrice, setNewPrice] = useState('');

    if (!user) return null;
    const mySims = simCards.filter(s => s.seller_id === user.id);

    const handleEditClick = (sim: SimCard) => {
        if (sim.type === 'inquiry') return;
        setEditingSim(sim);
        const price = sim.type === 'auction' ? sim.auction_details?.current_bid : sim.price;
        setNewPrice(String(price || ''));
        setEditModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingSim || newPrice === '') return;
        const priceValue = parseInt(newPrice, 10);
        if (isNaN(priceValue) || priceValue < 0) {
            showNotification('لطفا قیمت معتبری وارد کنید.', 'error');
            return;
        }

        try {
            let updateData: Partial<SimCard> = {};
            if (editingSim.type === 'fixed') {
                updateData.price = priceValue;
            } else if (editingSim.type === 'auction' && editingSim.auction_details) {
                // For auctions, you might want to add more logic, e.g., can't lower price if there are bids
                updateData.auction_details = { ...editingSim.auction_details, current_bid: priceValue };
            }
            await updateSimCard(editingSim.id, updateData);
            showNotification('قیمت با موفقیت بروزرسانی شد.', 'success');
            setEditModalOpen(false);
            setEditingSim(null);
        } catch (error) {
            showNotification('خطا در بروزرسانی قیمت.', 'error');
        }
    };


    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">سیمکارت های من</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">شماره</th>
                            <th className="p-3">قیمت/پیشنهاد</th>
                            <th className="p-3">نوع</th>
                            <th className="p-3">وضعیت</th>
                            <th className="p-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mySims.map(sim => (
                            <tr key={sim.id} className="border-b dark:border-gray-700">
                                <td className="p-3" style={{ direction: 'ltr' }}>{sim.number}</td>
                                <td className="p-3">{ (sim.type === 'inquiry') ? 'توافقی' : (((sim.type === 'auction' ? sim.auction_details?.current_bid : sim.price) || 0).toLocaleString('fa-IR') + ' تومان')}</td>
                                <td className="p-3">{sim.type === 'fixed' ? 'مقطوع' : sim.type === 'auction' ? 'حراجی' : 'استعلامی'}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${sim.status === 'available' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {sim.status === 'available' ? 'موجود' : 'فروخته شده'}
                                    </span>
                                </td>
                                 <td className="p-3">
                                    {sim.status === 'available' && sim.type !== 'inquiry' && (
                                        <button onClick={() => handleEditClick(sim)} className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 text-sm">
                                            ویرایش
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isEditModalOpen && editingSim && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">ویرایش قیمت سیمکارت</h3>
                        <p className="mb-4 text-lg tracking-wider" style={{direction: 'ltr'}}>{editingSim.number}</p>
                        <div>
                            <label className="block mb-1">
                                {editingSim.type === 'fixed' ? 'قیمت جدید (تومان)' : 'بالاترین پیشنهاد جدید (تومان)'}
                            </label>
                            <input 
                                type="number" 
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700" 
                            />
                        </div>
                        <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                            <button onClick={() => setEditModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg">انصراف</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white bg-blue-600">ذخیره تغییرات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SellerWallet = ({ onTransaction }: { onTransaction: (amount: number, type: 'deposit' | 'withdrawal') => Promise<void> }) => {
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
                    <span>قابل برداشت: {(user.wallet_balance || 0).toLocaleString('fa-IR')}</span> | <span className="text-orange-600 dark:text-orange-400">بلوکه شده: {(user.blocked_balance || 0).toLocaleString('fa-IR')}</span>
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

const AddSimCard = ({ onAddSim }: { onAddSim: (sim: Omit<SimCard, 'id' | 'seller_id' | 'status'>) => Promise<void> }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [saleType, setSaleType] = useState<SimCardTypeOption>('fixed');
    const [simData, setSimData] = useState({
        number: '',
        carrier: 'همراه اول',
        price: '',
        is_rond: false,
        startingBid: '',
        endTime: '',
        inquiry_phone_number: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const ROND_FEE = 5000;


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';

        if (name === 'is_rond' && isCheckbox && (e.target as HTMLInputElement).checked) {
            if (user && (user.wallet_balance || 0) < ROND_FEE) {
                // This check is mostly redundant due to the 'disabled' prop, but serves as a safeguard.
                return;
            }
        }
        
        // For the phone number field, ensure only digits are entered
        if (name === 'number') {
            // Allow only digits
            if (value && !/^[0-9]*$/.test(value)) {
                return;
            }
            // Limit to 11 characters
            if (value.length > 11) {
                return;
            }
        }
        
        setSimData(prev => ({
            ...prev,
            [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Client-side validation
        if (!simData.number || simData.number.length !== 11 || !/^[0-9]+$/.test(simData.number)) {
            showNotification('شماره سیمکارت باید دقیقاً 11 رقم باشد.', 'error');
            return;
        }
        
        setIsLoading(true);
        
        const simDataToSend: Omit<SimCard, 'id' | 'seller_id' | 'status'> = {
            number: simData.number,
            price: saleType === 'fixed' ? parseInt(simData.price, 10) || 0 : 0,
            type: saleType,
            carrier: simData.carrier as 'همراه اول' | 'ایرانسل' | 'رایتل',
            is_rond: simData.is_rond,
            inquiry_phone_number: saleType === 'inquiry' ? simData.inquiry_phone_number : undefined,
            // FIX: Initialize `bids` as an empty array for new auctions to match the SimCard type.
            auction_details: saleType === 'auction' ? {
                end_time: new Date(simData.endTime).toISOString(),
                current_bid: parseInt(simData.startingBid, 10) || 0,
                bids: [],
            } : undefined
        };
        try {
            await onAddSim(simDataToSend);
            // Reset form on success
            setSimData({
                number: '',
                carrier: 'همراه اول',
                price: '',
                is_rond: false,
                startingBid: '',
                endTime: '',
                inquiry_phone_number: '',
            });
            setSaleType('fixed');
        } catch (err) {
            // Error is caught and displayed by the parent component.
        } finally {
            setIsLoading(false);
        }
    };
    
    if(!user) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">ثبت سیمکارت جدید</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <fieldset disabled={isLoading}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="number" className="block mb-2 font-medium">شماره سیمکارت</label>
                            <input 
                                type="text" 
                                name="number" 
                                id="number" 
                                value={simData.number} 
                                onChange={handleChange} 
                                required 
                                maxLength={11}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                                placeholder="0912..." 
                            />
                            <p className="text-xs text-gray-500 mt-1">شماره باید دقیقاً 11 رقم باشد</p>
                        </div>
                        <div>
                            <label htmlFor="carrier" className="block mb-2 font-medium">اپراتور</label>
                            <select name="carrier" id="carrier" value={simData.carrier} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                <option>همراه اول</option>
                                <option>ایرانسل</option>
                                <option>رایتل</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">نوع فروش</label>
                        <div className="flex items-center space-x-4 space-x-reverse">
                            <label><input type="radio" value="fixed" checked={saleType === 'fixed'} onChange={() => setSaleType('fixed')} className="ml-2" /> قیمت مقطوع</label>
                            <label><input type="radio" value="auction" checked={saleType === 'auction'} onChange={() => setSaleType('auction')} className="ml-2" /> حراجی</label>
                             <label><input type="radio" value="inquiry" checked={saleType === 'inquiry'} onChange={() => setSaleType('inquiry')} className="ml-2" /> استعلام با تماس</label>
                        </div>
                    </div>

                    {saleType === 'fixed' && (
                        <div>
                            <label htmlFor="price" className="block mb-2 font-medium">قیمت (تومان)</label>
                            <input type="number" name="price" id="price" value={simData.price} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    )}
                    {saleType === 'auction' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border dark:border-gray-700 rounded-lg">
                            <div>
                                <label htmlFor="startingBid" className="block mb-2 font-medium">قیمت پایه (تومان)</label>
                                <input type="number" name="startingBid" id="startingBid" value={simData.startingBid} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                                <label htmlFor="endTime" className="block mb-2 font-medium">زمان پایان حراجی</label>
                                <input type="datetime-local" name="endTime" id="endTime" value={simData.endTime} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                        </div>
                    )}
                    
                    {saleType === 'inquiry' && (
                        <div className="space-y-4">
                             <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-center">
                                <p>در این حالت، قیمت نمایش داده نمی شود و خریداران برای اطلاع از قیمت با شماره ثبت شده شما تماس خواهند گرفت.</p>
                            </div>
                            <div>
                                <label htmlFor="inquiry_phone_number" className="block mb-2 font-medium">شماره تماس برای استعلام</label>
                                <input 
                                    type="tel" 
                                    name="inquiry_phone_number" 
                                    id="inquiry_phone_number" 
                                    value={simData.inquiry_phone_number} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                                    placeholder="شماره تماسی که به خریدار نمایش داده می‌شود"
                                />
                            </div>
                        </div>
                       
                    )}

                    <div>
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                name="is_rond" 
                                id="is_rond" 
                                checked={simData.is_rond} 
                                onChange={handleChange} 
                                className="w-5 h-5 ml-3 rounded disabled:opacity-50" 
                                disabled={(user.wallet_balance || 0) < ROND_FEE}
                            />
                            <label htmlFor="is_rond" className={`font-medium ${(user.wallet_balance || 0) < ROND_FEE ? 'text-gray-400' : ''}`}>شماره رند است</label>
                        </div>
                        {(user.wallet_balance || 0) < ROND_FEE ? (
                             <p className="text-xs text-red-500 mt-1">
                                برای ثبت شماره به عنوان رند، نیاز به حداقل {ROND_FEE.toLocaleString('fa-IR')} تومان موجودی در کیف پول دارید. لطفا کیف پول خود را شارژ کنید.
                            </p>
                        ) : (
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                با انتخاب این گزینه، مبلغ {ROND_FEE.toLocaleString('fa-IR')} تومان از کیف پول شما کسر خواهد شد.
                            </p>
                        )}
                    </div>
                </fieldset>
                
                <div className="pt-4">
                    <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold disabled:bg-gray-400" disabled={isLoading}>
                        {isLoading ? 'در حال ثبت...' : 'ثبت آگهی'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const BuyPackage = ({ onBuyPackage }: { onBuyPackage: (pkg: Package) => Promise<boolean> }) => {
    const { user } = useAuth();
    const { packages } = useData();
    const navigate = useNavigate();
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);


    const handleSelectPackage = (pkg: Package) => {
        setSelectedPackage(pkg);
        setModalOpen(true);
    };

    const handleConfirmPurchase = async () => {
        if (selectedPackage) {
            setIsLoading(true);
            const success = await onBuyPackage(selectedPackage);
            setIsLoading(false);
            if(success) {
                setModalOpen(false);
                navigate('/seller');
            }
        }
    };
    
    if (!user) return null;
    const hasSufficientFunds = selectedPackage ? (user.wallet_balance || 0) >= selectedPackage.price : false;


    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">خرید و ارتقاء پکیج</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {packages.map((pkg) => {
                    const isCurrentUserPackage = user.package_id === pkg.id;
                    return (
                        <div key={pkg.id} className={`rounded-xl shadow-lg p-8 flex flex-col text-center transition-transform transform hover:scale-105 border-4 ${isCurrentUserPackage ? 'border-green-500' : 'border-transparent'}`}>
                            {isCurrentUserPackage && <div className="bg-green-500 text-white text-sm font-bold py-1 px-3 rounded-full -mt-10 mb-4 self-center">پکیج فعلی شما</div>}
                            <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{pkg.description}</p>
                            <p className="text-4xl font-extrabold mb-2">{new Intl.NumberFormat('fa-IR').format(pkg.price)}<span className="text-lg font-normal"> تومان</span></p>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{pkg.duration_days} روز اعتبار</p>
                            <ul className="text-right space-y-3 mb-8 flex-grow">
                                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-green-500" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>تا {pkg.listing_limit} آگهی همزمان</li>
                            </ul>
                            <button onClick={() => handleSelectPackage(pkg)} disabled={isCurrentUserPackage} className={`w-full py-3 font-bold rounded-lg transition-colors ${isCurrentUserPackage ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {isCurrentUserPackage ? 'فعال' : 'انتخاب پکیج'}
                            </button>
                        </div>
                    )
                })}
            </div>

            {isModalOpen && selectedPackage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">تایید خرید پکیج</h3>
                        <p className="mb-2">شما در حال خرید <span className="font-bold">{selectedPackage.name}</span> به قیمت <span className="font-bold">{selectedPackage.price.toLocaleString('fa-IR')} تومان</span> هستید.</p>
                        <p className="mb-6">موجودی فعلی شما: <span className="font-bold">{(user.wallet_balance || 0).toLocaleString('fa-IR')} تومان</span></p>

                        {!hasSufficientFunds && (
                            <div className="bg-red-100 dark:bg-red-900/50 border-r-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-4" role="alert">
                                <p className="font-bold">موجودی کافی نیست!</p>
                                <p>لطفا ابتدا کیف پول خود را شارژ کنید.</p>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                            <button onClick={() => setModalOpen(false)} className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg" disabled={isLoading}>انصراف</button>
                            <button onClick={handleConfirmPurchase} disabled={!hasSufficientFunds || isLoading} className="px-6 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isLoading ? 'در حال خرید...' : 'تایید خرید'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// FIX: Moved NavItem component outside of SellerDashboard to prevent re-creation on render and fix children prop error.
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

const SellerDashboard: React.FC = () => {
    const { user, refreshUser, loading } = useAuth();
    const { addSimCard, processTransaction, updateUserPackage } = useData();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // Show loading indicator while user data is being loaded
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    const handleAddNewSim = async (simData: Omit<SimCard, 'id' | 'seller_id' | 'status'>) => {
        try {
            await addSimCard(simData);
            showNotification('سیمکارت شما با موفقیت ثبت شد.', 'success');
            navigate('/seller/simcards');
        } catch (error) {
            if (error instanceof Error) {
                showNotification(error.message, 'error');
            } else {
                showNotification('خطا در ثبت سیمکارت.', 'error');
            }
        }
    };
    
    const handleWalletTransaction = async (amount: number, type: 'deposit' | 'withdrawal') => {
        if (!user) return;
        
        try {
            const finalAmount = type === 'deposit' ? amount : -amount;
            const description = type === 'deposit' ? 'شارژ کیف پول' : 'برداشت از کیف پول';
            await processTransaction(user.id, finalAmount, type, description);
            await refreshUser(); // Refresh user in auth context to show new balance
            showNotification('تراکنش با موفقیت انجام شد.', 'success');
        } catch (error) {
             if (error instanceof Error) {
                showNotification(error.message, 'error');
            } else {
                showNotification('خطا در پردازش تراکنش.', 'error');
            }
             throw error; // Re-throw to be caught by caller
        }
    };

    const handleBuyPackage = async (pkg: Package): Promise<boolean> => {
        if (!user) return false;
        try {
            // First, process the payment
            await processTransaction(user.id, -pkg.price, 'purchase', `خرید پکیج ${pkg.name}`);
            // Then, update the user's package
            await updateUserPackage(user.id, pkg.id);
            // Finally, refresh the user state in the auth context
            await refreshUser();
            showNotification(`پکیج "${pkg.name}" با موفقیت خریداری شد.`, 'success');
            return true;
        } catch (error) {
             if (error instanceof Error) {
                showNotification(error.message, 'error');
            } else {
                showNotification('خطا در خرید پکیج.', 'error');
            }
            return false;
        }
    };

    const sidebar = (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">پنل فروشنده</h3>
            <nav className="space-y-2">
                <NavItem to="." end>داشبورد</NavItem>
                <NavItem to="simcards">سیمکارت های من</NavItem>
                <NavItem to="add-sim">ثبت سیمکارت جدید</NavItem>
                <NavItem to="wallet">کیف پول</NavItem>
                <NavItem to="packages">خرید پکیج</NavItem>
            </nav>
        </div>
    );

    return (
        <DashboardLayout sidebar={sidebar}>
            <Routes>
                <Route index element={<SellerOverview />} />
                <Route path="simcards" element={<MySimCards />} />
                <Route path="wallet" element={<SellerWallet onTransaction={handleWalletTransaction} />} />
                <Route path="add-sim" element={<AddSimCard onAddSim={handleAddNewSim} />} />
                <Route path="packages" element={<BuyPackage onBuyPackage={handleBuyPackage} />} />
            </Routes>
        </DashboardLayout>
    );
};

export default SellerDashboard;