# Multi-Stage Purchase Workflow - Deployment Checklist

## ✅ Code Changes Completed

### 1. Database Schema
- [x] Created SQL migration file: `supabase/add-purchase-workflow-tables.sql`
- [x] Tables created:
  - `purchase_orders` - Main order tracking
  - `activation_codes` - Inactive line codes
  - `seller_documents` - Active line documents
  - `admin_verifications` - Admin approvals
  - `support_messages` - Support communication
  - `tracking_codes` - Support tracking
- [x] RLS Policies configured
- [x] Indexes created for performance

### 2. TypeScript Types
- [x] Added 6 new interfaces in `types.ts`:
  - `PurchaseOrder`
  - `ActivationCode`
  - `SellerDocument`
  - `AdminVerification`
  - `SupportMessage`
  - `TrackingCode`
- [x] Added line type enum: `LineType = 'inactive' | 'active'`
- [x] Added status enum: `PurchaseOrderStatus`

### 3. API Functions
- [x] Modified `purchaseSim()` to:
  - Detect line type from `sim_card.is_active` field
  - Create purchase order instead of immediate payment
  - Handle auction purchases separately
  - Send appropriate notifications
- [x] Implemented 7 new API functions:
  - `createPurchaseOrder()` - Creates order and blocks funds
  - `sendActivationCode()` - Generates code for inactive lines
  - `verifyActivationCode()` - Verifies buyer's code entry
  - `sendPhoneVerificationCode()` - Sends code for active lines
  - `submitSellerDocument()` - Seller uploads document
  - `approveDocument()` - Admin approves document
  - `rejectDocument()` - Admin rejects with reason
  - `createTrackingCode()` - Generates support code
  - `sendSupportMessage()` - Support messaging
  - `approvePurchase()` - Final approval, releases funds
  - `getPurchaseOrders()` - Fetch orders by user/role
  - `getSupportMessages()` - Fetch message history

### 4. UI Components (Already Existed)
- [x] `SellerInactiveOrdersPanel.tsx` - Seller's inactive line orders
- [x] `SellerActiveOrdersPanel.tsx` - Seller's active line orders
- [x] `BuyerOrderTrackingPage.tsx` - Buyer order tracking interface
- [x] `AdminVerificationPanel.tsx` - Admin document review
- [x] Added React imports where missing

### 5. Dashboard Integration
- [x] `SellerDashboard.tsx`:
  - Added "📱 خطوط غیرفعال" (Inactive lines)
  - Added "📳 خطوط فعال" (Active lines)
- [x] `BuyerDashboard.tsx`:
  - Removed "خریدهای من" (My Purchases) section
  - Renamed "پیگیری سفارشات" to "📦 خریدهای من" in sidebar
  - Made it the primary purchase management interface
- [x] `AdminDashboard.tsx`:
  - Added "📄 تایید سندها" (Document Verification)

### 6. Navigation Flow
- [x] Updated `SimDetailsPage.tsx`:
  - Purchase now creates order (not immediate payment)
  - Redirects to `/buyer/orders` after purchase
  - Shows proper success message

## 🔧 Pre-Deployment Requirements

### Database Setup
- [ ] **CRITICAL**: Run SQL migration in Supabase:
  ```sql
  -- Copy contents of supabase/add-purchase-workflow-tables.sql
  -- and execute in Supabase SQL Editor
  ```

### SIM Card Data Requirements
- [ ] Ensure all SIM cards have `is_active` field:
  - `is_active: true` → Active line (phones, documents, admin review)
  - `is_active: false` → Inactive line (codes only)

### Test User Setup
- [ ] Create test seller account
- [ ] Create test buyer account with wallet balance > 100,000 تومان
- [ ] Create test admin account with role 'admin'

## 🧪 Testing Steps

### Test 1: Inactive Line Purchase Flow
```
1. Seller creates SIM card with is_active: false
2. Buyer purchases SIM
3. Check: Purchase order created in database
4. Check: Buyer's wallet_balance decreased
5. Check: Buyer blocked_balance increased
6. Seller opens "خطوط غیرفعال" panel
7. Seller clicks "ارسال کد" 
8. System generates 6-digit code
9. Buyer enters code in tracking page
10. Verify: Order status changes to code_verified
11. Check: Funds transferred to seller (minus 2% commission)
12. Check: Notification sent to all parties
```

### Test 2: Active Line Purchase Flow
```
1. Seller creates SIM card with is_active: true
2. Buyer purchases SIM
3. Check: Purchase order created
4. Check: Funds blocked same as inactive
5. Seller opens "خطوط فعال" panel
6. Seller clicks "احراز هویت" → sends code to phone
7. Seller uploads handwritten document
8. Admin opens "تایید سندها"
9. Admin reviews document
10. Admin clicks "تایید سند"
11. Order moves to next step
12. Admin clicks "تایید نهایی"
13. Check: Funds released to seller
14. Check: Buyer receives tracking code
15. Check: All notifications sent
```

### Test 3: Support Messaging
```
1. During any order, buyer can report problem
2. Buyer sends support message
3. Check: Message appears in seller's orders
4. Check: Admin can see all messages
5. Check: Both parties receive notifications
```

## 🔍 Verification Checklist

### Database
- [ ] Can query `purchase_orders` table
- [ ] Can insert records in `activation_codes`
- [ ] RLS policies allow proper access
- [ ] Indexes are created (check performance)

### API
- [ ] All functions exported in api default object
- [ ] No TypeScript errors in api-supabase.ts
- [ ] Network requests show in browser DevTools

### UI
- [ ] No console errors when loading dashboards
- [ ] All panels render correctly
- [ ] Buttons are functional
- [ ] Forms accept input properly

### Notifications
- [ ] Notification appears after purchase
- [ ] Notification appears when code sent
- [ ] Notification appears on verification
- [ ] Admin gets notifications

## 📊 Database Verification Query

Run this query to verify setup:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('purchase_orders', 'activation_codes', 'seller_documents', 'admin_verifications', 'support_messages', 'tracking_codes');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('purchase_orders', 'activation_codes', 'seller_documents', 'admin_verifications', 'support_messages', 'tracking_codes');

-- Check test order (after making a purchase)
SELECT * FROM purchase_orders LIMIT 1;
```

## 📝 Configuration Notes

### Commission Settings
- **Rate**: 2% (fixed in code)
- **Deducted**: From price, seller receives remainder
- **Location**: `api.createPurchaseOrder()` and `api.purchaseSim()`

### Status Codes
```
inactive line:
pending → code_sent → code_verified → completed

active line:
pending → verified (after phone) → document_submitted → verified (after admin approval) → completed
```

### Support Contact
For active lines, buyers receive: "021-12345678"
(Update this in BuyerOrderTrackingPage.tsx line ~185)

## 🚀 Deployment Steps

1. **Backup Database** - Create Supabase backup before migration
2. **Run Migration** - Execute SQL migration script
3. **Verify Tables** - Run verification query above
4. **Deploy Code** - Push to production
5. **Test Each Flow** - Run test scenarios 1-3
6. **Monitor Logs** - Check for any errors
7. **User Communication** - Notify users of new workflow

## 🆘 Rollback Plan

If issues occur:
1. Stop accepting new purchases
2. Revert code deployment
3. Keep database as-is (no harmful data)
4. Users can still access existing orders
5. Contact Supabase support if needed

## 📞 Support Information

- **DB Issues**: Check RLS policies first
- **API Issues**: Check console for network errors
- **UI Issues**: Check browser DevTools Elements/Console
- **Logic Issues**: Review API function logs (console.log statements)

## ✨ Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Test with real transactions
- [ ] Collect user feedback
- [ ] Document any issues for future updates
- [ ] Create runbook for common problems
