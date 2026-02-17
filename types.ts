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
  // Suspension system fields
  is_suspended?: boolean;
  suspended_at?: string;
  suspension_reason?: string;
  negative_score?: number;
  last_penalty_at?: string;
  // KYC fields
  is_verified?: boolean;
  kyc_submitted_at?: string;
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
  created_at?: string; // When the listing was created
  expiry_date?: string; // When the listing will be auto-deleted
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
    card_number?: string;
    tracking_code?: string;
    receipt_image_url?: string;
    payment_method?: 'zarinpal' | 'zibal' | 'card';
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    processed_at?: string;
    processed_by?: string;
    updated_at?: string;
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
    // Activation deadline fields
    activation_deadline?: string; // 48 hours from purchase
    is_cancelled?: boolean;
    cancellation_reason?: string;
    cancelled_at?: string;
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

// KYC Verification Types
export type KYCStatus = 'pending' | 'approved' | 'rejected';

export interface KYCVerification {
    id: number;
    user_id: string;
    full_name: string;
    national_code: string;
    birth_date?: string;
    phone_number: string;
    address?: string;
    city?: string;
    postal_code?: string;
    national_card_front_url?: string;
    national_card_back_url?: string;
    selfie_with_card_url?: string;
    status: KYCStatus;
    reviewed_by?: string;
    reviewed_at?: string;
    rejection_reason?: string;
    admin_notes?: string;
    created_at: string;
    updated_at: string;
    submitted_at?: string;
}

// Site Settings Types
export interface SiteSetting {
    id: number;
    setting_key: string;
    setting_value: string;
    setting_type: 'number' | 'boolean' | 'string' | 'json';
    description: string;
    category: 'commission' | 'auction' | 'listing' | 'payment' | 'rond' | 'general';
    updated_at: string;
    updated_by?: string;
}

// Suspension Request Types
export type SuspensionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SuspensionRequest {
    id: number;
    user_id: string;
    message: string;
    status: SuspensionRequestStatus;
    admin_response?: string;
    created_at: string;
    updated_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
}

export interface SiteSettings {
    // Commission
    commission_rate: number;
    commission_applies_to_auction: boolean;
    commission_applies_to_fixed: boolean;
    
    // Auction
    auction_guarantee_deposit_rate: number;
    auction_top_winners_count: number;
    auction_payment_deadline_hours: number;
    auction_min_base_price: number;
    auction_auto_process: boolean;
    
    // Listing
    listing_auto_delete_days: number;
    listing_max_duration_days: number;
    listing_auto_delete_enabled: boolean;
    
    // Payment
    zarinpal_enabled: boolean;
    card_to_card_enabled: boolean;
    min_deposit_amount: number;
    min_withdrawal_amount: number;
    
    // Round
    rond_level_1_price: number;
    rond_level_2_price: number;
    rond_level_3_price: number;
    rond_level_4_price: number;
    rond_level_5_price: number;
    
    // General
    site_name: string;
    support_phone: string;
    support_email: string;
    maintenance_mode: boolean;
}