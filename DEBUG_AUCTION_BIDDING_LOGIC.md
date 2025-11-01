# 🔍 Debug Auction Bidding Logic - Second Bid Issue

## Problem Identified
User receives "insufficient balance" error when placing their second bid in an auction, even though they already paid the guarantee deposit for their first bid.

## Root Cause Analysis
The system was correctly detecting that it's not the user's first bid, but there might be an issue with how the participant data is being checked or updated.

## Debugging Added

### File: `services/auction-guarantee-system.ts`

#### 1. Participant Detection Debugging
```typescript
// Added detailed logging to see what's happening
console.log('🔍 Checking if first bid for user:', bidderId, 'in auction:', auctionId, 'Existing participant:', existingParticipant, 'Error:', participantError);

const isFirstBid = !existingParticipant || participantError?.code === 'PGRST116';
console.log(' isFirstBid:', isFirstBid);
```

#### 2. Balance Information Debugging
```typescript
console.log('💰 User balance info:', { bidderWalletBalance, bidderBlockedBalance, availableBalance });
console.log('💸 Guarantee info:', { guaranteeDepositAmount, totalRequiredAmount });

// Check if user has sufficient balance
if (availableBalance < totalRequiredAmount) {
    console.log('❌ Insufficient balance:', { availableBalance, totalRequiredAmount });
    throw new Error(`موجودی کیف پول برای ثبت این پیشنهاد کافی نیست. مورد نیاز: ${totalRequiredAmount.toLocaleString('fa-IR')} تومان`);
}
```

#### 3. Participant Creation/Update Debugging
```typescript
console.log('📋 Existing participant full data:', existingParticipantFull);

if (existingParticipantFull && existingParticipantFull.length > 0) {
    console.log('🔄 Updating existing participant:', existingParticipantFull[0].id);
    // Update logic...
} else {
    console.log('🆕 Creating new participant');
    // Insert logic...
}
```

## Expected Behavior

### First Bid
```
User: 100,000 Tomans in wallet
Bid: 1,000,000 Tomans
Guarantee: 50,000 Tomans (5% of base price)

Process:
1. isFirstBid = true (no existing participant)
2. totalRequiredAmount = 50,000 Tomans
3. availableBalance = 100,000 Tomans
4. 100,000 >= 50,000 ✅ (Allow bid)
5. Deduct 50,000 from wallet
6. Block 50,000 in blocked_balance
7. Create participant record
```

### Second Bid (Same User)
```
User: 50,000 Tomans in wallet (50,000 blocked)
Bid: 1,100,000 Tomans
Guarantee: 0 Tomans (already paid)

Process:
1. isFirstBid = false (participant exists)
2. totalRequiredAmount = 0 Tomans
3. availableBalance = 50,000 - 50,000 = 0 Tomans
4. 0 >= 0 ✅ (Allow bid)
5. No deduction from wallet
6. No change to blocked_balance
7. Update participant record
```

## Verification Points

### 1. Participant Detection
- ✅ Check if existing participant is found correctly
- ✅ Verify error code handling for "no rows returned"
- ✅ Confirm isFirstBid is false for second bids

### 2. Balance Calculation
- ✅ Available balance = wallet_balance - blocked_balance
- ✅ For second bids, required amount should be 0
- ✅ Available balance should be sufficient (0 >= 0)

### 3. Participant Management
- ✅ Existing participant should be updated (not recreated)
- ✅ Bid count should increment
- ✅ Highest bid should update
- ✅ Guarantee info should remain unchanged

## Common Issues to Watch For

### 1. Database Query Issues
```sql
-- Make sure this query returns existing participant
SELECT * FROM auction_participants 
WHERE auction_id = ? AND user_id = ? AND sim_card_id = ?
```

### 2. Error Code Handling
```typescript
// PGRST116 = "no rows returned" from Supabase
participantError?.code === 'PGRST116'
```

### 3. Balance Calculation
```typescript
// Make sure blocked_balance is properly tracked
availableBalance = wallet_balance - blocked_balance
```

## Testing Scenarios

### Scenario 1: First Bid
- User with 100,000 Tomans places 1,000,000 bid
- Should deduct 50,000 (guarantee) from wallet
- Should block 50,000
- Should create participant record

### Scenario 2: Second Bid (Same User)
- Same user places 1,100,000 bid
- Should NOT deduct anything
- Should NOT change blocked balance
- Should update participant record

### Scenario 3: Third Bid (Same User)
- Same user places 1,200,000 bid
- Should NOT deduct anything
- Should NOT change blocked balance
- Should update participant record

## Debugging Output to Look For

```
🔍 Checking if first bid for user: [user_id] in auction: [auction_id] Existing participant: [data] Error: [error]
 isFirstBid: false
💰 User balance info: { bidderWalletBalance: [amount], bidderBlockedBalance: [amount], availableBalance: [amount] }
💸 Guarantee info: { guaranteeDepositAmount: 0, totalRequiredAmount: 0 }
📋 Existing participant full data: [data]
🔄 Updating existing participant: [id]
```

## Next Steps

1. Test with actual user placing multiple bids
2. Check console logs for debugging output
3. Verify participant records are created/updated correctly
4. Confirm balance changes are as expected
5. Remove debugging logs after verification

## Deployment

- ✅ Build successful
- ✅ No TypeScript errors
- ✅ Debugging logs added for troubleshooting
- ✅ Logic unchanged (only added logging)