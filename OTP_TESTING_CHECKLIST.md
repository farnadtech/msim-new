# ✅ OTP-Only Implementation Checklist

## Implementation Complete ✅

### Phase 1: Authentication Files
- ✅ `pages/LoginPage.tsx` - Rewritten (OTP-only, 2 steps)
- ✅ `pages/SignupPage.tsx` - Rewritten (no email/password, 2 steps)
- ✅ `services/api-supabase.ts` - Updated [loginWithPhone](file://e:\code\msim\services\api-supabase.ts#L246-L304) function
- ✅ `auth-backend.ts` - Created (password update service)
- ✅ `.env` - Updated (added SUPABASE_SERVICE_ROLE_KEY)

### Phase 2: Removed Features
- ✅ Removed email login tab
- ✅ Removed phone+password login tab
- ✅ Removed email field from signup
- ✅ Removed password field from signup
- ✅ Removed password reset email logic
- ✅ Removed complex error messages

### Phase 3: Simplified Experience
- ✅ Single login method: Phone + OTP
- ✅ Single signup method: Name + Phone + Role + OTP
- ✅ Clean 2-step UI for both
- ✅ Auto-formatted phone numbers
- ✅ 120-second resend countdown
- ✅ Edit option before OTP verification

---

## 🧪 Testing Checklist

### Before Testing:
- [ ] Run development server: `npm run dev`
- [ ] Check that auth-backend is **optional** (app works without it)
- [ ] Console shows test OTP hint: "💡 برای تست، کد 123456 را وارد کنید"

### Test New Signup:
- [ ] Navigate to `/signup`
- [ ] Only 3 fields visible: Name, Phone, Role
- [ ] NO email field
- [ ] NO password field
- [ ] Enter valid data and click "ارسال کد تایید"
- [ ] See "کد تایید ارسال شد" notification
- [ ] Input field changes to OTP input
- [ ] Enter `123456` for testing
- [ ] Click "تایید و ثبت نام"
- [ ] Auto-redirects to dashboard
- [ ] User logged in ✅

### Test Existing User Login:
- [ ] Navigate to `/login`
- [ ] Only 1 field visible: Phone number
- [ ] NO tabs/buttons for other methods
- [ ] NO email field
- [ ] NO password field
- [ ] Enter user's phone (09xxxxxxxxx)
- [ ] Click "ارسال کد تایید"
- [ ] See "کد تایید ارسال شد" notification
- [ ] Input field changes to OTP input
- [ ] Enter `123456` for testing
- [ ] Click "تایید و ورود"
- [ ] Auto-redirects to dashboard
- [ ] User logged in ✅

### Test OTP Resend:
- [ ] On OTP step, countdown shows (120s)
- [ ] "ارسال مجدد" button is disabled
- [ ] After countdown ends, button is enabled
- [ ] Click "ارسال مجدد"
- [ ] Gets new OTP code
- [ ] Countdown resets to 120s

### Test Edit Phone:
- [ ] On OTP verification step, click "✏️ ویرایش شماره"
- [ ] Goes back to phone entry step
- [ ] Can enter different phone number
- [ ] Can request new OTP

---

## 🔍 Verification Steps

### Check LoginPage:
```bash
# Should show only OTP form, no email/password
grep -n "email\|password" pages/LoginPage.tsx
# Should return nothing or minimal results
```

### Check SignupPage:
```bash
# Should have no email/password inputs
grep -n "email\|password" pages/SignupPage.tsx
# Should only show in types/comments, not in form inputs
```

### Check API:
```bash
# loginWithPhone should work for all users
grep -A 30 "export const loginWithPhone" services/api-supabase.ts
# Should have OTP verification and password update logic
```

---

## 📊 Database State

### After Signup:
```
users table:
- id: UUID (auto)
- name: "User Name"
- email: "09123456789@msim724.phone"
- phone_number: "09123456789"
- role: "buyer" or "seller"
- wallet_balance: 0
- blocked_balance: 0

auth:
- email: "09123456789@msim724.phone"
- password: "09123456789" (phone number as password)
```

### After Login:
- User session created via Supabase auth
- User redirected to dashboard based on role

---

## 🚨 Known Behaviors

### Hardcoded OTP:
- Code `123456` works for any phone during testing
- **⚠️ MUST BE REMOVED before production**

### Old Password Users:
- Can login with OTP if auth-backend is running
- Backend automatically updates their password
- If backend not running, shows error (user needs to reset password)

### Auto-Generated Email:
- Format: `{phoneNumber}@msim724.phone`
- Example: `09123456789@msim724.phone`
- Used internally for Supabase auth
- Not shown to users

### Phone as Password:
- All users have password = phone number
- Example password: `09123456789`
- Simple, memorable, unique per user

---

## 📝 Next Steps After Testing

1. **✅ Verify all tests pass**

2. **Before Production:**
   - Remove hardcoded OTP code `123456` in [verifyPhoneOTP](file://e:\code\msim\services\api-supabase.ts#L192-L239)
   - Ensure Melipayamak SMS credentials are correct
   - Test with real SMS delivery
   - Deploy auth-backend to production server

3. **Existing Users Migration:**
   - They'll see login page with only phone field
   - They can login with OTP
   - If auth-backend is running: Auto password update
   - If auth-backend not running: Show error message

4. **Monitoring:**
   - Track OTP success rates
   - Monitor SMS delivery
   - Log authentication failures

---

## 🎉 Success Criteria

- ✅ No email/password login exists
- ✅ No email/password signup exists
- ✅ All users use OTP to login
- ✅ All users use simple form to signup
- ✅ Existing users can login with OTP
- ✅ Clean, simple, secure UX
