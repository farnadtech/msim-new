-- ============================================================================
-- COMPLETE DATABASE RESET - Clear All Data (Keep Table Structures)
-- ============================================================================
-- This script will DELETE ALL DATA from all tables while preserving:
-- - Table structures
-- - Indexes
-- - Constraints
-- - RLS Policies
-- ============================================================================

-- IMPORTANT: Run this ENTIRE script together to maintain referential integrity
-- The order matters because of foreign key relationships

BEGIN;

-- Step 1: Delete data from tables with dependencies first (child tables)
-- Order is important to respect foreign key constraints

DELETE FROM bids;
DELETE FROM support_messages;
DELETE FROM purchase_orders;
DELETE FROM activation_requests;
DELETE FROM auction_participants;
DELETE FROM auction_winner_queue;
DELETE FROM auction_payments;
DELETE FROM guarantee_deposits;
DELETE FROM auction_details;
DELETE FROM payment_receipts;
DELETE FROM commissions;
DELETE FROM secure_payments;
DELETE FROM buyer_payment_codes;
DELETE FROM transactions;
DELETE FROM notifications;
DELETE FROM otp_verifications;

-- Step 2: Delete data from main tables (parent tables)
DELETE FROM sim_cards;
DELETE FROM users;
DELETE FROM packages;

-- Step 3: Reset sequences/auto-increment counters to 1
ALTER SEQUENCE IF EXISTS bids_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS support_messages_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchase_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS activation_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS auction_participants_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS auction_winner_queue_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS auction_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS guarantee_deposits_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS auction_details_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payment_receipts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS commissions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS secure_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS buyer_payment_codes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS otp_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sim_cards_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS packages_id_seq RESTART WITH 1;

-- Step 4: Verification - Show record counts for all tables
SELECT 
    'Users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 'SIM Cards', COUNT(*) FROM sim_cards
UNION ALL
SELECT 'Auction Details', COUNT(*) FROM auction_details
UNION ALL
SELECT 'Bids', COUNT(*) FROM bids
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'Packages', COUNT(*) FROM packages
UNION ALL
SELECT 'OTP Verifications', COUNT(*) FROM otp_verifications
UNION ALL
SELECT 'Purchase Orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'Activation Requests', COUNT(*) FROM activation_requests
UNION ALL
SELECT 'Payment Receipts', COUNT(*) FROM payment_receipts
UNION ALL
SELECT 'Commissions', COUNT(*) FROM commissions
UNION ALL
SELECT 'Secure Payments', COUNT(*) FROM secure_payments
UNION ALL
SELECT 'Buyer Payment Codes', COUNT(*) FROM buyer_payment_codes
UNION ALL
SELECT 'Support Messages', COUNT(*) FROM support_messages
ORDER BY table_name;

COMMIT;

-- ============================================================================
-- RESET COMPLETE!
-- ============================================================================
-- ✅ All data has been cleared
-- ✅ Table structures preserved
-- ✅ Indexes preserved
-- ✅ Constraints preserved
-- ✅ RLS Policies preserved
-- ✅ Auto-increment counters reset to 1
-- ============================================================================
