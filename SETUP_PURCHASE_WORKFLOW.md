# Multi-Stage Purchase Workflow Setup Guide

## Overview
This guide explains how to set up and test the complete multi-stage purchase workflow for SIM cards (inactive and active lines).

## Database Setup

### Step 1: Run the Migration
Before the system can work, you need to create the required database tables in Supabase:

1. Go to Supabase Dashboard → Your Project
2. Navigate to the SQL Editor
3. Copy all the content from `e:/code/msim/supabase/add-purchase-workflow-tables.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration

This will create the following tables:
- `purchase_orders` - Main table for tracking orders
- `activation_codes` - For inactive line code verification
- `seller_documents` - For active line document submissions
- `admin_verifications` - For admin approval records
- `support_messages` - For buyer-seller communication
- `tracking_codes` - For active line support tracking

### Step 2: Verify RLS Policies
Ensure that Row Level Security (RLS) policies are properly enabled on all new tables. The migration script includes all necessary policies.

## How It Works

### For Inactive Lines (صفر/غیرفعال)
1. **Buyer initiates purchase** → Creates a `purchase_order` with status `pending`
2. **Funds blocked** → Buyer's wallet balance is reduced, amount moved to blocked_balance
3. **Seller sends code** → Seller sends 6-digit activation code via `sendActivationCode()`
4. **Buyer verifies code** → Buyer enters code, triggers `verifyActivationCode()`
5. **Auto-release funds** → After code verification, funds are automatically released to seller

### For Active Lines (فعال)
1. **Buyer initiates purchase** → Creates a `purchase_order` with status `pending`
2. **Funds blocked** → Same as inactive
3. **Seller phone verification** → Seller initiates `sendPhoneVerificationCode()`
4. **Seller document upload** → Seller uploads handwritten document via `submitSellerDocument()`
5. **Admin review** → Admin reviews document via `approveDocument()` or `rejectDocument()`
6. **Tracking code generation** → System generates tracking code via `createTrackingCode()`
7. **Final approval** → Admin clicks final approval which releases funds

## Testing the Workflow

### Prerequisites
- Have 2 test users (one seller, one buyer)
- Seller must have a SIM card listed (either inactive or active)
- Buyer must have sufficient wallet balance

### Test Scenario 1: Inactive Line (صفر)

1. **Login as Seller**
   - Create a SIM card with `is_active: false`
   - Set price (e.g., 100,000 تومان)

2. **Login as Buyer**
   - Ensure wallet balance > price
   - Go to SIM card details
   - Click "خرید آنی" (Instant Purchase)
   - Confirm purchase

3. **Expected Result**
   - Order appears in buyer's dashboard under "خریدهای من" section
   - Order status shows "📱 خط غیرفعال"
   - Timeline shows step 1 completed

4. **Seller Action**
   - Go to Seller Dashboard → "📱 خطوط غیرفعال"
   - Find the order
   - Click "ارسال کد" (Send Code)
   - System generates 6-digit code

5. **Buyer Verification**
   - Check buyer orders page
   - Enter the 6-digit code
   - Order status changes to "کد تایید شد"

6. **Verify in Database**
   - Buyer's `blocked_balance` should decrease
   - Seller's `wallet_balance` should increase (minus 2% commission)

### Test Scenario 2: Active Line (فعال)

1. **Login as Seller**
   - Create a SIM card with `is_active: true`
   - Set price (e.g., 150,000 تومان)

2. **Login as Buyer**
   - Navigate to SIM card
   - Click "خرید آنی"
   - Confirm purchase

3. **Expected Result**
   - Order appears with "📳 خط فعال"
   - Timeline shows different steps

4. **Seller Actions**
   - Go to Seller Dashboard → "📳 خطوط فعال"
   - Click "احراز هویت" (Phone Verification)
   - System sends verification code
   - Upload handwritten document following format instructions
   
5. **Admin Verification**
   - Login as admin
   - Go to Admin Dashboard → "📄 تایید سندها"
   - Review seller's document
   - Approve or reject with notes

6. **Final Steps**
   - Admin clicks "تایید نهایی و واریز پول" (Final Approval)
   - System releases funds to seller
   - Buyer receives tracking code

## API Functions Reference

### Buyer-Initiated Functions
```typescript
// Called automatically when buyer clicks purchase
const orderId = await api.createPurchaseOrder(
    simCardId,
    buyerId,
    sellerId,
    'inactive' | 'active',
    price
);

// Buyer verifies code (inactive only)
const verified = await api.verifyActivationCode(orderId, '123456');

// Buyer reports problem
await api.sendSupportMessage(orderId, buyerId, sellerId, 'message text');
```

### Seller-Initiated Functions
```typescript
// Send activation code (inactive only)
const code = await api.sendActivationCode(orderId, '09121234567');

// Send phone verification (active only)
const code = await api.sendPhoneVerificationCode(orderId, '09121234567');

// Upload document (active only)
const docId = await api.submitSellerDocument(orderId, imageUrl, 'handwriting');
```

### Admin Functions
```typescript
// Approve document (active only)
await api.approveDocument(documentId, adminId, 'notes');

// Reject document (active only)
await api.rejectDocument(documentId, adminId, 'rejection reason');

// Final approval - releases funds
await api.approvePurchase(orderId, adminId);

// Get pending orders
const orders = await api.getPurchaseOrders(adminId, 'admin');
```

## Troubleshooting

### Issue: Purchase doesn't create order
**Solution**: Ensure:
1. Database migration has been run
2. SIM card has `is_active` field set (true or false)
3. `purchaseSim()` is calling `createPurchaseOrder()` correctly
4. No RLS policy errors in browser console

### Issue: Seller can't see orders
**Solution**:
1. Check RLS policies on `purchase_orders` table
2. Ensure seller_id matches user ID
3. Verify user role is 'seller'

### Issue: Admin can't approve documents
**Solution**:
1. Verify user role is 'admin'
2. Check RLS policies on all admin-related tables
3. Ensure document exists in database

### Issue: Funds not being transferred
**Solution**:
1. Check user table `wallet_balance` and `blocked_balance` fields
2. Verify commission calculation (2% deduction)
3. Check transaction records are being created

## Commission Calculation

Commission is automatically deducted at:
- **Rate**: 2%
- **Calculation**: `commission = price * 0.02`
- **Seller Receives**: `price - commission`
- **Example**: 100,000 تومان sale → 2,000 تومان commission → Seller gets 98,000

## Support Messages

Both buyers and sellers can send support messages during verification:
- Accessible via "پیام‌ها" (Messages) section in each order
- Messages are timestamped
- Admin can view all messages for monitoring
- Both parties receive notifications when messages arrive

## Next Steps

1. Run the SQL migration
2. Create test SIM cards with `is_active` field set
3. Test both workflows with test accounts
4. Monitor admin dashboard for order management
5. Check database for transaction records
6. Verify notifications are sent at each step

## Important Notes

- All prices are in تومان (Iranian Toman)
- Line type (inactive/active) is auto-detected from SIM card's `is_active` field
- Funds are blocked immediately at purchase, released only after verification
- All changes trigger notifications to relevant parties
- Database includes comprehensive RLS policies for security
