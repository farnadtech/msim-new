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
  total_blocked_amount?: number; // Total amount blocked across all auctions
}

export type SimCardTypeOption = 'fixed' | 'auction' | 'inquiry';

export interface Bid {
  user_id: string;
  amount: number;
  date: string;
}

// New Auction Guarantee Deposit System Types
export interface AuctionParticipant {
  id: number;
  auction_id: number;
  sim_card_id: number;
  user_id: string;
  user_name?: string; // For display purposes
  highest_bid: number;
  bid_count: number;
  rank: number;
  guarantee_deposit_amount: number;
  guarantee_deposit_blocked: boolean;
  is_top_3: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuaranteeDeposit {
  id: number;
  user_id: string;
  auction_id: number;
  sim_card_id: number;
  amount: number;
  status: 'blocked' | 'released' | 'burned';
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AuctionWinnerQueue {
  id: number;
  auction_id: number;
  sim_card_id: number;
  winner_rank: number;
  user_id: string;
  highest_bid: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'burned';
  remaining_amount: number;
  payment_deadline: string;
  payment_completed_at?: string;
  notification_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuctionPayment {
  id: number;
  auction_id: number;
  sim_card_id: number;
  user_id: string;
  winner_rank: number;
  bid_amount: number;
  guarantee_deposit_amount: number;
  remaining_amount: number;
  status: 'pending' | 'completed' | 'failed';
  payment_method?: string;
  transaction_id?: number;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export type AuctionStatus = 'active' | 'ended' | 'pending_payment' | 'completed' | 'cancelled';

export interface SimCard {
  id: number;
  number: string;
  price: number;
  seller_id: string;
  type: SimCardTypeOption;
  status: 'available' | 'sold' | 'reserved';
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
    status?: AuctionStatus;
    base_price?: number;
    guarantee_deposit_amount?: number;
    final_winner_id?: string;
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

export interface Notification {
    id: number;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    is_read: boolean;
    created_at: string;
    updated_at: string;
}

// Multi-Stage Purchase Workflow Types
export type LineType = 'inactive' | 'active';
export type PurchaseOrderStatus = 'pending' | 'code_sent' | 'code_verified' | 'document_pending' | 'document_submitted' | 'document_rejected' | 'verified' | 'completed' | 'cancelled';

export interface PurchaseOrder {
    id: number;
    sim_card_id: number;
    buyer_id: string;
    seller_id: string;
    line_type: LineType;
    status: PurchaseOrderStatus;
    price: number;
    commission_amount: number;
    seller_received_amount: number;
    buyer_blocked_amount: number;
    created_at: string;
    updated_at: string;
}

export interface ActivationCode {
    id: number;
    purchase_order_id: number;
    code: string;
    phone_number: string;
    sent_at: string;
    verified_at?: string;
    is_used: boolean;
}

export interface SellerDocument {
    id: number;
    purchase_order_id: number;
    document_type: 'handwriting' | 'verification';
    image_url: string;
    uploaded_at: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface AdminVerification {
    id: number;
    purchase_order_id: number;
    admin_id: string;
    document_id?: number;
    verification_type: 'document' | 'final_approval';
    status: 'approved' | 'rejected';
    notes?: string;
    verified_at: string;
}

export interface SupportMessage {
    id: number;
    purchase_order_id: number;
    sender_id: string;
    receiver_id: string;
    message: string;
    message_type: 'problem_report' | 'response';
    read_at?: string;
    created_at: string;
}

export interface TrackingCode {
    id: number;
    purchase_order_id: number;
    code: string;
    contact_phone: string;
    created_at: string;
}

export type ActivationRequestStatus = 'pending' | 'approved' | 'rejected' | 'activated';

export interface ActivationRequest {
    id: number;
    purchase_order_id: number;
    sim_card_id: number;
    buyer_id: string;
    seller_id: string;
    sim_number: string;
    buyer_name: string;
    seller_name: string;
    activation_code?: string;
    sent_at?: string;
    status: ActivationRequestStatus;
    admin_id?: string;
    admin_notes?: string;
    verified_at?: string;
    created_at: string;
    updated_at: string;
}