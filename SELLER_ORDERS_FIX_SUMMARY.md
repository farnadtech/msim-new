# Seller Orders Not Showing - Fix Summary

## Problem

Purchase order #58 exists in the database but is not visible to the seller in their dashboard.

**Root Cause:** Row Level Security (RLS) policies in Supabase are not properly configured to allow sellers to view their orders.

## Diagnosis

When running the diagnostic script, we found:
- Order #58 exists with correct `seller_id`
- All queries return 0 results due to RLS blocking access
- No `activation_request` record exists for the order
- RLS policies are either missing or incorrectly configured

## Solution

### Files Created

1. **`supabase/complete-fix-for-order-58.sql`** - Complete SQL script that:
   - Fixes RLS policies for `purchase_orders` table
   - Fixes RLS policies for `sim_cards` table
   - Fixes RLS policies for `activation_requests` table
   - Creates missing `activation_request` for order #58
   - Verifies all changes

2. **`supabase/check-rls-policies.sql`** - Diagnostic queries to check RLS policies

3. **`supabase/fix-purchase-orders-rls.sql`** - Focused fix for purchase_orders RLS

4. **`diagnose-order-issue.ts`** - TypeScript diagnostic script

5. **`FIX_SELLER_ORDERS_ISSUE.md`** - Detailed English guide

6. **`راهنمای_رفع_مشکل_سفارشات.md`** - Persian user guide (simplified)

### Steps to Fix

1. Run `supabase/complete-fix-for-order-58.sql` in Supabase SQL Editor
2. Logout and login again as the seller
3. Navigate to seller dashboard > "خطوط صفر - سفارشات" (Zero-Line Orders)
4. Order #58 should now be visible

## RLS Policies Created

### purchase_orders
- `Buyers can view their purchase orders` - SELECT for buyers
- `Sellers can view their purchase orders` - SELECT for sellers
- `Admins can view all purchase orders` - SELECT for admins
- `Buyers can create purchase orders` - INSERT for buyers
- `Users can update their purchase orders` - UPDATE for buyers/sellers

### sim_cards
- `Public can view available sim cards` - SELECT for everyone
- `Sellers can manage their sim cards` - ALL for sellers

### activation_requests
- `Buyers can view their activation requests` - SELECT for buyers
- `Sellers can view their activation requests` - SELECT for sellers
- `Sellers can update their activation requests` - UPDATE for sellers
- `Admins can view all activation requests` - SELECT for admins

## Technical Details

### Why RLS Blocked Access

Supabase uses PostgreSQL's Row Level Security feature to control data access at the database level. Without proper policies:
- Even with correct queries, no data is returned
- `auth.uid()` must match the user's ID in the policy condition
- Policies must be defined for each operation (SELECT, INSERT, UPDATE, DELETE)

### The Query That Was Failing

```typescript
const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
        *,
        sim_cards!inner(number)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
```

This query was correct, but RLS policies were blocking the results.

## Prevention

This fix ensures that:
1. All future orders will be visible to sellers automatically
2. Buyers can see their orders
3. Admins can see all orders
4. Security is maintained - users can only see their own data

## Testing

After applying the fix, verify:
1. Seller can see order #58 in their dashboard
2. Seller can enter activation code
3. Buyer receives the code
4. Order status updates correctly
5. Payment is processed when buyer confirms

## Related Files Modified

- `services/api-supabase.ts` - Already has correct `getPurchaseOrders` function
- `components/SellerInactiveOrdersPanel.tsx` - Already has correct UI
- `pages/SellerDashboard.tsx` - Already has correct routing

No code changes needed - only database RLS policies required fixing.
