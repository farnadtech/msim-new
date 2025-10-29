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
  rond_level?: 1 | 2 | 3 | 4 | 5; // Round level (1 to 5 stars)
  inquiry_phone_number?: string;
  auction_details?: {
    end_time: string;
    current_bid: number;
    highest_bidder_id?: string;
    bids: Bid[];
  };
  is_active?: boolean; // New field for active/inactive status
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

export interface Commission {
    id: number;
    sim_card_id: number;
    seller_id: string;
    seller_name: string;
    sim_number: string;
    sale_price: number;
    commission_amount: number;
    commission_percentage: number;
    seller_received_amount: number;
    sale_type: 'fixed' | 'auction';
    buyer_id: string;
    buyer_name: string;
    date: string;
    created_at: string;
}

export interface SecurePayment {
    id: number;
    buyer_id: string;
    buyer_name: string;
    seller_id: string;
    seller_name: string;
    sim_card_id: number;
    sim_number: string;
    amount: number;
    status: 'pending' | 'completed' | 'cancelled' | 'released';
    buyer_code: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    released_at?: string;
}

export interface BuyerPaymentCode {
    id: number;
    user_id: string;
    payment_code: string;
    created_at: string;
}