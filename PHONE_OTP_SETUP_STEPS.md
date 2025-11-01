# Phone Number & OTP Authentication - Setup Instructions

## Step 1: Run Database Migration ✅

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com/
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration SQL**
   - Open file: [`supabase/add-phone-otp-system.sql`](file://e:\code\msim\supabase\add-phone-otp-system.sql)
   - Copy ALL content
   - Paste into Supabase SQL Editor
   - Click "Run"

4. **Verify Success**
   ```
   Output should show:
   - Added phone_number column to users table
   - All users with phone number: X
   - Sample user data
   ```

---

## Step 2: Create Melipayamak Patterns

### 2.1 Sign Up for Melipayamak
1. Visit https://www.melipayamak.com/
2. Click "سفارش آنلاین" (Order Online)
3. Create account with your credentials
4. Login to panel: https://login.melipayamak.com/

### 2.2 Purchase Credit
1. Go to "شارژ حساب" (Charge Account)
2. Add at least 100,000 تومان credit
3. Payment method: Bank transfer, Credit card, etc.

### 2.3 Create Pattern 1 - OTP Login/Signup

1. In Melipayamak panel, find "الگو" (Pattern) section
2. Click "ایجاد الگو جدید" (Create New Pattern)
3. Fill form:
   - **نام الگو**: `کد تایید ورود` (OTP Verification)
   - **متن الگو**: `کد تایید شما: {code}` (Your verification code: {code})
   - **تعداد متغیر**: 1
   - **متغیر اول**: `code`
   - Click "ذخیره" (Save)

4. **IMPORTANT**: Copy the Pattern ID shown (e.g., 123456)
   - Save it for `.env` file as `VITE_MELIPAYAMAK_OTP_PATTERN_ID`

### 2.4 Create Pattern 2 - Line Activation

1. Click "ایجاد الگو جدید" (Create New Pattern) again
2. Fill form:
   - **نام الگو**: `کد فعال‌سازی خط` (Line Activation Code)
   - **متن الگو**: `کد فعال‌سازی خط شما: {code}` (Your line activation code: {code})
   - **تعداد متغیر**: 1
   - **متغیر اول**: `code`
   - Click "ذخیره" (Save)

3. **IMPORTANT**: Copy the Pattern ID shown
   - Save it for `.env` file as `VITE_MELIPAYAMAK_ACTIVATION_PATTERN_ID`

---

## Step 3: Update .env File

Edit `.env` file and replace placeholders:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Melipayamak SMS Service Configuration
VITE_MELIPAYAMAK_USERNAME=your_actual_username
VITE_MELIPAYAMAK_PASSWORD=your_actual_password
VITE_MELIPAYAMAK_OTP_PATTERN_ID=123456
VITE_MELIPAYAMAK_ACTIVATION_PATTERN_ID=789012
```

**Example**:
```env
VITE_MELIPAYAMAK_USERNAME=john_smith
VITE_MELIPAYAMAK_PASSWORD=MyPassword123!
VITE_MELIPAYAMAK_OTP_PATTERN_ID=5482916
VITE_MELIPAYAMAK_ACTIVATION_PATTERN_ID=5482917
```

---

## Step 4: Test SMS Service

1. **Start Dev Server**
   ```bash
   npm run dev
   ```

2. **Open Browser Console** (F12)

3. **Test SMS function**
   ```javascript
   // In browser console, import and test
   import { sendOTP } from './services/sms-service.ts'
   
   // Send test OTP
   sendOTP('09356963201', '123456').then(result => {
     console.log(result)
   })
   ```

4. **Expected Result**
   ```json
   {
     "success": true,
     "messageId": "12345678901234567"
   }
   ```

5. **Check Your Phone**
   - Should receive SMS with code within 10 seconds
   - Text: "کد تایید شما: 123456"

---

## Step 5: Verify Database Changes

In Supabase SQL Editor, run:

```sql
-- Check users have phone numbers
SELECT COUNT(*) as total_users, 
       COUNT(phone_number) as users_with_phone
FROM users;

-- View sample users
SELECT id, name, phone_number, role 
FROM users 
LIMIT 5;

-- Check OTP table created
SELECT COUNT(*) as otp_records 
FROM otp_verifications;
```

**Expected Results**:
- ✅ All users have phone_number = '09356963201'
- ✅ otp_verifications table exists and is empty
- ✅ No errors

---

## Step 6: Ready for Next Phase

Once all above steps are complete and verified:

1. ✅ Database migration ran successfully
2. ✅ Phone numbers added to all users
3. ✅ Melipayamak patterns created
4. ✅ Credentials in .env file
5. ✅ SMS service tested successfully

**Tell me**, and I will create:
- Phone login page (`PhoneLoginPage.tsx`)
- Phone signup page (`PhoneSignupPage.tsx`)
- Update login/signup pages with phone options
- Add OTP verification API functions
- Add routes to app

---

## Troubleshooting

### Error: "Pattern ID not valid"
- Verify you copied the exact Pattern ID from Melipayamak
- Make sure it's a number (not a string with quotes)
- Check in `.env` file without quotes

### Error: "SMS not received"
- Check your phone number is correct: `09356963201`
- Check Melipayamak balance is > 0
- Check internet connection
- Wait 30 seconds (SMS can be slow)

### Error: "Username or password incorrect"
- Verify credentials in Melipayamak panel
- Try logging in manually to confirm
- Check for spaces in `.env` file

### Error: "Pattern error"
- Make sure pattern text is exactly: `کد تایید شما: {code}`
- Make sure you have 1 variable named `code`
- Pattern must be approved (show green check in panel)

---

## Support

**Melipayamak Help**:
- Phone: 021-63404
- Hours: Saturday-Wednesday, 8am-10pm
- Website: https://www.melipayamak.com/api/

**After Setup is Complete**:
Let me know and I'll finish implementing the UI pages!
