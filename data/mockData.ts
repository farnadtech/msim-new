import { User, SimCard, Package, Transaction } from '../types';

// Using placeholder UUIDs to match the new string-based ID schema.
const user_ids = {
    admin: '00000000-0000-0000-0000-000000000001',
    ali: '00000000-0000-0000-0000-000000000002',
    sara: '00000000-0000-0000-0000-000000000003',
    reza: '00000000-0000-0000-0000-000000000004',
    fatemeh: '00000000-0000-0000-0000-000000000005',
}

export const users: User[] = [
  { id: user_ids.admin, name: 'مدیر کل', role: 'admin', email: 'admin@msim724.com', wallet_balance: 10000000, blocked_balance: 0 },
  { id: user_ids.ali, name: 'علی رضایی', role: 'seller', email: 'ali@example.com', wallet_balance: 500000, package_id: 2, blocked_balance: 0 },
  { id: user_ids.sara, name: 'سارا محمدی', role: 'buyer', email: 'sara@example.com', wallet_balance: 3000000, blocked_balance: 0 },
  { id: user_ids.reza, name: 'رضا حسینی', role: 'seller', email: 'reza@example.com', wallet_balance: 1200000, package_id: 3, blocked_balance: 0 },
  { id: user_ids.fatemeh, name: 'فاطمه احمدی', role: 'buyer', email: 'fatemeh@example.com', wallet_balance: 3295000, blocked_balance: 1705000 },
];

export const simCards: SimCard[] = [
  { id: 1, number: '09121234567', price: 50000000, seller_id: user_ids.admin, type: 'fixed', status: 'available', carrier: 'همراه اول', is_rond: true },
  { id: 2, number: '09122223333', price: 0, seller_id: user_ids.ali, type: 'auction', status: 'available', carrier: 'همراه اول', is_rond: true, auction_details: { end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), current_bid: 780000, highest_bidder_id: user_ids.fatemeh, bids: [{user_id: user_ids.fatemeh, amount: 780000, date: new Date(Date.now() - 60 * 60 * 1000).toISOString() }] } },
  { id: 3, number: '09351112222', price: 2500000, seller_id: user_ids.reza, type: 'fixed', status: 'available', carrier: 'ایرانسل', is_rond: false },
  { id: 4, number: '09128888888', price: 0, seller_id: user_ids.admin, type: 'auction', status: 'available', carrier: 'همراه اول', is_rond: true, auction_details: { end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), current_bid: 2500000, highest_bidder_id: null, bids: [] } },
  { id: 5, number: '09215006000', price: 1200000, seller_id: user_ids.reza, type: 'fixed', status: 'sold', carrier: 'رایتل', is_rond: false },
  { id: 6, number: '09031002030', price: 800000, seller_id: user_ids.ali, type: 'fixed', status: 'available', carrier: 'ایرانسل', is_rond: false },
  { id: 7, number: '09123456789', price: 30000000, seller_id: user_ids.admin, type: 'fixed', status: 'available', carrier: 'همراه اول', is_rond: false },
  { id: 8, number: '09127770077', price: 0, seller_id: user_ids.reza, type: 'auction', status: 'available', carrier: 'همراه اول', is_rond: true, auction_details: { end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), current_bid: 925000, highest_bidder_id: user_ids.fatemeh, bids: [{user_id: user_ids.sara, amount: 900000, date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}, {user_id: user_ids.fatemeh, amount: 925000, date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }] } },
  { id: 9, number: '09361002030', price: 0, seller_id: user_ids.ali, type: 'inquiry', status: 'available', carrier: 'ایرانسل', is_rond: false, inquiry_phone_number: '09021234567' },
];

export const packages: Package[] = [
    { id: 1, name: 'پکیج برنزی', price: 50000, duration_days: 30, listing_limit: 5, description: 'مناسب برای شروع و فروشندگان خرد.' },
    { id: 2, name: 'پکیج نقره ای', price: 120000, duration_days: 60, listing_limit: 15, description: 'بهترین گزینه برای فروشندگان فعال.' },
    { id: 3, name: 'پکیج طلایی', price: 250000, duration_days: 90, listing_limit: 50, description: 'برای فروشندگان حرفه‌ای با تعداد بالا.' },
];

export const transactions: Transaction[] = [
    {id: 1, user_id: user_ids.sara, type: 'deposit', amount: 500000, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'شارژ کیف پول'},
    {id: 2, user_id: user_ids.ali, type: 'purchase', amount: -120000, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), description: 'خرید پکیج نقره ای'},
    {id: 3, user_id: user_ids.reza, type: 'sale', amount: 1200000, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'فروش سیمکارت 09215006000'},
    {id: 4, user_id: user_ids.sara, type: 'purchase', amount: -250000, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), description: 'خرید سیمکارت 090000000'},
];