export type UserRole = 'admin' | 'seller' | 'buyer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string; // Now optional
  wallet_balance?: number;
  blocked_balance?: number;
  phoneNumber?: string; // Already optional
  package_id?: number;
  // Temporary fields for OTP verification simulation are no longer needed
}

export type SimCardTypeOption = 'fixed' | 'auction' | 'inquiry';

export interface Bid {
  user_id: string;
  amount: number;
  date: string;
}

export interface SimCard {
  id: number;
  number: string;
  price: number;
  seller_id: string;
  type: SimCardTypeOption;
  status: 'available' | 'sold';
  sold_date?: string;
  carrier: 'همراه اول' | 'ایرانسل' | 'رایتل';
  is_rond: boolean;
  inquiry_phone_number?: string;
  auction_details?: {
    end_time: string;
    current_bid: number;
    highest_bidder_id?: string;
    bids: Bid[];
  };
}

export interface Package {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  listing_limit: number;
  description: string;
}

export interface Transaction {
    id: number;
    user_id: string;
    type: 'deposit' | 'withdrawal' | 'purchase' | 'sale';
    amount: number;
    date: string;
    description: string;
}

export interface PaymentReceipt {
    id: string;
    user_id: string;
    user_name: string;
    amount: number;
    card_number: string;
    tracking_code: string;
    receipt_image_url: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    processed_at?: string;
    processed_by?: string;
}